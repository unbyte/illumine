import type { NodePath, Visitor } from '@babel/traverse'
import * as t from '@babel/types'

/**
 * Hoists comma-sequence expressions out of the head of a control-flow statement,
 * turning the leading expressions into statements that run before it.
 *
 * ```
 * if ((a(), b(), c)) {}       →   a(); b(); if (c) {}
 * for ((a(), b);;) {}         →   a(); b(); for (;;) {}
 * do {} while ((a(), b))      →   do { a() } while (b)
 * ```
 *
 * Applies to `if`, `for`, `for-in`, `for-of`, `switch` and `do-while`.
 */

// Moves all but the last expression of a sequence out before `path`, and returns
// the final expression to be kept in place as the real head.
function hoistLeading(path: NodePath, seq: t.SequenceExpression): t.Expression {
  const exprs = seq.expressions
  path.insertBefore(exprs.slice(0, -1).map((expr) => t.expressionStatement(expr)))
  return exprs[exprs.length - 1]
}

export default (): Visitor => ({
  IfStatement(path) {
    if (t.isSequenceExpression(path.node.test)) {
      path.node.test = hoistLeading(path, path.node.test)
    }
  },
  ForInStatement(path) {
    if (t.isSequenceExpression(path.node.right)) {
      path.node.right = hoistLeading(path, path.node.right)
    }
  },
  ForOfStatement(path) {
    if (t.isSequenceExpression(path.node.right)) {
      path.node.right = hoistLeading(path, path.node.right)
    }
  },
  SwitchStatement(path) {
    if (t.isSequenceExpression(path.node.discriminant)) {
      path.node.discriminant = hoistLeading(path, path.node.discriminant)
    }
  },
  ForStatement(path) {
    const { init } = path.node
    if (!init || t.isVariableDeclaration(init)) return

    // The init runs once before the loop, so the whole thing can move out.
    const exprs = t.isSequenceExpression(init) ? init.expressions : [init]
    path.node.init = null
    path.insertBefore(exprs.map((expr) => t.expressionStatement(expr)))
  },
  DoWhileStatement(path) {
    const { test, body } = path.node
    if (!t.isSequenceExpression(test)) return

    // The test runs after every iteration, so the leading expressions belong at
    // the end of the body rather than before the loop.
    const rest = test.expressions.slice(0, -1).map((expr) => t.expressionStatement(expr))
    path.node.test = test.expressions[test.expressions.length - 1]
    const stmts = t.isBlockStatement(body) ? body.body : [body]
    path.node.body = t.blockStatement([...stmts, ...rest])
  },
})
