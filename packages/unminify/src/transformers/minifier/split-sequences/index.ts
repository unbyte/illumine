import type { Visitor } from '@babel/traverse'
import * as t from '@babel/types'

/**
 * Splits a comma-sequence used as a statement into one statement per expression.
 *
 * ```
 * a(), b(), c()   →   a(); b(); c();
 * ```
 */
export default (): Visitor => ({
  ExpressionStatement(path) {
    const { expression } = path.node
    if (!t.isSequenceExpression(expression)) return

    path.replaceWithMultiple(expression.expressions.map((expr) => t.expressionStatement(expr)))
  },
})
