import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import plugin from '.'

const transform = createTransform([plugin])

describe('split-var-decl visitor', () => {
  it('splits a multi-declarator var into multiple statements', () => {
    expect(transform('var a = 1, b = 2, c = 3')).toMatchInlineSnapshot(`
      "var a = 1;
      var b = 2;
      var c = 3;"
    `)
  })

  it('splits a multi-declarator let', () => {
    expect(transform('let a = 1, b = 2')).toMatchInlineSnapshot(`
      "let a = 1;
      let b = 2;"
    `)
  })

  it('splits a multi-declarator const', () => {
    expect(transform('const a = 1, b = 2')).toMatchInlineSnapshot(`
      "const a = 1;
      const b = 2;"
    `)
  })

  it('preserves declarators without initializers', () => {
    expect(transform('var a, b = 2, c')).toMatchInlineSnapshot(`
      "var a;
      var b = 2;
      var c;"
    `)
  })

  it('does not touch single-declarator declarations', () => {
    expect(transform('var a = 1')).toMatchInlineSnapshot(`"var a = 1;"`)
    expect(transform('const a = 1')).toMatchInlineSnapshot(`"const a = 1;"`)
  })

  it('leaves for-init declarations alone', () => {
    expect(transform('for (var i = 0, j = 10; i < j; i++) {}')).toMatchInlineSnapshot(
      `"for (var i = 0, j = 10; i < j; i++) {}"`,
    )
    expect(transform('for (let i = 0, j = 10; i < j; i++) {}')).toMatchInlineSnapshot(
      `"for (let i = 0, j = 10; i < j; i++) {}"`,
    )
  })

  it('splits inside a block', () => {
    expect(transform('{ var a = 1, b = 2 }')).toMatchInlineSnapshot(`
      "{
        var a = 1;
        var b = 2;
      }"
    `)
  })

  it('splits inside a function body', () => {
    expect(transform('function f() { const a = 1, b = 2; return a + b }')).toMatchInlineSnapshot(`
      "function f() {
        const a = 1;
        const b = 2;
        return a + b;
      }"
    `)
  })

  it('preserves destructuring declarators', () => {
    expect(transform('const { a } = obj, [b] = arr')).toMatchInlineSnapshot(`
      "const {
        a
      } = obj;
      const [b] = arr;"
    `)
  })

  it('leaves for-in head alone', () => {
    expect(transform('for (var k in obj) {}')).toMatchInlineSnapshot(`"for (var k in obj) {}"`)
  })

  it('leaves for-of head alone', () => {
    expect(transform('for (const x of arr) {}')).toMatchInlineSnapshot(`"for (const x of arr) {}"`)
  })

  it('leaves single-statement if-body declarations alone', () => {
    expect(transform('if (x) var a = 1, b = 2')).toMatchInlineSnapshot(`
      "if (x) var a = 1,
        b = 2;"
    `)
  })

  it('leaves single-statement while-body declarations alone', () => {
    expect(transform('while (x) var a = 1, b = 2')).toMatchInlineSnapshot(`
      "while (x) var a = 1,
        b = 2;"
    `)
  })

  it('leaves labeled single-statement declarations alone', () => {
    expect(transform('outer: var a = 1, b = 2')).toMatchInlineSnapshot(`
      "outer: var a = 1,
        b = 2;"
    `)
  })

  it('splits at the top of a program', () => {
    expect(transform('var a = 1, b = 2')).toMatchInlineSnapshot(`
      "var a = 1;
      var b = 2;"
    `)
  })

  it('preserves initializer evaluation order', () => {
    expect(transform('var a = f(), b = a + 1, c = b * 2')).toMatchInlineSnapshot(`
      "var a = f();
      var b = a + 1;
      var c = b * 2;"
    `)
  })

  it('splits inside switch case body', () => {
    expect(transform('switch (x) { case 1: { let a = 1, b = 2; break } }')).toMatchInlineSnapshot(`
      "switch (x) {
        case 1:
          {
            let a = 1;
            let b = 2;
            break;
          }
      }"
    `)
  })

  it('splits exported variable declaration', () => {
    expect(transform('export const a = 1, b = 2')).toMatchInlineSnapshot(`
      "export const a = 1,
        b = 2;"
    `)
  })

  it('does not duplicate when declaration has only one declarator with no init', () => {
    expect(transform('var a')).toMatchInlineSnapshot(`"var a;"`)
  })

  it('handles mixed initialized and uninitialized in let', () => {
    expect(transform('let a, b = 2, c, d = 4')).toMatchInlineSnapshot(`
      "let a;
      let b = 2;
      let c;
      let d = 4;"
    `)
  })

  it('handles many declarators', () => {
    expect(transform('var a = 1, b = 2, c = 3, d = 4, e = 5')).toMatchInlineSnapshot(`
      "var a = 1;
      var b = 2;
      var c = 3;
      var d = 4;
      var e = 5;"
    `)
  })

  it('handles destructuring with default values', () => {
    expect(transform('const { a = 1 } = x, { b = 2 } = y')).toMatchInlineSnapshot(`
      "const {
        a = 1
      } = x;
      const {
        b = 2
      } = y;"
    `)
  })

  it('preserves rest patterns in destructuring', () => {
    expect(transform('const [a, ...rest] = arr, { x, ...others } = obj')).toMatchInlineSnapshot(`
      "const [a, ...rest] = arr;
      const {
        x,
        ...others
      } = obj;"
    `)
  })
})
