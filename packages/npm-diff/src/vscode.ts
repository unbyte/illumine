import { confirm } from '@inquirer/prompts'
import { $, which } from 'zx'
import { CliError } from './error'

const EXTENSION_ID = 'moshfeu.compare-folders'

/**
 * Make sure the `code` CLI is available and the compare-folders extension is
 * installed, offering to install it if it is missing.
 */
export async function ensureVscode() {
  const code = await which('code', { nothrow: true })
  if (!code) {
    throw new CliError(
      "The VS Code CLI ('code') was not found on your PATH.\n" +
        "Install VS Code, then run the 'Shell Command: Install \\'code\\' command in PATH' command from its Command Palette.",
    )
  }

  const { stdout } = await $`code --list-extensions`
  const installed = stdout.split('\n').map((line) => line.trim().toLowerCase())
  if (installed.includes(EXTENSION_ID)) return

  const install = await confirm({
    message: `The '${EXTENSION_ID}' extension is required but not installed. Install it now?`,
    default: true,
  })
  if (!install) {
    throw new CliError(`Cannot continue without the '${EXTENSION_ID}' extension.`)
  }
  await $({ stdio: 'inherit' })`code --install-extension ${EXTENSION_ID}`
}

/**
 * Open both folders in a single VS Code window and block until it is closed.
 * The `COMPARE_FOLDERS=DIFF` env var tells the extension to open the diff view
 * on activation.
 */
export async function launchDiff(left: string, right: string) {
  await $({
    env: { ...process.env, COMPARE_FOLDERS: 'DIFF' },
    stdio: 'inherit',
  })`code --new-window --wait ${left} ${right}`
}
