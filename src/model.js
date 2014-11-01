'use strict';

var angular   = require('angular');
var uuid      = require('node-uuid');
var pick      = require('lodash.pick');

module.exports = function ($q, ConvexRequest, ConvexCache, ConvexBatch, ConvexRelation, ConvexCollection) {

  function ConvexModel (attributes) {
    // internals.relations(this, options);
    attributes = attributes || {};
    if (!attributes.id) {
      attributes.$$saved = false;
      attributes.id = uuid.v4();
    }
    else {
      attributes.$$saved = true;
    }
    var cached = this.$$cache.get(attributes.id);
    if (cached) {
      return cached.$set(attributes);
    }
    else {
      initializeRelations(this);
      this.$set(attributes);
      if (this.$initialize) this.$initialize();
      this.$$cache.put(this.id, this);
    }
  }

  function initializeRelations (model) {
    var relations = model.$$relations;
    if (relations) {
      for (var relation in relations) {
        relations[relation].initialize(model);
      }
    }
  }

  ConvexModel.prototype.$set = function (attributes) {
    var self = this;
    var properties = Object.keys(attributes || {}).reduce(function (acc, key) {
      if (self.$$relations && self.$$relations[key]) {
        acc.related.push(key);
      }
      else if (/_id$/.test(key)) {
        acc.foreignKeys.push(key);
      }
      else {
        acc.data.push(key);
      }
      return acc;
    },
    {
      data: [],
      foreignKeys: [],
      related: []
    });
    angular.extend(this, pick(attributes, properties.foreignKeys));
    angular.extend(this, pick(attributes, properties.data));
    properties.related.forEach(function (property) {
      var relation = self.$$relations[property];
      var key = relation.key;
      var relatedData = attributes[property];
      if (self[key]) {
        self[key].$set(relatedData);
      }
      else {
        self[key] = new relation.target(relatedData);
      }
    }, this);
    return this;
  };

  ConvexModel.extend = function (proto, ctor) {
    var Parent = this;
    var Child = function () {
      return Parent.apply(this, arguments);
    };
    proto = proto || {};
    ctor = ctor || {};
    Child.prototype = Object.create(Parent.prototype);
    angular.extend(Child.prototype, proto);
    angular.extend(Child, Parent);
    angular.extend(Child, ctor);

    if (!proto.name) throw new Error('All models must have a name');
    Child.prototype.$name = proto.name;
    delete Child.prototype.name;
    Child.prototype.$$cache = new ConvexCache(proto.name);
    Child.prototype.$$relations = {};

    return Child;
  };

  function plural (model) {
    return model.$plural || model.$name + 's';
  }

  ConvexModel.prototype.$path = function (id) {
    var path = '/' + plural(this);
    if (id) path += ('/' + id);
    return path;
  };

  ConvexModel.prototype.$reset = function () {
    for (var property in this) {
      if (this.hasOwnProperty(property)) delete this[property];
    }
    return this;
  };

  ConvexModel.prototype.toJSON = function () {
    var data = angular.copy(this, {});
    for (var relation in this.$$relations) {
      delete data[relation];
    }
    for (var key in data) {
      if (!this.hasOwnProperty(key)) delete data[key];
    }
    return data;
  };

  ConvexModel.prototype.$request = function (defaults, overrides) {
    defaults = defaults || {};
    overrides = overrides || {};
    defaults.params = defaults.params || {};
    if (overrides.expand) {
      defaults.params.expand = overrides.expand;
    }
    var config = angular.extend(defaults, overrides);
    var request = new ConvexRequest(config);
    if (config.batch) {
      config.batch.add(request);
    }
    else {
      request.send();
    }
    return request;
  };

  ConvexModel.prototype.$fetch = function (options) {
    var model = this;
    if (!this.$$saved) return $q.when(this);
    return this.$request({
      method: 'get',
      path: this.$path(this.id)
    }, options)
    .then(function (response) {
      return model.$set(response);
    });
  };

  ConvexModel.prototype.$save = function (options) {
    var model = this;
    return this.$request({
      method: this.$$saved ? 'put' : 'post',
      path: this.$$saved ? this.$path(this.id) : this.$path(),
      data: this
    }, options)
    .then(function (response) {
      model.$$saved = true;
      return model.$set(response);
    });
  };

  ConvexModel.prototype.$delete = function (options) {
    var model = this;
    return $q.when()
      .then(function () {
        if (model.$$saved) {
          return model.$request({
            method: 'delete',
            path: model.$path(model.id)
          }, options);
        }
      })
      .then(function () {
        model.$$cache.remove(model.id);
        model.$reset();
        model.$$saved = false;
        model.$deleted = true;
      });
  };

  ConvexModel.prototype.$batch = function (callback) {
    var batch = new ConvexBatch();
    callback.call(this, batch);
    return batch.process();
  };

  function query (Model, attributes, options) {
    return Model.prototype.$request({
      method: 'get',
      path: Model.prototype.$path(),
      params: attributes
    }, options);
  }

  ConvexModel.$where = function (attributes, options) {
    var Model = this;
    return query(this, attributes, options)
      .then(function (data) {
        return new ConvexCollection(Model, data);
      });
  };

  ConvexModel.$all = function (options) {
    return this.$where(null, options);
  };

  ConvexModel.belongsTo = function (Target) {
    var relation = new ConvexRelation('belongsTo', Target);
    this.prototype.$$relations[relation.key] = relation;
    return this;
  };

  ConvexModel.hasMany = function (Target) {
    var relation = new ConvexRelation('hasMany', Target);
    this.prototype.$$relations[relation.key] = relation;
    return this;
  };

  return ConvexModel;

};

module.exports.$inject = [
  '$q',
  'ConvexRequest',
  'ConvexCache',
  'ConvexBatch',
  'ConvexRelation',
  'ConvexCollection'
];
