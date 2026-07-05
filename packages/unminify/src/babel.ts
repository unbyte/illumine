import _generate from '@babel/generator'
import _traverse from '@babel/traverse'

// `@babel/generator` and `@babel/traverse` are CJS modules that expose their
// function as `exports.default`. Under Node's ESM interop the default import
// resolves to `{ default: fn }` instead of the function itself, so we unwrap it
// here and re-export the real callables.
export const generate = ((_generate as unknown as { default?: typeof _generate }).default ??
  _generate) as typeof _generate

export const traverse = ((_traverse as unknown as { default?: typeof _traverse }).default ??
  _traverse) as typeof _traverse
