#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { Command, InvalidArgumentError } from '@commander-js/extra-typings'
import { unminify } from './lib'

function parsePasses(value: string) {
  const passes = Number(value)
  if (!Number.isInteger(passes) || passes < 1) {
    throw new InvalidArgumentError('Expected a positive integer.')
  }
  return passes
}

const program = new Command()

program
  .name('unminify')
  .description(
    'Reverse minifier, transpiler, and bundler transforms to make JavaScript readable again',
  )
  .argument('<input>', 'input file path')
  .option('-o, --output <output>', 'output file path (defaults to stdout)')
  .option('-p, --passes <count>', 'number of reversal passes', parsePasses)
  .action(async (input, opts) => {
    const code = await readFile(input, 'utf-8')
    const result = await unminify(code, { passes: opts.passes, filename: basename(input) })

    if (opts.output) {
      await writeFile(opts.output, result)
    } else {
      process.stdout.write(result)
    }
  })

program.parseAsync()
