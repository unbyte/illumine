import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import conditionExpr from '.'

const transform = createTransform([conditionExpr])

describe('expand-logical visitor', () => {
  it('converts && expression statement to if', () => {
    expect(transform('a && b()')).toMatchInlineSnapshot(`
      "if (a) {
        b();
      }"
    `)
  })

  it('converts || expression statement to negated if', () => {
    expect(transform('a || b()')).toMatchInlineSnapshot(`
      "if (!a) {
        b();
      }"
    `)
  })

  it('converts ?: expression statement to if/else', () => {
    expect(transform('a ? b() : c()')).toMatchInlineSnapshot(`
      "if (a) {
        b();
      } else {
        c();
      }"
    `)
  })

  it('preserves complex left-hand expressions', () => {
    expect(transform('(x === 1 && y) && f()')).toMatchInlineSnapshot(`
      "if (x === 1 && y) {
        f();
      }"
    `)
  })

  it('does not touch && inside other expressions', () => {
    expect(transform('const a = b && c')).toMatchInlineSnapshot(`"const a = b && c;"`)
    expect(transform('return a && b()')).toMatchInlineSnapshot(`"return a && b();"`)
  })

  it('does not touch ?: inside other expressions', () => {
    expect(transform('const a = b ? c : d')).toMatchInlineSnapshot(`"const a = b ? c : d;"`)
  })

  it('leaves ?? alone', () => {
    expect(transform('a ?? b()')).toMatchInlineSnapshot(`"a ?? b();"`)
  })

  it('handles nested patterns', () => {
    expect(transform('a && (b ? c() : d())')).toMatchInlineSnapshot(`
      "if (a) {
        if (b) {
          c();
        } else {
          d();
        }
      }"
    `)
  })

  it('handles call expressions on the left of &&', () => {
    expect(transform('check() && doThing()')).toMatchInlineSnapshot(`
      "if (check()) {
        doThing();
      }"
    `)
  })

  it('handles chained && with assignment', () => {
    expect(transform('a && b && (c = d)')).toMatchInlineSnapshot(`
      "if (a && b) {
        c = d;
      }"
    `)
  })

  it('handles chained && with function call', () => {
    expect(transform('a && b && c()')).toMatchInlineSnapshot(`
      "if (a && b) {
        c();
      }"
    `)
  })

  it('handles nested || inside &&', () => {
    expect(transform('a && (b || c())')).toMatchInlineSnapshot(`
      "if (a) {
        if (!b) {
          c();
        }
      }"
    `)
  })

  it('handles deep chain of &&', () => {
    expect(transform('a && b && c && d()')).toMatchInlineSnapshot(`
      "if (a && b && c) {
        d();
      }"
    `)
  })

  it('handles && with complex right side that is another &&', () => {
    expect(transform('x && (y && z())')).toMatchInlineSnapshot(`
      "if (x) {
        if (y) {
          z();
        }
      }"
    `)
  })
})
