import type { NodePath, Visitor } from '@babel/traverse'
import * as t from '@babel/types'

/**
 * Renames webpack's minified runtime symbols back to their canonical names,
 * making bundled output readable.
 *
 * ```
 * function n(r) { ... }   →   function __webpack_require__(r) { ... }
 * ```
 *
 * Detects the require function, module cache and modules registry (webpack 4 and
 * 5) and renames them, plus each module factory's `(module, exports, require)`
 * parameters.
 */

interface DetectionResult {
  fnName: string
  cacheName: string
  modulesName: string
}

export default (): Visitor => ({
  'FunctionDeclaration|FunctionExpression'(path) {
    // The merged visitor widens the path type, so narrow it back explicitly.
    if (!path.isFunctionDeclaration() && !path.isFunctionExpression()) return

    const result = detectWebpackRequire(path)
    if (!result) return

    const { fnName, cacheName, modulesName } = result
    const parentScope = path.scope.parent

    if (fnName !== '__webpack_require__') parentScope.rename(fnName, '__webpack_require__')
    if (cacheName !== '__webpack_module_cache__')
      parentScope.rename(cacheName, '__webpack_module_cache__')
    if (modulesName !== '__webpack_modules__')
      parentScope.rename(modulesName, '__webpack_modules__')

    renameModuleParams(path)
  },
})

function getFnName(path: NodePath<t.FunctionDeclaration | t.FunctionExpression>) {
  if (path.node.id) return path.node.id.name
  if (path.parentPath.isVariableDeclarator() && t.isIdentifier(path.parentPath.node.id)) {
    return path.parentPath.node.id.name
  }
  return undefined
}

function detectWebpackRequire(
  path: NodePath<t.FunctionDeclaration | t.FunctionExpression>,
): DetectionResult | undefined {
  const fn = path.node
  if (fn.params.length !== 1 || !t.isIdentifier(fn.params[0])) return
  if (!t.isBlockStatement(fn.body)) return

  const moduleIdName = fn.params[0].name
  const fnName = getFnName(path)
  if (!fnName) return

  const modulesName = findModulesName(path, moduleIdName, fnName)
  if (!modulesName) return

  if (!validateModulesObject(path, modulesName)) return

  const cacheName = findCacheName(path, modulesName, fnName)
  if (!cacheName) return

  return { fnName, cacheName, modulesName }
}

function findModulesName(
  fnPath: NodePath<t.FunctionDeclaration | t.FunctionExpression>,
  moduleIdName: string,
  fnName: string,
) {
  let found: string | undefined
  fnPath.traverse({
    CallExpression(callPath) {
      if (found) return
      found = matchModuleInvocation(callPath.node, moduleIdName, fnName)
    },
  })
  return found
}

function matchModuleInvocation(call: t.CallExpression, moduleIdName: string, fnName: string) {
  let callee = call.callee

  // modules[id].call(...)
  if (
    t.isMemberExpression(callee) &&
    !callee.computed &&
    t.isIdentifier(callee.property, { name: 'call' })
  ) {
    callee = callee.object as t.Expression
  }

  // modules[id](...)
  if (!t.isMemberExpression(callee) || !callee.computed) return undefined
  if (!t.isIdentifier(callee.property, { name: moduleIdName })) return undefined
  if (!t.isIdentifier(callee.object)) return undefined
  if (!call.arguments.some((arg) => t.isIdentifier(arg, { name: fnName }))) return undefined

  return callee.object.name
}

// Best-effort: find a sibling `var X = {}` in the same scope.
function findCacheName(
  fnPath: NodePath<t.FunctionDeclaration | t.FunctionExpression>,
  modulesName: string,
  fnName: string,
) {
  const parentScope = fnPath.scope.parent
  if (!parentScope) return undefined

  for (const [name, binding] of Object.entries(parentScope.bindings)) {
    if (name === modulesName || name === fnName) continue
    if (!binding.path.isVariableDeclarator()) continue
    if (
      t.isObjectExpression(binding.path.node.init) &&
      binding.path.node.init.properties.length === 0
    ) {
      return name
    }
  }
  return undefined
}

function validateModulesObject(
  fnPath: NodePath<t.FunctionDeclaration | t.FunctionExpression>,
  modulesName: string,
) {
  const binding =
    fnPath.scope.parent?.getBinding(modulesName) || fnPath.scope.getBinding(modulesName)
  if (!binding) return true

  const obj = resolveModulesObject(binding)
  if (!obj) return true
  return isValidModulesObject(obj)
}

function resolveModulesObject(binding: { path: NodePath }) {
  const declPath = binding.path
  if (declPath.isVariableDeclarator() && t.isObjectExpression(declPath.node.init)) {
    return declPath.node.init
  }
  const fnParent = declPath.parentPath
  if (fnParent?.isFunction() && fnParent.parentPath?.isCallExpression()) {
    const arg = fnParent.parentPath.node.arguments[0]
    if (t.isObjectExpression(arg)) return arg
  }
  return undefined
}

function isValidModulesObject(obj: t.ObjectExpression) {
  if (obj.properties.length === 0) return true

  let hasStringKey = false
  let hasNumericKey = false

  for (const prop of obj.properties) {
    if (!t.isObjectProperty(prop)) return false

    if (t.isStringLiteral(prop.key)) hasStringKey = true
    else if (t.isNumericLiteral(prop.key)) hasNumericKey = true
    else if (t.isIdentifier(prop.key) && !prop.computed) hasStringKey = true
    else return false

    const val = prop.value
    if (!t.isFunctionExpression(val) && !t.isArrowFunctionExpression(val)) return false
    if (val.params.length > 3) return false
  }

  if (hasStringKey && hasNumericKey) return false
  return true
}

function renameModuleParams(requirePath: NodePath<t.FunctionDeclaration | t.FunctionExpression>) {
  const binding = requirePath.scope.parent?.getBinding('__webpack_modules__')
  if (!binding) return

  const canonicalNames = ['module', 'exports', '__webpack_require__']

  let objPath: NodePath<t.ObjectExpression> | undefined
  if (binding.path.isVariableDeclarator()) {
    const init = binding.path.get('init')
    if (init.isObjectExpression()) objPath = init
  } else {
    const fnParent = binding.path.parentPath
    if (fnParent?.isFunction() && fnParent.parentPath?.isCallExpression()) {
      const args = fnParent.parentPath.get('arguments')
      if (args[0]?.isObjectExpression()) objPath = args[0]
    }
  }

  if (!objPath) return

  for (const propPath of objPath.get('properties')) {
    if (!propPath.isObjectProperty()) continue
    const valuePath = propPath.get('value')
    if (!valuePath.isFunctionExpression() && !valuePath.isArrowFunctionExpression()) continue

    const params = valuePath.node.params
    for (let i = 0; i < params.length && i < canonicalNames.length; i++) {
      const param = params[i]
      if (!t.isIdentifier(param)) continue
      if (param.name === canonicalNames[i]) continue
      if (param.name.startsWith('__unused')) continue
      valuePath.scope.rename(param.name, canonicalNames[i])
    }
  }
}
