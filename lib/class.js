'use strict';

function type (arg) {
  var class2type = {};
  var toString = class2type.toString;
  var types = 'Boolean Number String Function Array Date RegExp Object Error'.split(' ');
  for (var i = 0; i < types.length; i++) {
    var typeItem = types[i];
    class2type['[object ' + typeItem + ']'] = typeItem.toLowerCase();
  }

  if (arg === null) {
    return arg + '';
  }

  return (typeof arg === 'object' || typeof arg === 'function') ?
    class2type[toString.call(arg)] || 'object' :
    typeof arg;
}

function isFunction (arg) {
  return type(arg) === 'function';
}

var initializing = false;
// 目的是为了检测Function.prototype.toString能否打印出函数内部信息
var fnTest = /xyz/.test(function() {var xyz;}) ? /\bsuper\b/ : /.*/;
var Class = function () {};

Class.extend = function class_extend (properties) {
  var _super = this.prototype;

  initializing = true;
  var subPrototype = new this();
  initializing = false;
  for (var prop in properties) {
    if (prop === 'statics') {
      var staticObj = properties[prop];
      for (var staticProp in staticObj) {
        Klass[staticProp] = staticObj[staticProp];
      }
    } else {
      if (isFunction(_super[prop]) &&
        isFunction(properties[prop]) &&
        fnTest.test(properties[prop])) {
        subPrototype[prop] = wrapper(_super, prop, properties[prop]);
      } else {
        subPrototype[prop] = properties[prop];
      }
    }
  }

  function wrapper (superObj, prop, fn) {
    return function () {
      this.super = superObj[prop];
      return fn.apply(this, arguments);
    };
  }

  function Klass () {
    if (!initializing && isFunction(this.construct)) {
      this.construct.apply(this, arguments);
    }
  }

  Klass.prototype = subPrototype;

  Klass.prototype.constructor = Klass;

  Klass.extend = class_extend;

  return Klass;

};

module.exports = Class;
