import { describe, expect, it } from 'vitest'
import { unminify } from '.'

describe('unminify', () => {
  it('reverses minifier tricks and formats the result', async () => {
    const code = 'var a=1,b=2;a&&f(b);var c=!0,d=void 0;if(0===a){g("\\x68i")}'
    expect(await unminify(code)).toMatchInlineSnapshot(`
      "var a = 1;
      var b = 2;
      if (a) {
        f(b);
      }
      var c = true;
      var d = undefined;
      if (a === 0) {
        g("hi");
      }
      "
    `)
  })
})
