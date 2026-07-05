import { parse } from '@babel/parser'
import { format } from 'oxfmt'
import { generate, traverse } from './babel'
import { bundler, minifier, transpiler } from './transformers'

export interface UnminifyOptions {
  /**
   * How many times to run the transpiler + minifier reversal loop. Each reversal
   * can expose new patterns for the others, so repeating lets the code settle.
   *
   * @default 5
   */
  passes?: number

  /**
   * Name of the source file. Threaded to the parser and used by the formatter
   * for diagnostics.
   *
   * @default 'input.js'
   */
  filename?: string

  /**
   * How the source is parsed. `'unambiguous'` auto-detects module vs. script.
   *
   * @default 'unambiguous'
   */
  sourceType?: 'script' | 'module' | 'unambiguous'

  /**
   * Spaces per indentation level in the formatted output.
   *
   * @default 2
   */
  tabWidth?: number

  /**
   * Column at which the formatter wraps the output.
   *
   * @default 100
   */
  printWidth?: number
}

export async function unminify(code: string, options: UnminifyOptions = {}) {
  const {
    passes = 5,
    filename = 'input.js',
    sourceType = 'unambiguous',
    tabWidth = 2,
    printWidth = 100,
  } = options

  const ast = parse(code, { sourceType, sourceFilename: filename })

  for (let i = 0; i < passes; i++) {
    for (const visitor of transpiler) traverse(ast, visitor())
    for (const visitor of minifier) traverse(ast, visitor())
  }

  for (const visitor of bundler) traverse(ast, visitor())

  const { code: generated } = generate(ast)

  const { code: formatted } = await format(filename, generated, { tabWidth, printWidth })

  return formatted
}
