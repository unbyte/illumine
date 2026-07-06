import { readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { unminify } from '@illumine/unminify'
import { format } from 'oxfmt'
import { glob } from 'zx'

const JS_FILES = '**/*.{js,cjs,mjs}'
const FORMATTABLE_FILES =
  '**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx,css,html,htm,yaml,yml,json,jsonc,json5}'

export async function unminifyTree(dir: string) {
  for (const file of await glob(JS_FILES, { cwd: dir, absolute: true, dot: true })) {
    const code = await readFile(file, 'utf8')
    try {
      await writeFile(file, await unminify(code, { filename: basename(file) }))
    } catch {
      // Leave files that fail to parse (e.g. minified data blobs) untouched.
    }
  }
}

export async function formatTree(dir: string) {
  for (const file of await glob(FORMATTABLE_FILES, { cwd: dir, absolute: true, dot: true })) {
    const code = await readFile(file, 'utf8')
    try {
      const { code: formatted } = await format(basename(file), code, {
        tabWidth: 2,
        printWidth: 120,
      })
      await writeFile(file, formatted)
    } catch {
      // Skip anything oxfmt can't parse.
    }
  }
}
