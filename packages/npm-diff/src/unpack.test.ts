import { describe, expect, it } from 'vitest'
import { compilePattern } from './unpack'

describe('compilePattern', () => {
  // Paths as the filter sees them once `package/` is stripped, with a trailing
  // slash on directory entries.
  const PATHS = [
    'package.json',
    'index.js',
    'dist/',
    'dist/index.js',
    'dist/index.d.ts',
    'dist/sub/deep.js',
    'src/a.jsx',
  ]
  const kept = (patterns: string[]) => {
    const isMatch = compilePattern(patterns)
    return isMatch ? PATHS.filter((path) => isMatch(path)) : PATHS
  }

  it('returns undefined when there are no patterns', () => {
    expect(compilePattern([])).toBeUndefined()
  })

  it('keeps a whole directory tree for a bare name', () => {
    expect(kept(['dist'])).toMatchInlineSnapshot(`
      [
        "dist/",
        "dist/index.js",
        "dist/index.d.ts",
        "dist/sub/deep.js",
      ]
    `)
  })

  it('treats a trailing slash the same as a bare name', () => {
    expect(kept(['dist/'])).toEqual(kept(['dist']))
  })

  it('keeps a single file by exact path', () => {
    expect(kept(['index.js'])).toMatchInlineSnapshot(`
      [
        "index.js",
      ]
    `)
  })

  it('matches only the direct children of a glob', () => {
    expect(kept(['dist/*.js'])).toMatchInlineSnapshot(`
      [
        "dist/index.js",
      ]
    `)
  })

  it('expands brace alternation', () => {
    expect(kept(['dist/*.{js,ts}'])).toMatchInlineSnapshot(`
      [
        "dist/index.js",
        "dist/index.d.ts",
      ]
    `)
  })

  it('recurses with a globstar', () => {
    expect(kept(['src/**/*.jsx'])).toMatchInlineSnapshot(`
      [
        "src/a.jsx",
      ]
    `)
  })

  it('unions multiple patterns', () => {
    expect(kept(['index.js', 'dist/*.js'])).toMatchInlineSnapshot(`
      [
        "index.js",
        "dist/index.js",
      ]
    `)
  })

  it('excludes a subtree with a leading !, starting from every file', () => {
    expect(kept(['!dist'])).toMatchInlineSnapshot(`
      [
        "package.json",
        "index.js",
        "src/a.jsx",
      ]
    `)
  })

  it('subtracts a negated glob from the includes', () => {
    expect(kept(['dist', '!dist/*.d.ts'])).toMatchInlineSnapshot(`
      [
        "dist/",
        "dist/index.js",
        "dist/sub/deep.js",
      ]
    `)
  })

  it('excludes a whole negated subtree from the includes', () => {
    expect(kept(['dist', '!dist/sub'])).toMatchInlineSnapshot(`
      [
        "dist/",
        "dist/index.js",
        "dist/index.d.ts",
      ]
    `)
  })
})
