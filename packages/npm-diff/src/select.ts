import { search } from '@inquirer/prompts'
import semver from 'semver'

/**
 * Prompt for a single version with a type-to-filter search, which stays usable
 * even for packages with hundreds of releases.
 */
export function pickVersion(versions: string[], message: string, exclude?: string) {
  const pool = exclude ? versions.filter((version) => version !== exclude) : versions
  return search({
    message,
    pageSize: 15,
    source: async (term) => {
      const matched = term ? pool.filter((version) => version.includes(term)) : pool
      return matched.map((version) => ({ name: version, value: version }))
    },
  })
}

export function sortVersions(a: string, b: string): [string, string] {
  return semver.lt(a, b) ? [a, b] : [b, a]
}
