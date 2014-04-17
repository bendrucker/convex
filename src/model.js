'use strict';

var angular = require('angular');

module.exports = function ($http, $q, modelCacheFactory) {

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

    if (!Child.prototype.objectName) throw new Error('All Models must have a name');
    internals.createCache(Child);

    return Child;
  };

  internals.createCache = function (Model) {
    Model.prototype.cache = modelCacheFactory(Model.prototype.objectName);
  };

  internals.cached = function (model) {
    var cached = model.cache.get(model.id);
    return cached ? angular.extend(cached, model) : model.cache.put(model.id, model);
  };

  BaseModel.prototype.isNew = function () {
    return (typeof this.id == 'undefined' || this.id === null);
  };

  BaseModel.prototype.url = function () {
    var base = this.baseURL + '/' + this.objectName;
    return this.isNew() ? base : base + '/' + this.id;
  };

  internals.disallowNew = function (model) {
    return $q
      .when()
      .then(function () {
        if (model.isNew()) return $q.reject('Instance method called on a new model');
      });
  };

  BaseModel.prototype.fetch = function (options) {
    var model = this;
    return internals.disallowNew(this)
      .then(function () {
        return $http.get(model.url(), options);
      })
      .then(function (response) {
        return angular.extend(model, response.data);
      });
  };

  internals.saveMethod = function (model) {
    return model.isNew() ? 'post' : 'put';
  };

  BaseModel.prototype.save = function (options) {
    var model = this;
    return $http[internals.saveMethod(this)](this.url(), model, options)
      .then(function (response) {
        return angular.extend(model, response.data);
      });
  };

  return BaseModel;

};