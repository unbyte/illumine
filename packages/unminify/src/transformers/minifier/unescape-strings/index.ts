import type { Visitor } from '@babel/traverse'
import jsesc from 'jsesc'

/**
 * Rewrites string and template literals to their minimal, human-readable
 * escaping, undoing the numeric/hex escapes minifiers emit.
 *
 * ```
 * "\x61b"   →   "ab"
 * ```
 */
export default (): Visitor => ({
  StringLiteral(path) {
    const { node } = path
    const raw = node.extra?.raw
    if (typeof raw !== 'string') return

    const quotes = raw[0] === "'" ? 'single' : 'double'
    node.extra = {
      ...node.extra,
      raw: jsesc(node.value, { quotes, wrap: true, minimal: true }),
      rawValue: node.value,
    }
  },

  TemplateElement(path) {
    const { node } = path
    const { cooked } = node.value
    if (cooked == null) return

    node.value.raw = jsesc(cooked, { quotes: 'backtick', minimal: true })
  },
})
