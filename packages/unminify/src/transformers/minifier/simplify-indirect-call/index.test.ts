import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import plugin from '.'

const transform = createTransform([plugin])

describe('simplify-indirect-call visitor', () => {
  it('rewrites (0, r(1).foo)() — direct require member', () => {
    expect(transform('(0, r(1).foo)()')).toMatchInlineSnapshot(`"r(1).foo();"`)
  })

  it('rewrites (0, n.foo)(x, y) — identifier bound to require', () => {
    expect(transform('var n = r(123); (0, n.foo)(x, y)')).toMatchInlineSnapshot(`
      "var n = r(123);
      n.foo(x, y);"
    `)
  })

  it('rewrites nested member on require call', () => {
    expect(transform('(0, r(42).a.b)(x)')).toMatchInlineSnapshot(`"(0, r(42).a.b)(x);"`)
  })

  it('rewrites computed member on require-bound identifier', () => {
    expect(transform('var n = r(5); (0, n["foo"])(x)')).toMatchInlineSnapshot(`
      "var n = r(5);
      n["foo"](x);"
    `)
  })

  it('does not touch when object is not a module namespace', () => {
    expect(transform('(0, obj.foo)()')).toMatchInlineSnapshot(`"(0, obj.foo)();"`)
  })

  it('does not touch when object is bound to non-require call', () => {
    expect(transform('var n = foo(); (0, n.bar)()')).toMatchInlineSnapshot(`
      "var n = foo();
      (0, n.bar)();"
    `)
  })

  it('does not touch when second element is a plain identifier', () => {
    expect(transform('(0, foo)()')).toMatchInlineSnapshot(`"(0, foo)();"`)
  })

  it('does not touch regular method calls', () => {
    expect(transform('r(1).foo()')).toMatchInlineSnapshot(`"r(1).foo();"`)
  })

  it('does not touch sequence with more than 2 elements', () => {
    expect(transform('(0, 1, r(1).foo)()')).toMatchInlineSnapshot(`"(0, 1, r(1).foo)();"`)
  })
})
