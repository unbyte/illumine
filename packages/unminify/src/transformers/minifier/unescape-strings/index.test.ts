import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import unescapeUnicode from '.'

const transform = createTransform([unescapeUnicode])

describe('unescape-string visitor', () => {
  it('unescapes \\uXXXX in string literals', () => {
    expect(transform('const a = "\\u4f60\\u597d"')).toMatchInlineSnapshot(`"const a = "你好";"`)
  })

  it('unescapes \\u{XXXX} in string literals', () => {
    expect(transform('const a = "\\u{1f4a9}"')).toMatchInlineSnapshot(`"const a = "💩";"`)
  })

  it('preserves single quotes', () => {
    expect(transform("const a = '\\u4f60'")).toMatchInlineSnapshot(`"const a = '你';"`)
  })

  it('unescapes in template literals', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: this is template literal source under test
    expect(transform('const a = `\\u4f60${x}\\u597d`')).toMatchInlineSnapshot(
      `"const a = \`你\${x}好\`;"`,
    )
  })

  it('keeps necessary escapes intact', () => {
    expect(transform('const a = "\\u4f60\\n\\t"')).toMatchInlineSnapshot(`"const a = "你\\n\\t";"`)
  })

  it('leaves template literals with backslash escapes untouched', () => {
    expect(transform('const a = `\n`')).toMatchInlineSnapshot(`"const a = \`\\n\`;"`)
  })

  it('does not touch other escape sequences', () => {
    expect(transform('const a = "a\\nb"')).toMatchInlineSnapshot(`"const a = "a\\nb";"`)
  })
})
