import type { Visitor } from '@babel/traverse'
import * as t from '@babel/types'

/**
 * Restores literals that minifiers encode as shorter expressions.
 *
 * ```
 * !0       →   true
 * !1       →   false
 * void 0   →   undefined
 * ```
 */
export default (): Visitor => ({
  UnaryExpression(path) {
    const { node } = path

    if (node.operator === '!' && t.isNumericLiteral(node.argument)) {
      if (node.argument.value === 0) {
        path.replaceWith(t.booleanLiteral(true))
        return
      }
      if (node.argument.value === 1) {
        path.replaceWith(t.booleanLiteral(false))
        return
      }
    }

    if (
      node.operator === 'void' &&
      t.isNumericLiteral(node.argument) &&
      node.argument.value === 0
    ) {
      path.replaceWith(t.identifier('undefined'))
    }
  },
})
