import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import plugin from '.'

const transform = createTransform([plugin])

describe('for-of-helper visitor', () => {
  it('converts basic for-of with simple body', () => {
    expect(
      transform(`
var _iterator = _createForOfIteratorHelper(arr), _step;
try {
  for (_iterator.s(); !(_step = _iterator.n()).done; ) {
    var x = _step.value;
    console.log(x);
  }
} catch (e) {
  _iterator.e(e);
} finally {
  _iterator.f();
}
`),
    ).toMatchInlineSnapshot(`
      "for (const x of arr) {
        console.log(x);
      }"
    `)
  })

  it('converts for-of with destructuring', () => {
    expect(
      transform(`
var _iterator = _createForOfIteratorHelper(items), _step;
try {
  for (_iterator.s(); !(_step = _iterator.n()).done; ) {
    var {a, b} = _step.value;
    process(a, b);
  }
} catch (err) {
  _iterator.e(err);
} finally {
  _iterator.f();
}
`),
    ).toMatchInlineSnapshot(`
      "for (const {
        a,
        b
      } of items) {
        process(a, b);
      }"
    `)
  })

  it('does not transform unrelated try/catch', () => {
    expect(
      transform(`
try {
  doSomething();
} catch (e) {
  handleError(e);
} finally {
  cleanup();
}
`),
    ).toMatchInlineSnapshot(`
      "try {
        doSomething();
      } catch (e) {
        handleError(e);
      } finally {
        cleanup();
      }"
    `)
  })

  it('removes the iterator variable declaration', () => {
    expect(
      transform(`
var _iterator = a(arr), _step;
try {
  for (_iterator.s(); !(_step = _iterator.n()).done; ) {
    var item = _step.value;
    use(item);
  }
} catch (e) {
  _iterator.e(e);
} finally {
  _iterator.f();
}
`),
    ).toMatchInlineSnapshot(`
      "for (const item of arr) {
        use(item);
      }"
    `)
  })

  it('does not transform when catch does not call .e() (partial match)', () => {
    expect(
      transform(`
var _iterator = helper(arr), _step;
try {
  for (_iterator.s(); !(_step = _iterator.n()).done; ) {
    var x = _step.value;
    console.log(x);
  }
} catch (e) {
  console.error(e);
} finally {
  _iterator.f();
}
`),
    ).toMatchInlineSnapshot(`
      "var _iterator = helper(arr),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var x = _step.value;
          console.log(x);
        }
      } catch (e) {
        console.error(e);
      } finally {
        _iterator.f();
      }"
    `)
  })

  it('does not transform when for loop has no .s() init (regular for inside try)', () => {
    expect(
      transform(`
var _iterator = helper(arr), _step;
try {
  for (var i = 0; !(_step = _iterator.n()).done; ) {
    var x = _step.value;
    console.log(x);
  }
} catch (e) {
  _iterator.e(e);
} finally {
  _iterator.f();
}
`),
    ).toMatchInlineSnapshot(`
      "var _iterator = helper(arr),
        _step;
      try {
        for (var i = 0; !(_step = _iterator.n()).done;) {
          var x = _step.value;
          console.log(x);
        }
      } catch (e) {
        _iterator.e(e);
      } finally {
        _iterator.f();
      }"
    `)
  })

  it('does not transform when for loop uses .next() instead of .n()', () => {
    expect(
      transform(`
var _iterator = helper(arr), _step;
try {
  for (_iterator.s(); !(_step = _iterator.next()).done; ) {
    var x = _step.value;
    console.log(x);
  }
} catch (e) {
  _iterator.e(e);
} finally {
  _iterator.f();
}
`),
    ).toMatchInlineSnapshot(`
      "var _iterator = helper(arr),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.next()).done;) {
          var x = _step.value;
          console.log(x);
        }
      } catch (e) {
        _iterator.e(e);
      } finally {
        _iterator.f();
      }"
    `)
  })

  it('does not transform when there is no preceding variable declaration for iterator', () => {
    expect(
      transform(`
try {
  for (_iterator.s(); !(_step = _iterator.n()).done; ) {
    var x = _step.value;
    console.log(x);
  }
} catch (e) {
  _iterator.e(e);
} finally {
  _iterator.f();
}
`),
    ).toMatchInlineSnapshot(`
      "try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var x = _step.value;
          console.log(x);
        }
      } catch (e) {
        _iterator.e(e);
      } finally {
        _iterator.f();
      }"
    `)
  })
})
