import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import plugin from '.'

const transform = createTransform([plugin])

describe('expand-control visitor', () => {
  describe('if statement', () => {
    it('extracts sequence expression from if test', () => {
      expect(transform('if (a(), b(), c) {}')).toMatchInlineSnapshot(`
        "a();
        b();
        if (c) {}"
      `)
    })

    it('handles two-element sequence in if test', () => {
      expect(transform('if (a(), b) {}')).toMatchInlineSnapshot(`
        "a();
        if (b) {}"
      `)
    })

    it('preserves if-else structure', () => {
      expect(transform('if (a(), b) { x() } else { y() }')).toMatchInlineSnapshot(`
        "a();
        if (b) {
          x();
        } else {
          y();
        }"
      `)
    })

    it('does not touch if without sequence expression', () => {
      expect(transform('if (a) { b() }')).toMatchInlineSnapshot(`
        "if (a) {
          b();
        }"
      `)
    })

    it('handles sequence in else-if', () => {
      expect(transform('if (a) {} else if (b(), c) {}')).toMatchInlineSnapshot(`
        "if (a) {} else {
          b();
          if (c) {}
        }"
      `)
    })

    it('handles nested sequence in last position', () => {
      expect(transform('if (a(), (b(), c)) {}')).toMatchInlineSnapshot(`
        "a();
        if (b(), c) {}"
      `)
    })
  })

  describe('for statement', () => {
    it('extracts sequence expression from for init', () => {
      expect(transform('for (a(), b(); i < n; i++) {}')).toMatchInlineSnapshot(`
        "a();
        b();
        for (; i < n; i++) {}"
      `)
    })

    it('extracts single expression from for init', () => {
      expect(transform('for (i = 0; i < n; i++) {}')).toMatchInlineSnapshot(`
        "i = 0;
        for (; i < n; i++) {}"
      `)
    })

    it('does not touch for with variable declaration', () => {
      expect(transform('for (var i = 0; i < n; i++) {}')).toMatchInlineSnapshot(
        `"for (var i = 0; i < n; i++) {}"`,
      )
    })

    it('does not touch for with no init', () => {
      expect(transform('for (; i < n; i++) {}')).toMatchInlineSnapshot(`"for (; i < n; i++) {}"`)
    })

    it('does not touch for with let declaration', () => {
      expect(transform('for (let i = 0; i < n; i++) {}')).toMatchInlineSnapshot(
        `"for (let i = 0; i < n; i++) {}"`,
      )
    })

    it('does not touch for with const declaration', () => {
      expect(transform('for (const x of items) {}')).toMatchInlineSnapshot(
        `"for (const x of items) {}"`,
      )
    })

    it('does not touch sequence in for update', () => {
      expect(transform('for (;; a(), b()) {}')).toMatchInlineSnapshot(`"for (;; a(), b()) {}"`)
    })
  })

  describe('for-in statement', () => {
    it('extracts sequence expression from for-in right', () => {
      expect(transform('for (n in a(), b(), obj) {}')).toMatchInlineSnapshot(`
        "a();
        b();
        for (n in obj) {}"
      `)
    })

    it('handles two-element sequence in for-in right', () => {
      expect(transform('for (n in a(), obj) {}')).toMatchInlineSnapshot(`
        "a();
        for (n in obj) {}"
      `)
    })

    it('does not touch for-in without sequence expression', () => {
      expect(transform('for (n in obj) {}')).toMatchInlineSnapshot(`"for (n in obj) {}"`)
    })

    it('handles variable declaration in left', () => {
      expect(transform('for (var n in a(), obj) {}')).toMatchInlineSnapshot(`
        "a();
        for (var n in obj) {}"
      `)
    })
  })

  describe('for-of statement', () => {
    it('extracts sequence expression from for-of right', () => {
      expect(transform('for (x of (a(), b(), arr)) {}')).toMatchInlineSnapshot(`
        "a();
        b();
        for (x of arr) {}"
      `)
    })

    it('handles two-element sequence in for-of right', () => {
      expect(transform('for (x of (a(), arr)) {}')).toMatchInlineSnapshot(`
        "a();
        for (x of arr) {}"
      `)
    })

    it('does not touch for-of without sequence expression', () => {
      expect(transform('for (x of arr) {}')).toMatchInlineSnapshot(`"for (x of arr) {}"`)
    })
  })

  describe('switch statement', () => {
    it('extracts sequence expression from switch discriminant', () => {
      expect(transform('switch (a(), b(), x) { case 1: break }')).toMatchInlineSnapshot(`
        "a();
        b();
        switch (x) {
          case 1:
            break;
        }"
      `)
    })

    it('handles two-element sequence in switch discriminant', () => {
      expect(transform('switch (a(), x) { case 1: break }')).toMatchInlineSnapshot(`
        "a();
        switch (x) {
          case 1:
            break;
        }"
      `)
    })

    it('does not touch switch without sequence expression', () => {
      expect(transform('switch (x) { case 1: break }')).toMatchInlineSnapshot(`
        "switch (x) {
          case 1:
            break;
        }"
      `)
    })
  })

  describe('do-while statement', () => {
    it('extracts sequence expression from do-while test', () => {
      expect(transform('do { x() } while (a(), b(), c)')).toMatchInlineSnapshot(`
        "do {
          x();
          a();
          b();
        } while (c);"
      `)
    })

    it('handles two-element sequence in do-while test', () => {
      expect(transform('do { x() } while (a(), c)')).toMatchInlineSnapshot(`
        "do {
          x();
          a();
        } while (c);"
      `)
    })

    it('handles do-while with non-block body', () => {
      expect(transform('do x(); while (a(), c)')).toMatchInlineSnapshot(`
        "do {
          x();
          a();
        } while (c);"
      `)
    })

    it('does not touch do-while without sequence expression', () => {
      expect(transform('do { x() } while (c)')).toMatchInlineSnapshot(`
        "do {
          x();
        } while (c);"
      `)
    })
  })
})
