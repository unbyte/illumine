import type { Visitor } from '@babel/traverse'
import * as t from '@babel/types'

/**
 * Rebuilds a `class` from Babel's `_createClass` helper output.
 *
 * ```
 * var A = _createClass(
 *   function A() { _classCallCheck(this, A) },
 *   [{ key: "m", value: function () {} }],
 * )
 * →
 * const A = class A { constructor() {} m() {} }
 * ```
 *
 * The optional third argument (static methods) and get/set accessors are handled
 * too, as is the `(function () { return _createClass(...) })()` IIFE variant.
 */

// A method descriptor is { key: "name", value | get | set: function () {} }.
function isMethodDescriptor(node: t.Node): node is t.ObjectExpression {
  if (!t.isObjectExpression(node)) return false
  const props = node.properties
  if (props.length < 2) return false

  let hasKey = false
  let hasValueOrAccessor = false

  for (const prop of props) {
    if (!t.isObjectProperty(prop)) return false
    if (t.isIdentifier(prop.key, { name: 'key' })) hasKey = true
    if (
      t.isIdentifier(prop.key, { name: 'value' }) ||
      t.isIdentifier(prop.key, { name: 'get' }) ||
      t.isIdentifier(prop.key, { name: 'set' })
    ) {
      hasValueOrAccessor = true
    }
  }

  return hasKey && hasValueOrAccessor
}

function isMethodsArray(node: t.Node): node is t.ArrayExpression {
  if (!t.isArrayExpression(node)) return false
  return node.elements.every((el) => el != null && isMethodDescriptor(el))
}

// Index of the classCallCheck(this, Name) statement, or -1.
function getClassCallCheckIndex(body: t.Statement[]) {
  for (let i = 0; i < body.length; i++) {
    const stmt = body[i]
    if (!t.isExpressionStatement(stmt)) continue
    const expr = stmt.expression
    if (!t.isCallExpression(expr)) continue
    if (expr.arguments.length !== 2) continue
    if (!t.isThisExpression(expr.arguments[0])) continue
    if (!t.isIdentifier(expr.arguments[1])) continue
    return i
  }
  return -1
}

// Uses a bare identifier as the key when the string is a valid identifier name.
function buildMethodKey(prop: t.ObjectProperty) {
  const value = prop.value
  if (t.isStringLiteral(value) && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value.value)) {
    return t.identifier(value.value)
  }
  return value as t.Expression
}

function extractMethodsFromArray(arr: t.ArrayExpression, isStatic: boolean) {
  const methods: t.ClassMethod[] = []

  for (const element of arr.elements) {
    if (!element || !t.isObjectExpression(element)) continue

    let key: t.Expression | undefined
    let valueFn: t.FunctionExpression | undefined
    let getFn: t.FunctionExpression | undefined
    let setFn: t.FunctionExpression | undefined

    for (const prop of element.properties) {
      if (!t.isObjectProperty(prop)) continue
      if (t.isIdentifier(prop.key, { name: 'key' })) {
        key = buildMethodKey(prop)
      } else if (
        t.isIdentifier(prop.key, { name: 'value' }) &&
        t.isFunctionExpression(prop.value)
      ) {
        valueFn = prop.value
      } else if (t.isIdentifier(prop.key, { name: 'get' }) && t.isFunctionExpression(prop.value)) {
        getFn = prop.value
      } else if (t.isIdentifier(prop.key, { name: 'set' }) && t.isFunctionExpression(prop.value)) {
        setFn = prop.value
      }
    }

    if (!key) continue

    if (valueFn) {
      methods.push(t.classMethod('method', key, valueFn.params, valueFn.body, undefined, isStatic))
    }
    if (getFn) {
      methods.push(t.classMethod('get', key, getFn.params, getFn.body, undefined, isStatic))
    }
    if (setFn) {
      methods.push(t.classMethod('set', key, setFn.params, setFn.body, undefined, isStatic))
    }
  }

  return methods
}

function isCreateClassCall(node: t.CallExpression) {
  const args = node.arguments
  if (args.length < 2 || args.length > 3) return false

  // First arg is the constructor function, opening with classCallCheck.
  const ctorArg = args[0]
  if (!t.isFunctionExpression(ctorArg)) return false
  if (getClassCallCheckIndex(ctorArg.body.body) === -1) return false

  // Second arg is an array of method descriptors.
  if (!isMethodsArray(args[1])) return false

  // Optional third arg (statics) must be the same shape.
  if (args.length === 3 && !isMethodsArray(args[2])) return false

  return true
}

function buildClassFromCall(node: t.CallExpression) {
  const args = node.arguments
  const ctorFn = args[0] as t.FunctionExpression
  const methodsArr = args[1] as t.ArrayExpression
  const staticsArr = args.length === 3 ? (args[2] as t.ArrayExpression) : undefined

  // Drop the classCallCheck statement from the constructor body.
  const ctorBody = [...ctorFn.body.body]
  ctorBody.splice(getClassCallCheckIndex(ctorBody), 1)

  const classBody: t.ClassBody['body'] = [
    t.classMethod(
      'constructor',
      t.identifier('constructor'),
      ctorFn.params,
      t.blockStatement(ctorBody),
    ),
    ...extractMethodsFromArray(methodsArr, false),
  ]

  if (staticsArr) {
    classBody.push(...extractMethodsFromArray(staticsArr, true))
  }

  return t.classExpression(ctorFn.id ?? undefined, null, t.classBody(classBody))
}

export default (): Visitor => ({
  VariableDeclaration(path) {
    if (path.node.declarations.length !== 1) return
    const decl = path.node.declarations[0]
    if (!t.isIdentifier(decl.id) || !decl.init) return

    let callExpr: t.CallExpression | undefined

    // Direct call: var Foo = createClass(...)
    if (t.isCallExpression(decl.init) && isCreateClassCall(decl.init)) {
      callExpr = decl.init
    }

    // IIFE: var Foo = (function () { return createClass(...) })()
    if (!callExpr && t.isCallExpression(decl.init)) {
      const callee = decl.init.callee
      let innerFn: t.FunctionExpression | undefined

      if (t.isFunctionExpression(callee)) {
        innerFn = callee
      } else if (t.isParenthesizedExpression(callee) && t.isFunctionExpression(callee.expression)) {
        innerFn = callee.expression
      }

      if (innerFn && innerFn.body.body.length >= 1) {
        const lastStmt = innerFn.body.body[innerFn.body.body.length - 1]
        if (
          t.isReturnStatement(lastStmt) &&
          lastStmt.argument &&
          t.isCallExpression(lastStmt.argument) &&
          isCreateClassCall(lastStmt.argument)
        ) {
          callExpr = lastStmt.argument
        }
      }
    }

    if (!callExpr) return

    const classExpr = buildClassFromCall(callExpr)
    classExpr.id = t.identifier(decl.id.name)
    decl.init = classExpr
    path.node.kind = 'const'
  },
})
