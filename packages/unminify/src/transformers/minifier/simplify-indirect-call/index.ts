import type { NodePath, Visitor } from '@babel/traverse'
import * as t from '@babel/types'

/**
 * Removes the `(0, …)` interop wrapper from a call to a module-namespace member,
 * restoring a direct member call.
 *
 * ```
 * (0, mod.fn)(x)   →   mod.fn(x)
 * ```
 *
 * Only applied when the object is provably a bundler module namespace (a
 * `require(id)` result, or a variable bound to one), so the severed `this` is
 * known to be irrelevant. Other `(0, obj.method)()` calls are left untouched.
 */
export default (): Visitor => ({
  CallExpression(path) {
    const { callee } = path.node

    if (!t.isSequenceExpression(callee)) return
    if (callee.expressions.length !== 2) return

    const [first, second] = callee.expressions
    if (!t.isNumericLiteral(first) || first.value !== 0) return
    if (!t.isMemberExpression(second)) return
    if (!isModuleNamespace(path, second.object)) return

    path.node.callee = second
  },
})

function isRequireCall(node: t.Node) {
  return (
    t.isCallExpression(node) && node.arguments.length >= 1 && t.isNumericLiteral(node.arguments[0])
  )
}

function isModuleNamespace(path: NodePath, node: t.Node) {
  // Direct: r(123).foo
  if (isRequireCall(node)) return true

  // Indirect: var n = r(123); ... (0, n.foo)(...)
  if (t.isIdentifier(node)) {
    const binding = path.scope.getBinding(node.name)
    const decl = binding?.path
    if (decl?.isVariableDeclarator() && decl.node.init) {
      return isRequireCall(decl.node.init)
    }
  }

  return false
}
