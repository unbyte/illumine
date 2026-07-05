import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import plugin from '.'

const transform = createTransform([plugin])

describe('expand-return visitor', () => {
  it('splits return with sequence expression', () => {
    expect(transform('return a(), b(), c')).toMatchInlineSnapshot(`
      "a();
      b();
      return c;"
    `)
  })

  it('converts return with conditional to if/else', () => {
    expect(transform('return a ? b : c')).toMatchInlineSnapshot(`
      "if (a) {
        return b;
      } else {
        return c;
      }"
    `)
  })

  it('converts nested ternary to if/elseif/else', () => {
    expect(transform('return a ? b : c ? d : e')).toMatchInlineSnapshot(`
      "if (a) {
        return b;
      } else if (c) {
        return d;
      } else {
        return e;
      }"
    `)
  })

  it('converts deeply nested ternary', () => {
    expect(transform('return a ? b : c ? d : e ? f : g')).toMatchInlineSnapshot(`
      "if (a) {
        return b;
      } else if (c) {
        return d;
      } else if (e) {
        return f;
      } else {
        return g;
      }"
    `)
  })

  it('handles sequence where last element is a conditional', () => {
    expect(transform('return a(), b(), x ? y : z')).toMatchInlineSnapshot(`
      "a();
      b();
      if (x) {
        return y;
      } else {
        return z;
      }"
    `)
  })

  it('does not touch plain return', () => {
    expect(transform('return x')).toMatchInlineSnapshot(`"return x;"`)
  })

  it('does not touch return without argument', () => {
    expect(transform('return')).toMatchInlineSnapshot(`"return;"`)
  })

  it('does not touch unrelated code', () => {
    expect(transform('const a = x ? y : z')).toMatchInlineSnapshot(`"const a = x ? y : z;"`)
  })

  it('expands arrow function with sequence expression body', () => {
    expect(transform('const f = e => (e.list = {}, delete e.base_resp, e)')).toMatchInlineSnapshot(`
      "const f = e => {
        e.list = {};
        delete e.base_resp;
        return e;
      };"
    `)
  })
})
