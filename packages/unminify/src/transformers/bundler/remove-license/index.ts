import type { Visitor } from '@babel/traverse'
import type { Comment } from '@babel/types'

/**
 * Strips bundler-preserved legal comments — block comments starting with `!`,
 * the convention bundlers use to keep license banners.
 *
 * ```
 * /*! (c) 2020 *\/ x   →   x
 * ```
 */

type CommentKey = 'leadingComments' | 'trailingComments' | 'innerComments'

const COMMENT_KEYS: CommentKey[] = ['leadingComments', 'trailingComments', 'innerComments']

function isLicenseComment(comment: Comment) {
  return comment.type === 'CommentBlock' && comment.value.startsWith('!')
}

export default (): Visitor => ({
  enter(path) {
    for (const key of COMMENT_KEYS) {
      const comments = path.node[key]
      if (!comments) continue
      path.node[key] = comments.filter((comment) => !isLicenseComment(comment))
    }
  },
})
