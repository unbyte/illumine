import type { NodePath, Visitor } from '@babel/traverse'
import * as t from '@babel/types'

/**
 * Rebuilds a `for...of` loop from Babel's `_createForOfIteratorHelper`
 * try/catch/finally output.
 *
 * ```
 * var it = _helper(arr);
 * try {
 *   for (it.s(); !(step = it.n()).done; ) { var x = step.value; use(x) }
 * } catch (e) { it.e(e) } finally { it.f() }
 * →
 * for (const x of arr) { use(x) }
 * ```
 */
export default (): Visitor => ({
  TryStatement(path) {
    const tryNode = path.node

    // The helper always wraps the loop in try/catch/finally.
    if (!tryNode.handler || !tryNode.finalizer) return

    const tryBody = tryNode.block.body
    if (tryBody.length !== 1 || !t.isForStatement(tryBody[0])) return
    const forStmt = tryBody[0]

    // init: _iterator.s()
    const initExpr = forStmt.init
    if (!t.isCallExpression(initExpr)) return
    if (!t.isMemberExpression(initExpr.callee)) return
    if (!t.isIdentifier(initExpr.callee.property, { name: 's' })) return
    if (!t.isIdentifier(initExpr.callee.object)) return
    const iteratorName = initExpr.callee.object.name

    // test: !(_step = _iterator.n()).done
    if (!t.isUnaryExpression(forStmt.test, { operator: '!' })) return
    const testArg = forStmt.test.argument
    if (!t.isMemberExpression(testArg)) return
    if (!t.isIdentifier(testArg.property, { name: 'done' })) return
    if (!t.isAssignmentExpression(testArg.object)) return
    const stepAssign = testArg.object
    if (!t.isIdentifier(stepAssign.left)) return
    const stepName = stepAssign.left.name
    if (!t.isCallExpression(stepAssign.right)) return
    if (!t.isMemberExpression(stepAssign.right.callee)) return
    if (!t.isIdentifier(stepAssign.right.callee.object, { name: iteratorName })) return
    if (!t.isIdentifier(stepAssign.right.callee.property, { name: 'n' })) return

    // catch: _iterator.e(e)
    const catchBody = tryNode.handler.body.body
    if (catchBody.length !== 1 || !t.isExpressionStatement(catchBody[0])) return
    const catchExpr = catchBody[0].expression
    if (!t.isCallExpression(catchExpr)) return
    if (!t.isMemberExpression(catchExpr.callee)) return
    if (!t.isIdentifier(catchExpr.callee.object, { name: iteratorName })) return
    if (!t.isIdentifier(catchExpr.callee.property, { name: 'e' })) return

    // finally: _iterator.f()
    const finallyBody = tryNode.finalizer.body
    if (finallyBody.length !== 1 || !t.isExpressionStatement(finallyBody[0])) return
    const finallyExpr = finallyBody[0].expression
    if (!t.isCallExpression(finallyExpr)) return
    if (!t.isMemberExpression(finallyExpr.callee)) return
    if (!t.isIdentifier(finallyExpr.callee.object, { name: iteratorName })) return
    if (!t.isIdentifier(finallyExpr.callee.property, { name: 'f' })) return

    // Loop body opens with `var x = _step.value`, which becomes the loop variable.
    const forBody = t.isBlockStatement(forStmt.body) ? forStmt.body.body : [forStmt.body]
    if (forBody.length === 0) return
    const firstStmt = forBody[0]
    if (!t.isVariableDeclaration(firstStmt) || firstStmt.declarations.length !== 1) return
    const decl = firstStmt.declarations[0]
    if (!t.isMemberExpression(decl.init)) return
    if (!t.isIdentifier(decl.init.object, { name: stepName })) return
    if (!t.isIdentifier(decl.init.property, { name: 'value' })) return

    const loopVariable = decl.id
    const restBody = forBody.slice(1)

    // The iterable comes from the preceding `var _iterator = helper(arr), _step;`.
    const parentPath = path.parentPath
    if (!parentPath || !('body' in parentPath.node)) return
    const siblings = (parentPath.node as { body: t.Statement[] }).body
    const tryIndex = siblings.indexOf(path.node)
    if (tryIndex <= 0) return

    const prevStmt = siblings[tryIndex - 1]
    if (!t.isVariableDeclaration(prevStmt)) return

    let iterable: t.Expression | undefined
    let iteratorDeclIndex = -1
    for (let i = 0; i < prevStmt.declarations.length; i++) {
      const d = prevStmt.declarations[i]
      if (t.isIdentifier(d.id, { name: iteratorName }) && t.isCallExpression(d.init)) {
        iterable = d.init.arguments[0] as t.Expression
        iteratorDeclIndex = i
        break
      }
    }
    if (!iterable || iteratorDeclIndex === -1) return

    path.replaceWith(
      t.forOfStatement(
        t.variableDeclaration('const', [t.variableDeclarator(loopVariable)]),
        iterable,
        t.blockStatement(restBody),
      ),
    )

    // Drop the now-unused iterator/step declarators (or the whole declaration).
    const prevDeclPath = ((parentPath as NodePath).get('body') as NodePath[])[tryIndex - 1]
    if (prevStmt.declarations.length <= 2) {
      prevDeclPath.remove()
    } else {
      const remaining = prevStmt.declarations.filter(
        (d, i) =>
          i !== iteratorDeclIndex && !(t.isIdentifier(d.id, { name: stepName }) && d.init == null),
      )
      if (remaining.length === 0) {
        prevDeclPath.remove()
      } else {
        ;(prevDeclPath.node as t.VariableDeclaration).declarations = remaining
      }
    }
  },
})
