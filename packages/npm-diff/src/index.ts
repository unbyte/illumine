#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings'
import { $, chalk } from 'zx'
import { CliError } from './error'
import { NpmDiff } from './npm-diff'
import { DEFAULT_REGISTRY } from './registry'

$.verbose = false

const program = new Command()

program
  .name('npmdiff')
  .description('Diff two versions of an npm package in VS Code, unminified and formatted')
  .argument('<pkgname>', 'npm package name (scoped names supported)')
  .argument('[spec-a]', 'a version or dist-tag')
  .argument('[spec-b]', 'a version or dist-tag')
  .option('-r, --registry <url>', 'npm registry to query', DEFAULT_REGISTRY)
  .option(
    '-w, --workspace <dir>',
    'directory to place the two versions; kept instead of auto-cleaned when set',
  )
  .option('-u, --unminify', 'unminify sources before diffing', false)
  .option(
    '-p, --pattern <glob>',
    'compare only files matching this glob; repeat for more',
    (value, previous) => [...previous, value],
    [] as string[],
  )
  .action((pkgname, specA, specB, options) => new NpmDiff(pkgname, options).run(specA, specB))

program.parseAsync().catch((error: unknown) => {
  if (error instanceof CliError) {
    console.error(chalk.red(error.message))
  } else if (error instanceof Error && error.name === 'ExitPromptError') {
    console.error(chalk.yellow('Aborted.'))
  } else {
    console.error(error)
  }
  process.exit(1)
})
