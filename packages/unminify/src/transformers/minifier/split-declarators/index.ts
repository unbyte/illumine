import type { Visitor } from '@babel/traverse'
import * as t from '@babel/types'

/**
 * Splits a multi-declarator variable declaration into one declaration per
 * variable.
 *
 * ```
 * var a = 1, b = 2   →   var a = 1; var b = 2;
 * ```
 *
 * Left untouched inside `for` heads, where the declarators cannot be split.
 */
export default (): Visitor => ({
  VariableDeclaration(path) {
    const { node } = path

    if (node.declarations.length < 2) return
    if (path.listKey === undefined) return

    path.replaceWithMultiple(
      node.declarations.map((decl) => t.variableDeclaration(node.kind, [decl])),
    )
  },
})
