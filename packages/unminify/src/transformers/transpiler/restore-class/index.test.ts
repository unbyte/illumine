import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import plugin from '.'

const transform = createTransform([plugin])

describe('create-class visitor', () => {
  it('converts basic class with constructor and one method', () => {
    expect(
      transform(`
        var Foo = c(
          function Foo() {
            h(this, Foo);
            this.x = 1;
          },
          [
            {
              key: "method",
              value: function() { return this.x; }
            }
          ]
        );
      `),
    ).toMatchInlineSnapshot(`
      "const Foo = class Foo {
        constructor() {
          this.x = 1;
        }
        method() {
          return this.x;
        }
      };"
    `)
  })

  it('converts class with static methods (third argument)', () => {
    expect(
      transform(`
        var Bar = c(
          function Bar() {
            h(this, Bar);
          },
          [
            {
              key: "instance",
              value: function() { return 1; }
            }
          ],
          [
            {
              key: "create",
              value: function() { return new Bar(); }
            }
          ]
        );
      `),
    ).toMatchInlineSnapshot(`
      "const Bar = class Bar {
        constructor() {}
        instance() {
          return 1;
        }
        static create() {
          return new Bar();
        }
      };"
    `)
  })

  it('converts class with getter/setter', () => {
    expect(
      transform(`
        var Baz = c(
          function Baz() {
            h(this, Baz);
            this._val = 0;
          },
          [
            {
              key: "val",
              get: function() { return this._val; },
              set: function(v) { this._val = v; }
            }
          ]
        );
      `),
    ).toMatchInlineSnapshot(`
      "const Baz = class Baz {
        constructor() {
          this._val = 0;
        }
        get val() {
          return this._val;
        }
        set val(v) {
          this._val = v;
        }
      };"
    `)
  })

  it('does not transform unrelated function call with 2 args', () => {
    expect(
      transform(`
        var result = someFunc(
          function() { return 1; },
          [1, 2, 3]
        );
      `),
    ).toMatchInlineSnapshot(`
      "var result = someFunc(function () {
        return 1;
      }, [1, 2, 3]);"
    `)
  })

  it('handles IIFE-wrapped variant', () => {
    expect(
      transform(`
        var Qux = (function() {
          return c(
            function Qux() {
              h(this, Qux);
              this.y = 2;
            },
            [
              {
                key: "run",
                value: function() { return this.y; }
              }
            ]
          );
        })();
      `),
    ).toMatchInlineSnapshot(`
      "const Qux = class Qux {
        constructor() {
          this.y = 2;
        }
        run() {
          return this.y;
        }
      };"
    `)
  })

  it('does not transform when second arg is not an array of {key, value} objects', () => {
    expect(
      transform(`
        var Foo = c(
          function Foo() {
            h(this, Foo);
          },
          [1, 2, 3]
        );
      `),
    ).toMatchInlineSnapshot(`
      "var Foo = c(function Foo() {
        h(this, Foo);
      }, [1, 2, 3]);"
    `)
  })

  it('does not transform a createClass-like call with only 1 argument', () => {
    expect(
      transform(`
        var Foo = c(
          function Foo() {
            h(this, Foo);
          }
        );
      `),
    ).toMatchInlineSnapshot(`
      "var Foo = c(function Foo() {
        h(this, Foo);
      });"
    `)
  })

  it('does not transform function expression without classCallCheck in body', () => {
    expect(
      transform(`
        var Foo = c(
          function Foo() {
            this.x = 1;
          },
          [
            {
              key: "method",
              value: function() { return this.x; }
            }
          ]
        );
      `),
    ).toMatchInlineSnapshot(`
      "var Foo = c(function Foo() {
        this.x = 1;
      }, [{
        key: "method",
        value: function () {
          return this.x;
        }
      }]);"
    `)
  })

  it('transforms anonymous constructor using variable name as class name', () => {
    expect(
      transform(`
        var Foo = c(
          function() {
            h(this, Foo);
          },
          [
            {
              key: "method",
              value: function() { return 1; }
            }
          ]
        );
      `),
    ).toMatchInlineSnapshot(`
      "const Foo = class Foo {
        constructor() {}
        method() {
          return 1;
        }
      };"
    `)
  })
})
