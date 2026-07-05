import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import plugin from '.'

const transform = createTransform([plugin])

describe('remove-license visitor', () => {
  it('removes leading license comments', () => {
    expect(
      transform(`
/*! License: MIT */
var a = 1;
`),
    ).toMatchInlineSnapshot(`"var a = 1;"`)
  })

  it('removes trailing license comments', () => {
    expect(
      transform(`
var a = 1; /*! (c) someone */
`),
    ).toMatchInlineSnapshot(`"var a = 1;"`)
  })

  it('keeps normal block comments', () => {
    expect(
      transform(`
/* keep me */
var a = 1;
`),
    ).toMatchInlineSnapshot(`
      "/* keep me */
      var a = 1;"
    `)
  })

  it('keeps line comments', () => {
    expect(
      transform(`
//! not a block comment
var a = 1;
`),
    ).toMatchInlineSnapshot(`
      "//! not a block comment
      var a = 1;"
    `)
  })

  it('removes only license comments when mixed', () => {
    expect(
      transform(`
/*! License */
/* keep */
var a = 1;
`),
    ).toMatchInlineSnapshot(`
      "/* keep */
      var a = 1;"
    `)
  })
})
