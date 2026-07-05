import type { NodePath, Visitor } from '@babel/traverse'
import * as t from '@babel/types'

/**
 * Rebuilds array destructuring from Babel's `_slicedToArray` helper output.
 *
 * ```
 * var _x = _slicedToArray(pair, 2), a = _x[0], b = _x[1]
 * →
 * const [a, b] = pair
 * ```
 *
 * Handles both the multi-declarator form above and the separate-statement form
 * (`var _x = _slicedToArray(pair, 2); var a = _x[0]; var b = _x[1]`).
 */

// Matches someHelper(expression, numericLiteral).
function isSlicedToArrayCall(node: t.Expression): node is t.CallExpression {
  if (!t.isCallExpression(node)) return false
  if (node.arguments.length !== 2) return false
  if (!t.isNumericLiteral(node.arguments[1])) return false
  return t.isIdentifier(node.callee) || t.isMemberExpression(node.callee)
}

// Returns the numeric index if `node` is `tempVar[N]`, otherwise undefined.
function getIndexAccess(node: t.Expression, tempName: string) {
  if (!t.isMemberExpression(node)) return undefined
  if (!t.isIdentifier(node.object, { name: tempName })) return undefined
  if (!t.isNumericLiteral(node.property)) return undefined
  if (node.computed !== true) return undefined
  return node.property.value
}

// Collects index accesses from subsequent declarators in the same declaration.
function collectFromDeclarators(
  declarators: t.VariableDeclarator[],
  startIndex: number,
  tempName: string,
) {
  const accesses = new Map<number, t.PatternLike>()

  for (let i = startIndex; i < declarators.length; i++) {
    const d = declarators[i]
    if (!d.init) break
    const idx = getIndexAccess(d.init, tempName)
    if (idx === undefined) break
    accesses.set(idx, d.id as t.PatternLike)
  }

  return accesses.size > 0 ? accesses : undefined
}

// Collects index accesses from subsequent sibling statements, along with how
// many statements were consumed.
function collectFromStatements(siblings: NodePath[], startIndex: number, tempName: string) {
  const accesses = new Map<number, t.PatternLike>()
  let consumed = 0

  for (let i = startIndex; i < siblings.length; i++) {
    const sibling = siblings[i]
    if (!sibling.isVariableDeclaration()) break

    let allMatched = true
    for (const d of sibling.node.declarations) {
      if (!d.init) {
        allMatched = false
        break
      }
      const idx = getIndexAccess(d.init, tempName)
      if (idx === undefined) {
        allMatched = false
        break
      }
      accesses.set(idx, d.id as t.PatternLike)
    }

    if (!allMatched) break
    consumed++
  }

  return accesses.size > 0 ? { accesses, consumed } : undefined
}

// Whether the temp variable is referenced beyond the expected index accesses.
function hasExtraReferences(
  path: NodePath<t.VariableDeclaration>,
  tempName: string,
  expectedRefs: number,
) {
  const binding = path.scope.getBinding(tempName)
  if (!binding) return true
  return binding.references > expectedRefs
}

// Builds an array pattern with holes for any missing indices.
function buildArrayPattern(accesses: Map<number, t.PatternLike>, maxIndex: number) {
  const elements: (t.PatternLike | null)[] = []
  for (let i = 0; i <= maxIndex; i++) {
    elements.push(accesses.get(i) ?? null)
  }
  return t.arrayPattern(elements)
}

export default (): Visitor => ({
  VariableDeclaration(path) {
    const { node } = path
    const declarators = node.declarations

    // Case 1: var _x = helper(expr, N), a = _x[0], b = _x[1]
    for (let i = 0; i < declarators.length; i++) {
      const d = declarators[i]
      if (!d.init || !t.isIdentifier(d.id)) continue
      if (!isSlicedToArrayCall(d.init)) continue

      const tempName = d.id.name
      const expectedCount = (d.init.arguments[1] as t.NumericLiteral).value
      const sourceExpr = d.init.arguments[0] as t.Expression

      const accesses = collectFromDeclarators(declarators, i + 1, tempName)
      if (!accesses) continue

      const maxIndex = Math.max(...accesses.keys())
      if (maxIndex >= expectedCount) continue

      if (hasExtraReferences(path, tempName, accesses.size)) continue

      const newDecl = t.variableDeclaration('const', [
        t.variableDeclarator(buildArrayPattern(accesses, maxIndex), sourceExpr),
      ])

      const remaining = [...declarators.slice(0, i), ...declarators.slice(i + 1 + accesses.size)]

      if (remaining.length === 0) {
        path.replaceWith(newDecl)
      } else {
        path.replaceWithMultiple([t.variableDeclaration(node.kind, remaining), newDecl])
      }
      return
    }

    // Case 2: var _x = helper(expr, N); var a = _x[0]; var b = _x[1];
    if (declarators.length !== 1) return
    const firstDecl = declarators[0]
    if (!firstDecl.init || !t.isIdentifier(firstDecl.id)) return
    if (!isSlicedToArrayCall(firstDecl.init)) return

    const tempName = firstDecl.id.name
    const expectedCount = (firstDecl.init.arguments[1] as t.NumericLiteral).value
    const sourceExpr = firstDecl.init.arguments[0] as t.Expression

    if (!Array.isArray(path.container)) return

    const myIndex = path.key as number
    if (typeof myIndex !== 'number') return
    if (!path.parentPath || !path.listKey) return

    const siblings = path.parentPath.get(path.listKey) as unknown as NodePath[]
    const result = collectFromStatements(siblings, myIndex + 1, tempName)
    if (!result) return

    const { accesses, consumed } = result
    const maxIndex = Math.max(...accesses.keys())
    if (maxIndex >= expectedCount) return

    if (hasExtraReferences(path, tempName, accesses.size)) return

    const newDecl = t.variableDeclaration('const', [
      t.variableDeclarator(buildArrayPattern(accesses, maxIndex), sourceExpr),
    ])

    // Remove consumed statements in reverse to keep indices valid.
    for (let i = consumed - 1; i >= 0; i--) {
      siblings[myIndex + 1 + i].remove()
    }

    path.replaceWith(newDecl)
  },
})
