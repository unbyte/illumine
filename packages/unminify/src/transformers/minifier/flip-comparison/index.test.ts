import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import plugin from '.'

const transform = createTransform([plugin])

describe('flip-comparison visitor', () => {
  describe('typeof comparisons', () => {
    it('flips "string" == typeof x', () => {
      expect(transform('"string" == typeof x')).toMatchInlineSnapshot(`"typeof x === "string";"`)
    })

    it('flips "undefined" != typeof x', () => {
      expect(transform('"undefined" != typeof x')).toMatchInlineSnapshot(
        `"typeof x !== "undefined";"`,
      )
    })

    it('flips "function" === typeof x', () => {
      expect(transform('"function" === typeof x')).toMatchInlineSnapshot(
        `"typeof x === "function";"`,
      )
    })

    it('flips "object" !== typeof x', () => {
      expect(transform('"object" !== typeof x')).toMatchInlineSnapshot(`"typeof x !== "object";"`)
    })

    it('upgrades == to === when typeof is already on the left', () => {
      expect(transform('typeof x == "string"')).toMatchInlineSnapshot(`"typeof x === "string";"`)
    })

    it('upgrades != to !== when typeof is already on the left', () => {
      expect(transform('typeof x != "undefined"')).toMatchInlineSnapshot(
        `"typeof x !== "undefined";"`,
      )
    })

    it('leaves typeof === alone (already correct)', () => {
      expect(transform('typeof x === "string"')).toMatchInlineSnapshot(`"typeof x === "string";"`)
    })

    it('leaves typeof !== alone (already correct)', () => {
      expect(transform('typeof x !== "undefined"')).toMatchInlineSnapshot(
        `"typeof x !== "undefined";"`,
      )
    })

    it('handles typeof on member expression', () => {
      expect(transform('"function" == typeof obj.method')).toMatchInlineSnapshot(
        `"typeof obj.method === "function";"`,
      )
    })
  })

  describe('constant-on-left comparisons', () => {
    it('flips 0 === t', () => {
      expect(transform('0 === t')).toMatchInlineSnapshot(`"t === 0;"`)
    })

    it('flips -1 !== t.foo', () => {
      expect(transform('-1 !== t.foo')).toMatchInlineSnapshot(`"t.foo !== -1;"`)
    })

    it('flips null === e', () => {
      expect(transform('null === e')).toMatchInlineSnapshot(`"e === null;"`)
    })

    it('flips "foo" === bar', () => {
      expect(transform('"foo" === bar')).toMatchInlineSnapshot(`"bar === "foo";"`)
    })

    it('flips true === x', () => {
      expect(transform('true === x')).toMatchInlineSnapshot(`"x === true;"`)
    })

    it('flips false !== y', () => {
      expect(transform('false !== y')).toMatchInlineSnapshot(`"y !== false;"`)
    })

    it('does not flip == with non-typeof (null == x stays)', () => {
      expect(transform('null == x')).toMatchInlineSnapshot(`"null == x;"`)
    })

    it('does not flip != with non-typeof', () => {
      expect(transform('null != x')).toMatchInlineSnapshot(`"null != x;"`)
    })

    it('does not flip if both sides are literals', () => {
      expect(transform('"foo" === "bar"')).toMatchInlineSnapshot(`""foo" === "bar";"`)
    })

    it('does not flip if both sides are numeric literals', () => {
      expect(transform('0 === 1')).toMatchInlineSnapshot(`"0 === 1;"`)
    })

    it('does not flip if right side is already non-literal', () => {
      expect(transform('x === 0')).toMatchInlineSnapshot(`"x === 0;"`)
    })

    it('handles comparison in a larger expression', () => {
      expect(transform('if (null === x) y()')).toMatchInlineSnapshot(`"if (x === null) y();"`)
    })
  })
})
