import { createTransform } from '@illumine/test-utils'
import { describe, expect, it } from 'vitest'
import plugin from '.'

const transform = createTransform([plugin])

describe('webpack visitor', () => {
  it('renames webpack 5 runtime symbols', () => {
    expect(
      transform(`
(()=>{
  var e = {
    "./src/a.js": function(e, t, n) { t.foo = 1 },
    "./src/b.js": function(e, t, n) { t.bar = n("./src/a.js") }
  };
  var t = {};
  function n(r) {
    if (t[r] !== undefined) return t[r].exports;
    var i = t[r] = { exports: {} };
    e[r](i, i.exports, n);
    return i.exports;
  }
  n.d = function(e, t) {};
  var r = n("./src/b.js");
})()
`),
    ).toMatchInlineSnapshot(`
      "(() => {
        var __webpack_modules__ = {
          "./src/a.js": function (module, exports, __webpack_require__) {
            exports.foo = 1;
          },
          "./src/b.js": function (module, exports, __webpack_require__) {
            exports.bar = __webpack_require__("./src/a.js");
          }
        };
        var __webpack_module_cache__ = {};
        function __webpack_require__(r) {
          if (__webpack_module_cache__[r] !== undefined) return __webpack_module_cache__[r].exports;
          var i = __webpack_module_cache__[r] = {
            exports: {}
          };
          __webpack_modules__[r](i, i.exports, __webpack_require__);
          return i.exports;
        }
        __webpack_require__.d = function (e, t) {};
        var r = __webpack_require__("./src/b.js");
      })();"
    `)
  })

  it('renames webpack 4 IIFE runtime symbols', () => {
    expect(
      transform(`
(function(e) {
  var t = {};
  function n(r) {
    if (t[r]) return t[r].exports;
    var i = t[r] = { i: r, l: false, exports: {} };
    e[r].call(i.exports, i, i.exports, n);
    i.l = true;
    return i.exports;
  }
  return n(n.s = 0);
})({
  0: function(e, t, n) { t.x = n(1) },
  1: function(e, t) { t.y = 42 }
})
`),
    ).toMatchInlineSnapshot(`
      "(function (__webpack_modules__) {
        var __webpack_module_cache__ = {};
        function __webpack_require__(r) {
          if (__webpack_module_cache__[r]) return __webpack_module_cache__[r].exports;
          var i = __webpack_module_cache__[r] = {
            i: r,
            l: false,
            exports: {}
          };
          __webpack_modules__[r].call(i.exports, i, i.exports, __webpack_require__);
          i.l = true;
          return i.exports;
        }
        return __webpack_require__(__webpack_require__.s = 0);
      })({
        0: function (module, exports, __webpack_require__) {
          exports.x = __webpack_require__(1);
        },
        1: function (module, exports) {
          exports.y = 42;
        }
      });"
    `)
  })

  it('handles already-named runtime (no-op)', () => {
    expect(
      transform(`
(function(__webpack_modules__) {
  var __webpack_module_cache__ = {};
  function __webpack_require__(moduleId) {
    if (__webpack_module_cache__[moduleId]) return __webpack_module_cache__[moduleId].exports;
    var module = __webpack_module_cache__[moduleId] = { exports: {} };
    __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
    return module.exports;
  }
})({})
`),
    ).toMatchInlineSnapshot(`
      "(function (__webpack_modules__) {
        var __webpack_module_cache__ = {};
        function __webpack_require__(moduleId) {
          if (__webpack_module_cache__[moduleId]) return __webpack_module_cache__[moduleId].exports;
          var module = __webpack_module_cache__[moduleId] = {
            exports: {}
          };
          __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
          return module.exports;
        }
      })({});"
    `)
  })

  it('does not rename non-webpack functions', () => {
    expect(
      transform(`
function loadModule(id) {
  return modules[id];
}
`),
    ).toMatchInlineSnapshot(`
      "function loadModule(id) {
        return modules[id];
      }"
    `)
  })

  it('handles nested webpack bundles', () => {
    expect(
      transform(`
(()=>{
  var e = {
    "./vendor.js": function(a, b, c) {
      (function(x) {
        var y = {};
        function z(id) {
          if (y[id] !== undefined) return y[id].exports;
          var m = y[id] = { exports: {} };
          x[id](m, m.exports, z);
          return m.exports;
        }
        z("./inner.js");
      })({
        "./inner.js": function(a, b, c) { b.val = 1 }
      })
    }
  };
  var t = {};
  function n(r) {
    if (t[r] !== undefined) return t[r].exports;
    var i = t[r] = { exports: {} };
    e[r](i, i.exports, n);
    return i.exports;
  }
  n("./vendor.js");
})()
`),
    ).toMatchInlineSnapshot(`
      "(() => {
        var __webpack_modules__ = {
          "./vendor.js": function (module, exports, __webpack_require__) {
            (function (__webpack_modules__) {
              var __webpack_module_cache__ = {};
              function __webpack_require__(id) {
                if (__webpack_module_cache__[id] !== undefined) return __webpack_module_cache__[id].exports;
                var m = __webpack_module_cache__[id] = {
                  exports: {}
                };
                __webpack_modules__[id](m, m.exports, __webpack_require__);
                return m.exports;
              }
              __webpack_require__("./inner.js");
            })({
              "./inner.js": function (module, exports, __webpack_require__) {
                exports.val = 1;
              }
            });
          }
        };
        var __webpack_module_cache__ = {};
        function __webpack_require__(r) {
          if (__webpack_module_cache__[r] !== undefined) return __webpack_module_cache__[r].exports;
          var i = __webpack_module_cache__[r] = {
            exports: {}
          };
          __webpack_modules__[r](i, i.exports, __webpack_require__);
          return i.exports;
        }
        __webpack_require__("./vendor.js");
      })();"
    `)
  })

  it('renames webpack 5 with numeric module IDs', () => {
    expect(
      transform(`
(()=>{
  var e = {
    0: function(e, t, n) { t.foo = 1 },
    1: function(e, t, n) { t.bar = n(0) }
  };
  var t = {};
  function n(r) {
    if (t[r] !== undefined) return t[r].exports;
    var i = t[r] = { exports: {} };
    e[r](i, i.exports, n);
    return i.exports;
  }
  n(1);
})()
`),
    ).toMatchInlineSnapshot(`
      "(() => {
        var __webpack_modules__ = {
          0: function (module, exports, __webpack_require__) {
            exports.foo = 1;
          },
          1: function (module, exports, __webpack_require__) {
            exports.bar = __webpack_require__(0);
          }
        };
        var __webpack_module_cache__ = {};
        function __webpack_require__(r) {
          if (__webpack_module_cache__[r] !== undefined) return __webpack_module_cache__[r].exports;
          var i = __webpack_module_cache__[r] = {
            exports: {}
          };
          __webpack_modules__[r](i, i.exports, __webpack_require__);
          return i.exports;
        }
        __webpack_require__(1);
      })();"
    `)
  })

  it('handles name collision in nested webpack runtime', () => {
    expect(
      transform(`
(()=>{
  var e = {
    "./app.js": function(e, t, n) {
      var __webpack_require__ = "shadowed";
      (function(x) {
        var y = {};
        function z(id) {
          if (y[id] !== undefined) return y[id].exports;
          var m = y[id] = { exports: {} };
          x[id](m, m.exports, z);
          return m.exports;
        }
        z("./lib.js");
      })({
        "./lib.js": function(a, b, c) { b.ok = 1 }
      })
    }
  };
  var t = {};
  function n(r) {
    if (t[r] !== undefined) return t[r].exports;
    var i = t[r] = { exports: {} };
    e[r](i, i.exports, n);
    return i.exports;
  }
  n("./app.js");
})()
`),
    ).toMatchInlineSnapshot(`
      "(() => {
        var __webpack_modules__ = {
          "./app.js": function (module, exports, __webpack_require__) {
            var __webpack_require__ = "shadowed";
            (function (__webpack_modules__) {
              var __webpack_module_cache__ = {};
              function __webpack_require__(id) {
                if (__webpack_module_cache__[id] !== undefined) return __webpack_module_cache__[id].exports;
                var m = __webpack_module_cache__[id] = {
                  exports: {}
                };
                __webpack_modules__[id](m, m.exports, __webpack_require__);
                return m.exports;
              }
              __webpack_require__("./lib.js");
            })({
              "./lib.js": function (module, exports, __webpack_require__) {
                exports.ok = 1;
              }
            });
          }
        };
        var __webpack_module_cache__ = {};
        function __webpack_require__(r) {
          if (__webpack_module_cache__[r] !== undefined) return __webpack_module_cache__[r].exports;
          var i = __webpack_module_cache__[r] = {
            exports: {}
          };
          __webpack_modules__[r](i, i.exports, __webpack_require__);
          return i.exports;
        }
        __webpack_require__("./app.js");
      })();"
    `)
  })

  it('rejects modules object with non-function values', () => {
    expect(
      transform(`
(()=>{
  var e = {
    "a": 123,
    "b": function(e, t, n) { t.bar = 1 }
  };
  var t = {};
  function n(r) {
    if (t[r] !== undefined) return t[r].exports;
    var i = t[r] = { exports: {} };
    e[r](i, i.exports, n);
    return i.exports;
  }
  n("b");
})()
`),
    ).toMatchInlineSnapshot(`
      "(() => {
        var e = {
          "a": 123,
          "b": function (e, t, n) {
            t.bar = 1;
          }
        };
        var t = {};
        function n(r) {
          if (t[r] !== undefined) return t[r].exports;
          var i = t[r] = {
            exports: {}
          };
          e[r](i, i.exports, n);
          return i.exports;
        }
        n("b");
      })();"
    `)
  })

  it('rejects modules object with mixed key types', () => {
    expect(
      transform(`
(()=>{
  var e = {
    0: function(e, t, n) { t.foo = 1 },
    "b": function(e, t, n) { t.bar = 1 }
  };
  var t = {};
  function n(r) {
    if (t[r] !== undefined) return t[r].exports;
    var i = t[r] = { exports: {} };
    e[r](i, i.exports, n);
    return i.exports;
  }
  n("b");
})()
`),
    ).toMatchInlineSnapshot(`
      "(() => {
        var e = {
          0: function (e, t, n) {
            t.foo = 1;
          },
          "b": function (e, t, n) {
            t.bar = 1;
          }
        };
        var t = {};
        function n(r) {
          if (t[r] !== undefined) return t[r].exports;
          var i = t[r] = {
            exports: {}
          };
          e[r](i, i.exports, n);
          return i.exports;
        }
        n("b");
      })();"
    `)
  })

  it('rejects modules object with functions having > 3 params', () => {
    expect(
      transform(`
(()=>{
  var e = {
    "a": function(e, t, n, extra) { t.foo = 1 }
  };
  var t = {};
  function n(r) {
    if (t[r] !== undefined) return t[r].exports;
    var i = t[r] = { exports: {} };
    e[r](i, i.exports, n);
    return i.exports;
  }
  n("a");
})()
`),
    ).toMatchInlineSnapshot(`
      "(() => {
        var e = {
          "a": function (e, t, n, extra) {
            t.foo = 1;
          }
        };
        var t = {};
        function n(r) {
          if (t[r] !== undefined) return t[r].exports;
          var i = t[r] = {
            exports: {}
          };
          e[r](i, i.exports, n);
          return i.exports;
        }
        n("a");
      })();"
    `)
  })

  it('handles real-world webpack 5 with indirect cache lookup', () => {
    expect(
      transform(`
(() => {
  var e = {
    1: (e, t, r) => {
      "use strict";
      r(8173);
    }
  };
  var t = {};
  function r(n) {
    var a = t[n];
    if (undefined !== a) return a.exports;
    var o = t[n] = {
      exports: {}
    };
    e[n].call(o.exports, o, o.exports, r);
    return o.exports;
  }
  r.n = e => {
    var t = e && e.__esModule ? () => e.default : () => e;
    return t;
  };
  r.d = (e, t) => {
    for (var n in t) r.o(t, n);
  };
  r.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t);
  var n = r(1);
})()
`),
    ).toMatchInlineSnapshot(`
      "(() => {
        var __webpack_modules__ = {
          1: (module, exports, __webpack_require__) => {
            "use strict";

            __webpack_require__(8173);
          }
        };
        var __webpack_module_cache__ = {};
        function __webpack_require__(n) {
          var a = __webpack_module_cache__[n];
          if (undefined !== a) return a.exports;
          var o = __webpack_module_cache__[n] = {
            exports: {}
          };
          __webpack_modules__[n].call(o.exports, o, o.exports, __webpack_require__);
          return o.exports;
        }
        __webpack_require__.n = e => {
          var t = e && e.__esModule ? () => e.default : () => e;
          return t;
        };
        __webpack_require__.d = (e, t) => {
          for (var n in t) __webpack_require__.o(t, n);
        };
        __webpack_require__.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t);
        var n = __webpack_require__(1);
      })();"
    `)
  })
})
