'use strict';

var angular    = require('angular');

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
    var base = this.baseURL + '/' + this.objectName;
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

  BaseModel.prototype.save = function (options) {
    var model = this;
    var isNew = this.isNew();
    return $http[isNew ? 'post' : 'put'](this.url(), model, options)
      .then(function (response) {
        return angular.extend(model, response.data);
      })
      .then(function (model) {
        if (isNew) model.cache.put(model.id, model);
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

  internals.query = function (Model, attributes) {
    return $http
      .get(Model.prototype.url(), {
        params: attributes
      })
      .then(function (response) {
        return response.data;
      });
  };

  internals.cast = function (Model, data) {
    if (!data) return;
    if (angular.isArray(data)) {
      return data.map(function (object) {
        return new Model(object);
      });
    } else {
      return new Model(data);
    }
  };

  BaseModel.where = function (attributes) {
    var Model = this;
    return internals.query(this, attributes)
      .then(function (data) {
        return internals.cast(Model, data);
      });
  };

  BaseModel.find = function (attributes) {
    var Model = this;
    return internals.query(this, attributes)
      .then(function (data) {
        return data.length ? data[0] : void 0;
      })
      .then(function (data) {
        return internals.cast(Model, data);
      });

  };

  BaseModel.all = function () {
    return this.where();
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