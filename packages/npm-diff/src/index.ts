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
  .action((pkgname, specA, specB, options) =>
    new NpmDiff(pkgname, options.registry).run(specA, specB),
  )

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
