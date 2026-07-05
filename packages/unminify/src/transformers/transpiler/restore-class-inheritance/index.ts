import type { NodePath, Visitor } from '@babel/traverse'
import * as t from '@babel/types'

/**
 * Rebuilds a `class ... extends` from Babel's `_inherits` helper IIFE.
 *
 * ```
 * var A = (function (_B) {
 *   _inherits(A, _B)
 *   function A() { _classCallCheck(this, A); return _possibleConstructorReturn(this, _B.call(this, x)) }
 *   return A
 * })(B)
 * →
 * class A extends B { constructor() { super(x) } }
 * ```
 */

// Matches helperName(...), _helperName(...), or obj.helperName(...).
function isHelperCall(node: t.CallExpression, name: string) {
  const callee = node.callee
  if (t.isIdentifier(callee)) {
    return callee.name === name || callee.name === `_${name}`
  }
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
    return callee.property.name === name
  }
  return false
}

// Locates the inherits(Child, _Parent) call and the names it references.
function findInheritsCall(body: t.Statement[]) {
  for (let i = 0; i < body.length; i++) {
    const stmt = body[i]
    if (!t.isExpressionStatement(stmt)) continue
    const expr = stmt.expression
    if (!t.isCallExpression(expr)) continue
    if (!isHelperCall(expr, 'inherits') && !isHelperCall(expr, 'inheritsHelper')) continue
    if (expr.arguments.length < 2) continue
    const [childArg, parentArg] = expr.arguments
    if (!t.isIdentifier(childArg) || !t.isIdentifier(parentArg)) continue
    return { childName: childArg.name, parentParam: parentArg.name, index: i }
  }
  return undefined
}

// Extracts super() arguments from possibleConstructorReturn(this, _Parent.call(this, ...args)).
function extractSuperArgs(expr: t.Expression, parentParam: string) {
  if (!t.isCallExpression(expr)) return undefined
  if (
    !isHelperCall(expr, 'possibleConstructorReturn') &&
    !isHelperCall(expr, '_possibleConstructorReturn')
  ) {
    return undefined
  }
  if (expr.arguments.length < 2) return undefined

  const parentCall = expr.arguments[1]
  if (!t.isCallExpression(parentCall)) return undefined

  const callee = parentCall.callee
  if (
    t.isMemberExpression(callee) &&
    t.isIdentifier(callee.object, { name: parentParam }) &&
    t.isIdentifier(callee.property, { name: 'call' })
  ) {
    // Drop the leading `this` argument.
    return parentCall.arguments.slice(1) as t.Expression[]
  }

  return undefined
}

// Cleans a freshly-attached constructor body: drops the classCallCheck guard and
// turns `var _this = possibleConstructorReturn(this, _Parent.call(this, ...args))`
// into `super(...args)`. That declaration is the `_this` binding, so before
// removing it we redirect every one of the binding's `referencePaths` onto a real
// `this` — this is scope-correct by construction and never touches a property key
// named `_this`. The now-redundant trailing `return this` is then dropped.
function cleanupConstructor(ctorPath: NodePath<t.ClassMethod>, parentParam: string) {
  ctorPath.scope.crawl()

  for (const stmtPath of ctorPath.get('body').get('body')) {
    if (stmtPath.isExpressionStatement()) {
      const expr = stmtPath.node.expression
      if (t.isCallExpression(expr) && isHelperCall(expr, 'classCallCheck')) {
        stmtPath.remove()
        continue
      }
    }

    if (stmtPath.isVariableDeclaration() && stmtPath.node.declarations.length === 1) {
      const decl = stmtPath.node.declarations[0]
      if (t.isIdentifier(decl.id) && decl.init) {
        const superArgs = extractSuperArgs(decl.init, parentParam)
        if (superArgs !== undefined) {
          const binding = stmtPath.scope.getBinding(decl.id.name)
          for (const ref of binding?.referencePaths ?? []) {
            ref.replaceWith(t.thisExpression())
          }
          stmtPath.replaceWith(t.expressionStatement(t.callExpression(t.super(), superArgs)))
        }
      }
    }
  }

  const statements = ctorPath.get('body').get('body')
  const last = statements[statements.length - 1]
  if (last?.isReturnStatement() && t.isThisExpression(last.node.argument)) {
    last.remove()
  }
}

export default (): Visitor => ({
  CallExpression(path: NodePath<t.CallExpression>) {
    const { node } = path

    // Must be an IIFE: (function (_Parent) { ... })(Parent)
    const callee = node.callee
    if (!t.isFunctionExpression(callee)) return
    if (callee.params.length !== 1 || !t.isIdentifier(callee.params[0])) return
    if (node.arguments.length !== 1) return

    const parentParam = callee.params[0].name
    const parentExpr = node.arguments[0] as t.Expression
    const body = callee.body.body

    const inheritsInfo = findInheritsCall(body)
    if (!inheritsInfo) return
    if (inheritsInfo.parentParam !== parentParam) return

    const childName = inheritsInfo.childName

    // Find the constructor: either a `function Child(...)` declaration...
    let constructorNode: t.FunctionDeclaration | t.FunctionExpression | undefined
    let constructorParams: t.Identifier[] = []

    for (const stmt of body) {
      if (t.isFunctionDeclaration(stmt) && t.isIdentifier(stmt.id, { name: childName })) {
        constructorNode = stmt
        constructorParams = stmt.params.filter((p) => t.isIdentifier(p)) as t.Identifier[]
        break
      }
    }

    // ...or the createClass variant: return createClass(function Child(...) {}, [...])
    if (!constructorNode) {
      for (const stmt of body) {
        if (!t.isReturnStatement(stmt) || !t.isCallExpression(stmt.argument)) continue
        const retCall = stmt.argument
        if (!isHelperCall(retCall, 'createClass') && !isHelperCall(retCall, '_createClass'))
          continue
        const firstArg = retCall.arguments[0]
        if (t.isFunctionExpression(firstArg)) {
          constructorNode = firstArg
          constructorParams = firstArg.params.filter((p) => t.isIdentifier(p)) as t.Identifier[]
          break
        }
      }
    }

    if (!constructorNode) return

    const ctorMethod = t.classMethod(
      'constructor',
      t.identifier('constructor'),
      constructorParams,
      constructorNode.body,
    )

    const [classPath] = path.replaceWith(
      t.classExpression(t.identifier(childName), parentExpr, t.classBody([ctorMethod])),
    )

    const ctorPath = classPath.get('body').get('body')[0] as NodePath<t.ClassMethod>
    cleanupConstructor(ctorPath, parentParam)
  },
})
