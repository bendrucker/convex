'use strict';

var angular           = require('angular');
var difference        = require('lodash.difference');
var pluralize         = require('pluralize');
var collectionFactory = require('./collection');

module.exports = function ($http, $q, ModelRelation, modelCacheFactory) {

  var internals = {};

  internals.relations = function (model, options) {
    if (options && options.withRelated) {
      options.withRelated.forEach(model.related, model);
    }
    return model;
  };

  var BaseModel = function (attributes, options) {
    angular.extend(this, attributes);
    internals.relations(this, options);
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
    if (cached) {
      return angular.extend(cached, model);
    } else if (!model.isNew()) {
      return model.cache.put(model.id, model);
    } else {
      return model;
    }
  };

  BaseModel.prototype.isNew = function () {
    return (typeof this.id === 'undefined' || this.id === null);
  };

  BaseModel.prototype.baseURL = 'https://api.valet.io';

  BaseModel.prototype.url = function () {
    var base = this.baseURL + '/' + pluralize(this.objectName);
    return this.isNew() ? base : base + '/' + this.id;
  };

  BaseModel.prototype.reset = function () {
    for (var property in this) {
      if (this.hasOwnProperty(property)) delete this[property];
    }
    return this;
  };

  internals.disallowNew = function (model) {
    return $q
      .when()
      .then(function () {
        if (model.isNew()) return $q.reject('Instance method called on a new model');
      });
  };

  internals.options = function (options) {
    options = options || {};
    options.params = options.params || {};
    options.params.expand = options.withRelated;
    return options;
  };

  BaseModel.prototype.fetch = function (options) {
    var model = this;
    options = internals.options(options);
    return internals.disallowNew(this)
      .then(function () {
        return $http.get(model.url(), options);
      })
      .then(function (response) {
        return angular.extend(model, response.data);
      })
      .then(function (model) {
        return internals.relations(model, options);
      });
  };

  internals.data = function (model, options) {
    var data = {};
    for (var property in model) {
      if (model.hasOwnProperty(property)) data[property] = model[property];
    }
    var relations = Object.keys(model.relations || {});
    difference(relations, options.withRelated).forEach(function (relation) {
      delete data[relation];
    });
    return data;
  };

  BaseModel.prototype.save = function (options) {
    var model = this;
    options = internals.options(options);
    var method = this.isNew() ? 'post' : 'put';
    options = internals.options(options);
    return $http[method](this.url(), internals.data(model, options), options)
      .then(function (response) {
        return angular.extend(model, response.data);
      })
      .then(function (model) {
        return internals.relations(model, options);
      })
      .then(function (model) {
        if (method === 'post') model.cache.put(model.id, model);
        return model;
      });
  };

  BaseModel.prototype.delete = function (options) {
    var model = this;
    var isNew = this.isNew();
    return $q.when()
      .then(function () {
        if (!isNew) return $http.delete(model.url(), options);
      })
      .then(function () {
        if (!isNew) model.cache.remove(model.id);
        model.reset();
        model.deleted = true;
      });
  };

  internals.query = function (Model, attributes, options) {
    angular.extend(options.params, attributes);
    return $http
      .get(Model.prototype.url(), options)
      .then(function (response) {
        return response.data;
      });
  };

  internals.cast = function (Model, data, options) {
    return collectionFactory(Model).add(data, options);
  };

  BaseModel.where = function (attributes, options) {
    var Model = this;
    options = internals.options(options);
    return internals.query(this, attributes, options)
      .then(function (data) {
        return internals.cast(Model, data, options);
      });
  };

  BaseModel.find = function (attributes, options) {
    var Model = this;
    options = internals.options(options);
    return internals.query(this, attributes, options)
      .then(function (data) {
        return data.length ? data[0] : $q.reject('Not found');
      })
      .then(function (data) {
        return new Model(data, options);
      });
  };

  BaseModel.all = function (options) {
    return this.where(null, options);
  };

  internals.relationStore = function (Model) {
    return Model.prototype.relations || (Model.prototype.relations = {});
  };

  BaseModel.belongsTo = function (Target) {
    var relation = new ModelRelation('belongsTo', Target);
    internals.relationStore(this)[relation.key] = relation;
    return this;
  };

  BaseModel.hasMany = function (Target) {
    var relation = new ModelRelation('hasMany', Target);
    internals.relationStore(this)[relation.key] = relation;
    return this;
  };

  BaseModel.prototype.related = function (name) {
    if (this[name] && (this[name] instanceof BaseModel || this[name].isCollection)) {
      return this[name];
    } else {
      return (this[name] = this.relations[name].initialize(this));
    }
  };

  return BaseModel;

};