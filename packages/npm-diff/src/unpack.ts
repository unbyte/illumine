import { rm } from 'node:fs/promises'
import picomatch from 'picomatch'
import { extract } from 'tar'

/**
 * Extract `tarball` into `dir`.
 * If `patterns` is provided and not empty, keep only entries matched by `patterns`.
 * Otherwise, keep all entries.
 */
export async function unpack(tarball: string, dir: string, patterns: string[]) {
  const isMatch = compilePattern(patterns)
  const filter = isMatch
    ? (path: string) => {
        const rel = path.split('/').slice(1).join('/')
        return rel !== '' && isMatch(rel)
      }
    : undefined
  await extract({ file: tarball, cwd: dir, strip: 1, filter })
  await rm(tarball)
}

export function compilePattern(patterns: string[]) {
  if (patterns.length === 0) return undefined
  const include: string[] = []
  const ignore: string[] = []
  for (const pattern of patterns) {
    const negated = pattern.startsWith('!')
    // Each pattern also matches everything beneath it, so a bare `src` covers a
    // file named `src` or the whole `src/` tree.
    const base = (negated ? pattern.slice(1) : pattern).replace(/\/+$/, '')
    const target = negated ? ignore : include
    target.push(base, `${base}/**`)
  }
  // With only negated patterns, start from every file and subtract the ignores.
  return picomatch(include.length ? include : '**', { dot: true, ignore })
}
