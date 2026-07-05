import type { Visitor } from '@babel/traverse'
import * as t from '@babel/types'

/**
 * Un-flips Yoda-style comparisons so the variable reads before the constant, and
 * upgrades loose `typeof` checks to strict equality.
 *
 * ```
 * 0 === x               →   x === 0
 * "string" == typeof x  →   typeof x === "string"
 * ```
 */

function isLiteral(node: t.Node) {
  if (
    t.isNumericLiteral(node) ||
    t.isStringLiteral(node) ||
    t.isNullLiteral(node) ||
    t.isBooleanLiteral(node)
  ) {
    return true
  }
  // -1, +1 are a UnaryExpression wrapping a NumericLiteral
  return (
    t.isUnaryExpression(node, { prefix: true }) &&
    (node.operator === '-' || node.operator === '+') &&
    t.isNumericLiteral(node.argument)
  )
}

export default (): Visitor => ({
  BinaryExpression(path) {
    const { left, right, operator } = path.node

    // Yoda-style typeof comparisons: "string" == typeof x → typeof x === "string"
    if (t.isStringLiteral(left) && t.isUnaryExpression(right, { operator: 'typeof' })) {
      const newOp = operator === '==' || operator === '===' ? '===' : '!=='
      path.replaceWith(t.binaryExpression(newOp, right, left))
      return
    }
    if (t.isStringLiteral(right) && t.isUnaryExpression(left, { operator: 'typeof' })) {
      // typeof is already on the left, just upgrade == to ===
      if (operator === '==' || operator === '!=') {
        const newOp = operator === '==' ? '===' : '!=='
        path.replaceWith(t.binaryExpression(newOp, left, right))
      }
      return
    }

    // Yoda-style constant-on-left (strict equality only): 0 === t → t === 0
    if ((operator === '===' || operator === '!==') && isLiteral(left) && !isLiteral(right)) {
      path.replaceWith(t.binaryExpression(operator, right, left as t.Expression))
    }
  },
})
