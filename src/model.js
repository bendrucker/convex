'use strict';

var angular           = require('angular');
var uuid              = require('node-uuid');
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
    Object.defineProperty(this, 'saved', {
      enumerable: false,
      writable: true
    })
    if (!this.id) {
      this.saved = false;
      this.id = uuid.v4();
    }
    else {
      this.saved = true;
    }
    var cached = this.cache.get(this.id);
    if (cached) {
      return angular.extend(cached, this);
    }
    else {
      if (this.initialize) this.initialize();
      this.cache.put(this.id, this);
    }
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

  BaseModel.prototype.baseURL = this.baseURL;

  BaseModel.prototype.url = function () {
    var base = this.baseURL + '/' + pluralize(this.objectName);
    return this.saved ? base + '/' + this.id : base;
  };

  BaseModel.prototype.reset = function () {
    for (var property in this) {
      if (this.hasOwnProperty(property)) delete this[property];
    }
    return this;
  };

  internals.options = function (options) {
    options = options || {};
    options.params = options.params || {};
    options.params.expand = options.withRelated;
    return options;
  };

  internals.data = function (model) {
    var data = angular.copy(model);
    var relations = Object.keys(model.relations || {});
    relations.forEach(function (relation) {
      delete data[relation];
    });
    for (var key in data) {
      if (!model.hasOwnProperty(key)) delete data[key];
    }
    return data;
  };

  BaseModel.prototype.toJSON = function () {
    return internals.data(this);
  };

  BaseModel.prototype.fetch = function (options) {
    var model = this;
    options = internals.options(options);
    if (!this.saved) return $q.when(this);
    return $http.get(model.url(), options)
      .then(function (response) {
        return angular.extend(model, response.data);
      })
      .then(function (model) {
        return internals.relations(model, options);
      });
  };

  BaseModel.prototype.save = function (options) {
    var model = this;
    options = internals.options(options);
    var method = this.saved ? 'put' : 'post';
    options = internals.options(options);
    return $http[method](this.url(), this, options)
      .then(function (response) {
        return angular.extend(model, response.data);
      })
      .then(function (model) {
        return internals.relations(model, options);
      });
  };

  BaseModel.prototype.delete = function (options) {
    var model = this;
    return $q.when()
      .then(function () {
        if (model.saved) return $http.delete(model.url(), options);
      })
      .then(function () {
        model.cache.remove(model.id);
        model.saved = false;
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
