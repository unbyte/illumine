import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import plugin from '.'

const transform = createTransform([plugin])

describe('sliced-to-array visitor', () => {
  it('transforms basic multi-declarator pattern', () => {
    expect(transform('var _x = o(expr, 2), a = _x[0], b = _x[1]')).toMatchInlineSnapshot(
      `"const [a, b] = expr;"`,
    )
  })

  it('transforms with holes (skipped indices)', () => {
    expect(transform('var _x = o(expr, 3), a = _x[0], c = _x[2]')).toMatchInlineSnapshot(
      `"const [a,, c] = expr;"`,
    )
  })

  it('transforms separate statements pattern', () => {
    expect(
      transform(`
        var _x = o(expr, 2);
        var a = _x[0];
        var b = _x[1];
      `),
    ).toMatchInlineSnapshot(`"const [a, b] = expr;"`)
  })

  it('does not transform when second arg is not a number', () => {
    expect(transform('var _x = o(expr, y), a = _x[0], b = _x[1]')).toMatchInlineSnapshot(`
      "var _x = o(expr, y),
        a = _x[0],
        b = _x[1];"
    `)
  })

  it('does not transform when temp var is used in non-index ways', () => {
    expect(
      transform('var _x = o(expr, 2), a = _x[0], b = _x[1]; console.log(_x)'),
    ).toMatchInlineSnapshot(`
      "var _x = o(expr, 2),
        a = _x[0],
        b = _x[1];
      console.log(_x);"
    `)
  })

  it('does not transform when result is used directly (not assigned to temp var)', () => {
    expect(transform('console.log(o(expr, 2))')).toMatchInlineSnapshot(`"console.log(o(expr, 2));"`)
  })

  it('does not transform when temp var is passed to another function', () => {
    expect(transform('var _x = o(expr, 2), a = _x[0]; doSomething(_x)')).toMatchInlineSnapshot(`
      "var _x = o(expr, 2),
        a = _x[0];
      doSomething(_x);"
    `)
  })

  it('does not transform native destructuring', () => {
    expect(transform('const [a, b] = expr')).toMatchInlineSnapshot(`"const [a, b] = expr;"`)
  })

  it('handles indices not starting at 0 by inserting holes', () => {
    expect(transform('var _x = o(expr, 3), a = _x[1], b = _x[2]')).toMatchInlineSnapshot(
      `"const [, a, b] = expr;"`,
    )
  })
})
