import { join, resolve } from 'node:path'
import semver from 'semver'
import { extract } from 'tar'
import { $, chalk, fs, spinner, tmpdir } from 'zx'
import { CliError } from './error'
import { DEFAULT_REGISTRY, fetchPackument, type Packument } from './registry'
import { pickVersion, sortVersions } from './select'
import { formatTree, unminifyTree } from './transform'
import { ensureVscode, launchDiff } from './vscode'

export interface NpmDiffOptions {
  /** npm registry to query. Defaults to the public registry. */
  registry?: string
  /** Where to place the two versions. Defaults to a temp dir that is removed on exit. */
  workspace?: string
  /** Unminify the sources before diffing. Off by default. */
  unminify?: boolean
}

export class NpmDiff {
  private packument!: Packument
  private readonly registry: string
  private readonly workdir: string
  private readonly clean: boolean
  private readonly unminify: boolean

  constructor(
    private readonly pkg: string,
    options: NpmDiffOptions = {},
  ) {
    this.registry = options.registry ?? DEFAULT_REGISTRY
    this.workdir = options.workspace ? resolve(options.workspace) : tmpdir('npmdiff-')
    this.clean = options.workspace === undefined
    this.unminify = options.unminify ?? false
  }

  async run(specA?: string, specB?: string) {
    await ensureVscode()
    this.packument = await spinner(`Fetching '${this.pkg}' from npm…`, () =>
      fetchPackument(this.pkg, this.registry),
    )

    const [versionA, versionB] =
      specA && specB
        ? sortVersions(this.resolve(specA), this.resolve(specB))
        : await this.pickVersions(specA)
    if (versionA === versionB) {
      throw new CliError(`Both specs resolve to ${versionA} — there is nothing to diff.`)
    }

    try {
      const left = await this.prepare(versionA)
      const right = await this.prepare(versionB)
      console.log(chalk.green(`Opening VS Code to diff ${this.pkg} ${versionA} ↔ ${versionB}`))
      await launchDiff(left, right)
      console.log(
        this.clean
          ? chalk.dim('VS Code closed — cleaning up temporary files.')
          : chalk.dim(`VS Code closed — files kept in ${this.workdir}`),
      )
    } finally {
      if (this.clean) await fs.remove(this.workdir)
    }
  }

  /** Resolve a version or dist-tag into a concrete published version. */
  private resolve(spec: string) {
    const { versions, 'dist-tags': tags } = this.packument
    const resolved = tags[spec] ?? (versions[spec] ? spec : undefined)
    if (!resolved) {
      throw new CliError(`'${spec}' is not a published version or dist-tag of this package.`)
    }
    return resolved
  }

  private async pickVersions(existing?: string) {
    const versions = Object.keys(this.packument.versions).sort(semver.rcompare) // newest first
    if (existing) {
      const version = this.resolve(existing)
      return sortVersions(
        version,
        await pickVersion(versions, `Compare ${version} against`, version),
      )
    }
    const first = await pickVersion(versions, 'Select the first version')
    const second = await pickVersion(versions, 'Select the second version', first)
    return sortVersions(first, second)
  }

  private async prepare(version: string) {
    const label = `${this.pkg}@${version}`
    const dir = join(this.workdir, version)
    await fs.mkdirp(dir)

    const tarball = await spinner(`Downloading ${label}`, () => this.download(version, dir))
    await spinner(`Unpacking ${label}`, () => this.unpack(tarball, dir))
    if (this.unminify) await spinner(`Unminifying ${label}`, () => unminifyTree(dir))
    await spinner(`Formatting ${label}`, () => formatTree(dir))
    return dir
  }

  private async download(version: string, dir: string) {
    const { stdout } =
      await $`npm pack ${this.pkg}@${version} --registry ${this.registry} --pack-destination ${dir} --json`
    const [{ filename }] = JSON.parse(stdout) as Array<{ filename: string }>
    return join(dir, filename)
  }

  private async unpack(tarball: string, dir: string) {
    // `strip: 1` drops the leading `package/` directory the tarball wraps everything in.
    await extract({ file: tarball, cwd: dir, strip: 1 })
    await fs.remove(tarball)
  }
}
