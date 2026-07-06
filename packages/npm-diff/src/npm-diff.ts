import { join } from 'node:path'
import semver from 'semver'
import { extract } from 'tar'
import { $, chalk, fs, spinner, tmpdir } from 'zx'
import { CliError } from './error'
import { DEFAULT_REGISTRY, fetchPackument, type Packument } from './registry'
import { pickVersion, sortVersions } from './select'
import { formatTree, unminifyTree } from './transform'
import { ensureVscode, launchDiff } from './vscode'

export class NpmDiff {
  private packument!: Packument
  private readonly workdir = tmpdir('npmdiff-')

  constructor(
    private readonly pkg: string,
    private readonly registry = DEFAULT_REGISTRY,
  ) {}

  async run(specA?: string, specB?: string) {
    await ensureVscode()
    this.packument = await spinner(`Fetching '${this.pkg}' from npm…`, () =>
      fetchPackument(this.pkg, this.registry),
    )

    const [left, right] =
      specA && specB
        ? sortVersions(this.resolve(specA), this.resolve(specB))
        : await this.pickVersions(specA)
    if (left === right) {
      throw new CliError(`Both specs resolve to ${left} — there is nothing to diff.`)
    }

    try {
      await this.prepare(left)
      await this.prepare(right)
      console.log(chalk.green(`Opening VS Code to diff ${this.pkg} ${left} ↔ ${right}`))
      await launchDiff(join(this.workdir, left), join(this.workdir, right))
      console.log(chalk.dim('VS Code closed — cleaning up temporary files.'))
    } finally {
      await fs.remove(this.workdir)
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
    await spinner(`Unminifying ${label}`, () => unminifyTree(dir))
    await spinner(`Formatting ${label}`, () => formatTree(dir))
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
