import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import plugin from '.'

const transform = createTransform([plugin])

describe('class-inherits visitor', () => {
  it('converts basic IIFE with inherits + constructor to class extends', () => {
    expect(
      transform(`
        var Child = (function(_Parent) {
          _inherits(Child, _Parent);
          function Child(x) {
            _classCallCheck(this, Child);
            var _this = _possibleConstructorReturn(this, _Parent.call(this, x));
            return _this;
          }
          return Child;
        })(Parent);
      `),
    ).toMatchInlineSnapshot(`
      "var Child = class Child extends Parent {
        constructor(x) {
          super(x);
        }
      };"
    `)
  })

  it('handles additional constructor body after super', () => {
    expect(
      transform(`
        var Child = (function(_Parent) {
          _inherits(Child, _Parent);
          function Child(x) {
            _classCallCheck(this, Child);
            var _this = _possibleConstructorReturn(this, _Parent.call(this, x));
            _this.x = x;
            _this.y = 42;
            return _this;
          }
          return Child;
        })(Parent);
      `),
    ).toMatchInlineSnapshot(`
      "var Child = class Child extends Parent {
        constructor(x) {
          super(x);
          this.x = x;
          this.y = 42;
        }
      };"
    `)
  })

  it('does not transform IIFE without inherits call', () => {
    expect(
      transform(`
        var Foo = (function(_Bar) {
          function Foo() {}
          return Foo;
        })(Bar);
      `),
    ).toMatchInlineSnapshot(`
      "var Foo = function (_Bar) {
        function Foo() {}
        return Foo;
      }(Bar);"
    `)
  })

  it('replaces _this references with this after possibleConstructorReturn', () => {
    expect(
      transform(`
        var Child = (function(_Parent) {
          _inherits(Child, _Parent);
          function Child(a, b) {
            _classCallCheck(this, Child);
            var _this = _possibleConstructorReturn(this, _Parent.call(this, a));
            _this.a = a;
            _this.b = b;
            _this.init();
            return _this;
          }
          return Child;
        })(Base);
      `),
    ).toMatchInlineSnapshot(`
      "var Child = class Child extends Base {
        constructor(a, b) {
          super(a);
          this.a = a;
          this.b = b;
          this.init();
        }
      };"
    `)
  })

  it('does not transform IIFE with inherits-like call but wrong arg count', () => {
    expect(
      transform(`
        var Child = (function(_Parent) {
          _inherits(Child);
          function Child() {}
          return Child;
        })(Parent);
      `),
    ).toMatchInlineSnapshot(`
      "var Child = function (_Parent) {
        _inherits(Child);
        function Child() {}
        return Child;
      }(Parent);"
    `)
  })

  it('does not transform IIFE with inherits but no constructor function inside', () => {
    expect(
      transform(`
        var Child = (function(_Parent) {
          _inherits(Child, _Parent);
          return { name: "Child" };
        })(Parent);
      `),
    ).toMatchInlineSnapshot(`
      "var Child = function (_Parent) {
        _inherits(Child, _Parent);
        return {
          name: "Child"
        };
      }(Parent);"
    `)
  })

  it('does not transform regular function call taking 2 args where first is a function (not IIFE)', () => {
    expect(
      transform(`
        var result = someFunc(function(_Parent) {
          _inherits(Child, _Parent);
          function Child() {}
          return Child;
        }, Parent);
      `),
    ).toMatchInlineSnapshot(`
      "var result = someFunc(function (_Parent) {
        _inherits(Child, _Parent);
        function Child() {}
        return Child;
      }, Parent);"
    `)
  })
})
