import type { Visitor } from '@babel/traverse'
import * as t from '@babel/types'

/**
 * Expands `return` statements (and concise arrow bodies) whose value is a
 * comma-sequence or a conditional into ordinary statements.
 *
 * ```
 * return (a(), b)     →   a(); return b
 * return a ? b : c    →   if (a) return b; else return c
 * () => (a(), b)      →   () => { a(); return b }
 * ```
 */

// Turns a (possibly nested) ternary into an if/else chain of `return`s.
function buildReturnIf(node: t.ConditionalExpression): t.IfStatement {
  const consequent = t.blockStatement([t.returnStatement(node.consequent)])

  if (t.isConditionalExpression(node.alternate)) {
    return t.ifStatement(node.test, consequent, buildReturnIf(node.alternate))
  }

  return t.ifStatement(node.test, consequent, t.blockStatement([t.returnStatement(node.alternate)]))
}

export default (): Visitor => ({
  ArrowFunctionExpression(path) {
    const { body } = path.node
    if (!t.isSequenceExpression(body)) return

    const exprs = body.expressions
    const last = exprs[exprs.length - 1]
    const rest = exprs.slice(0, -1)

    path.node.body = t.blockStatement([
      ...rest.map((expr) => t.expressionStatement(expr)),
      t.returnStatement(last),
    ])
  },
  ReturnStatement(path) {
    const { argument } = path.node
    if (!argument) return

    if (t.isSequenceExpression(argument)) {
      const exprs = argument.expressions
      const last = exprs[exprs.length - 1]
      const rest = exprs.slice(0, -1)

      path.replaceWithMultiple([
        ...rest.map((expr) => t.expressionStatement(expr)),
        t.returnStatement(last),
      ])
      return
    }

    if (t.isConditionalExpression(argument)) {
      path.replaceWith(buildReturnIf(argument))
    }
  },
})
