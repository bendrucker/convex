'use strict';

var angular = require('angular');

module.exports = function ($http, modelCacheFactory) {

  var internals = {};

  var BaseModel = function (attributes) {
    angular.extend(this, attributes);
    return internals.cached(this);
  };

  BaseModel.extend = function (proto, ctor) {
    var Parent = this;
    var Child = function () {
      return Parent.apply(this, arguments);
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
    Model.prototype.cache = modelCacheFactory(Model.prototype.name);
  };

  internals.cached = function (model) {
    var cached = model.cache.get(model.id);
    return cached ? angular.extend(cached, model) : model.cache.put(model.id, model);
  };

  BaseModel.prototype.isNew = function () {
    return (typeof this.id == 'undefined' || this.id == null);
  };

  BaseModel.prototype.url = function () {
    var base = this.baseURL + '/' + this.name;
    return this.isNew() ? base : base + '/' + this.id;
  };

  return BaseModel;

};