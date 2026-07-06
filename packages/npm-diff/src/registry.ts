import { CliError } from './error'

export const DEFAULT_REGISTRY = 'https://registry.npmjs.org'

// Smaller than the full packument, but still carries versions and dist-tags.
const ABBREVIATED = 'application/vnd.npm.install-v1+json'

export interface Packument {
  versions: Record<string, unknown>
  'dist-tags': Record<string, string>
}

export async function fetchPackument(pkg: string, registry: string) {
  // Scoped names keep their leading `@`; only the `/` needs escaping.
  const url = `${registry.replace(/\/+$/, '')}/${pkg.replace('/', '%2F')}`
  let res: Response
  try {
    res = await fetch(url, { headers: { accept: ABBREVIATED } })
  } catch (cause) {
    throw new CliError(`Could not reach the npm registry: ${(cause as Error).message}`)
  }
  if (res.status === 404) {
    throw new CliError(`Package '${pkg}' was not found on the npm registry.`)
  }
  if (!res.ok) {
    throw new CliError(`The npm registry returned HTTP ${res.status} for '${pkg}'.`)
  }
  return (await res.json()) as Packument
}
