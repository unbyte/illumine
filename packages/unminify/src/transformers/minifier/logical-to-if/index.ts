import type { Visitor } from '@babel/traverse'
import * as t from '@babel/types'

/**
 * Rewrites logical and conditional expressions used as statements into `if`
 * statements, undoing the minifier trick of using short-circuit evaluation for
 * control flow.
 *
 * ```
 * a && b()        →   if (a) { b() }
 * a || b()        →   if (!a) { b() }
 * a ? b() : c()   →   if (a) { b() } else { c() }
 * ```
 */
export default (): Visitor => ({
  ExpressionStatement(path) {
    const { expression } = path.node

    if (t.isLogicalExpression(expression)) {
      if (expression.operator === '&&') {
        path.replaceWith(
          t.ifStatement(
            expression.left,
            t.blockStatement([t.expressionStatement(expression.right)]),
          ),
        )
        return
      }
      if (expression.operator === '||') {
        path.replaceWith(
          t.ifStatement(
            t.unaryExpression('!', expression.left),
            t.blockStatement([t.expressionStatement(expression.right)]),
          ),
        )
        return
      }
    }

    if (t.isConditionalExpression(expression)) {
      path.replaceWith(
        t.ifStatement(
          expression.test,
          t.blockStatement([t.expressionStatement(expression.consequent)]),
          t.blockStatement([t.expressionStatement(expression.alternate)]),
        ),
      )
    }
  },
})
