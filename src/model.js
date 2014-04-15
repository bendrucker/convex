'use strict';

var angular = require('angular');

module.exports = function (modelCacheFactory) {

  var BaseModel = function (attributes) {
    angular.extend(this, attributes);
  };

  var internals = {};

  BaseModel.extend = function (proto, ctor) {
    var Parent = this;
    var Child = function () {
      Parent.apply(this, arguments);
    };
    Child.prototype = Object.create(Parent.prototype);
    angular.extend(Child.prototype, proto);
    angular.extend(Child, Parent);
    angular.extend(Child, ctor);

    if (!Child.prototype.name) throw new Error('All Models must have a name');
    internals.createCache(Child);

    return Child;
  };

  internals.createCache = function (Model) {
    Model.cache = modelCacheFactory(Model.prototype.name);
  };

  return BaseModel;

};