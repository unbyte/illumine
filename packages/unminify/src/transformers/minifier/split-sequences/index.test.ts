import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import plugin from '.'

const transform = createTransform([plugin])

describe('split-seq visitor', () => {
  it('splits a comma expression statement into multiple statements', () => {
    expect(transform('a(), b(), c()')).toMatchInlineSnapshot(`
      "a();
      b();
      c();"
    `)
  })

  it('handles two-element sequences', () => {
    expect(transform('x = 1, y = 2')).toMatchInlineSnapshot(`
      "x = 1;
      y = 2;"
    `)
  })

  it('does not touch a single expression statement', () => {
    expect(transform('a()')).toMatchInlineSnapshot(`"a();"`)
  })

  it('does not touch comma expressions used as values', () => {
    expect(transform('const a = (1, 2, 3)')).toMatchInlineSnapshot(`"const a = (1, 2, 3);"`)
    expect(transform('return (a(), b())')).toMatchInlineSnapshot(`"return a(), b();"`)
  })

  it('does not touch sequence expressions in for-loop heads', () => {
    expect(transform('for (i = 0, j = 10; i < j; i++, j--) {}')).toMatchInlineSnapshot(
      `"for (i = 0, j = 10; i < j; i++, j--) {}"`,
    )
  })

  it('splits inside a block', () => {
    expect(transform('if (x) { a(), b(), c() }')).toMatchInlineSnapshot(`
      "if (x) {
        a();
        b();
        c();
      }"
    `)
  })

  it('handles nested sequence expressions', () => {
    expect(transform('a(), (b(), c())')).toMatchInlineSnapshot(`
      "a();
      b();
      c();"
    `)
  })

  it('does not touch sequence in if-condition', () => {
    expect(transform('if ((a(), b())) { c() }')).toMatchInlineSnapshot(`
      "if (a(), b()) {
        c();
      }"
    `)
  })

  it('does not touch sequence in assignment rhs', () => {
    expect(transform('x = (a(), b())')).toMatchInlineSnapshot(`"x = (a(), b());"`)
  })

  it('does not touch sequence in call arguments', () => {
    expect(transform('f((a(), b()), c)')).toMatchInlineSnapshot(`"f((a(), b()), c);"`)
  })

  it('does not split comma-separated call arguments', () => {
    expect(transform('f(a, b, c)')).toMatchInlineSnapshot(`"f(a, b, c);"`)
  })

  it('does not touch sequence in arrow body', () => {
    expect(transform('const f = () => (a(), b())')).toMatchInlineSnapshot(
      `"const f = () => (a(), b());"`,
    )
  })

  it('splits sequence inside a switch case', () => {
    expect(transform('switch (x) { case 1: a(), b(); break }')).toMatchInlineSnapshot(`
      "switch (x) {
        case 1:
          a();
          b();
          break;
      }"
    `)
  })

  it('splits sequence inside a try block', () => {
    expect(transform('try { a(), b() } catch (e) {}')).toMatchInlineSnapshot(`
      "try {
        a();
        b();
      } catch (e) {}"
    `)
  })

  it('only splits the statement-position sequence among siblings', () => {
    expect(transform('a(); x = 1, y = 2; const z = (1, 2)')).toMatchInlineSnapshot(`
      "a();
      x = 1;
      y = 2;
      const z = (1, 2);"
    `)
  })
})
