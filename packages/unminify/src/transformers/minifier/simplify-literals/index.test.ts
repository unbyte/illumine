import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import literals from '.'

const transform = createTransform([literals])

describe('simplify-literals visitor', () => {
  it('replaces !0 with true', () => {
    expect(transform('const a = !0')).toMatchInlineSnapshot(`"const a = true;"`)
  })

  it('replaces !1 with false', () => {
    expect(transform('const a = !1')).toMatchInlineSnapshot(`"const a = false;"`)
  })

  it('replaces void 0 with undefined', () => {
    expect(transform('const a = void 0')).toMatchInlineSnapshot(`"const a = undefined;"`)
  })

  it('handles all three together', () => {
    expect(transform('f(!0, !1, void 0)')).toMatchInlineSnapshot(`"f(true, false, undefined);"`)
  })

  it('does not touch other unary expressions', () => {
    expect(transform('const a = !x')).toMatchInlineSnapshot(`"const a = !x;"`)
    expect(transform('const a = !2')).toMatchInlineSnapshot(`"const a = !2;"`)
    expect(transform('const a = void x')).toMatchInlineSnapshot(`"const a = void x;"`)
    expect(transform('const a = void 1')).toMatchInlineSnapshot(`"const a = void 1;"`)
  })

  it('handles nested occurrences', () => {
    expect(transform('if (!0) { return !1 } else { return void 0 }')).toMatchInlineSnapshot(`
      "if (true) {
        return false;
      } else {
        return undefined;
      }"
    `)
  })
})
