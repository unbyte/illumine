import expandReturn from './expand-return'
import flipComparison from './flip-comparison'
import hoistControlSequences from './hoist-control-sequences'
import logicalToIf from './logical-to-if'
import simplifyIndirectCall from './simplify-indirect-call'
import simplifyLiterals from './simplify-literals'
import splitDeclarators from './split-declarators'
import splitSequences from './split-sequences'
import unescapeStrings from './unescape-strings'

export default [
  hoistControlSequences,
  logicalToIf,
  expandReturn,
  flipComparison,
  simplifyIndirectCall,
  simplifyLiterals,
  splitSequences,
  splitDeclarators,
  unescapeStrings,
]
