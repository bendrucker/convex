'use strict';

var angular           = require('angular');
var uuid              = require('node-uuid');
var internals         = {};

module.exports = function ($q, ConvexRequest, ConvexCache, ConvexBatch, ConvexRelation, ConvexCollection) {

  internals.depth = function (string) {
    return (string.match(/\./g) || []).length;
  };

  internals.relation = function (base, relation) {
    var parent = base;
    for (var i = 0; i < relation.depth - 1; i++) {
      var child = relation.segments[i];
      parent = parent.$related(child);
    }
  };

  internals.relations = function (model, options) {
    if (options && options.expand) {
      options.expand
        .map(function (relation) {
          var segments = relation.split('.');
          return {
            accessor: relation,
            depth: segments.length + 1,
            segments: segments
          };
        })
        .sort(function ($1, $2) {
          var diff = $2.depth - $1.depth;
          if (diff === 0) return 0;
          if (diff < 0) return -1;
          if (diff > 0) return 1;
        })
        .forEach(angular.bind(null, internals.relation, model));
    }
    return model;
  };

  function ConvexModel (attributes, options) {
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
      this.$set(attributes);
      if (this.$initialize) this.$initialize();
      this.$$cache.put(this.id, this);
    }
  }

  ConvexModel.prototype.$set = function (attributes) {
    return angular.extend(this, attributes);
  };

  ConvexModel.$new = function (proto, ctor) {
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

    return Child;
  };

  internals.plural = function (model) {
    return model.$plural || model.$name + 's';
  };

  ConvexModel.prototype.$path = function (id) {
    var path = '/' + internals.plural(this);
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
      return angular.extend(model, response);
    })
    .then(function (model) {
      return internals.relations(model, options);
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
      return angular.extend(model, response);
    })
    .then(function (model) {
      return internals.relations(model, options);
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

  internals.query = function (Model, attributes, options) {
    return Model.prototype.$request({
      method: 'get',
      path: Model.prototype.$path(),
      params: attributes
    }, options);
  };

  internals.cast = function (Model, data) {
    var collection = new ConvexCollection(Model);
    collection.$push.apply(collection, data);
    return collection;
  };

  ConvexModel.$where = function (attributes, options) {
    var Model = this;
    return internals.query(this, attributes, options)
      .then(function (data) {
        return internals.cast(Model, data);
      });
  };

  ConvexModel.$find = function (attributes, options) {
    var Model = this;
    return internals.query(this, attributes, options)
      .then(function (data) {
        return data.length ? data[0] : $q.reject('Not found');
      })
      .then(function (data) {
        return new Model(data, options);
      });
  };

  ConvexModel.$all = function (options) {
    return this.$where(null, options);
  };

  function relations () {
    return this.prototype.$$relations || (this.prototype.$$relations = {});
  }

  ConvexModel.belongsTo = function (Target) {
    var relation = new ConvexRelation('belongsTo', Target);
    relations.call(this)[relation.key] = relation;
    return this;
  };

  ConvexModel.hasMany = function (Target) {
    var relation = new ConvexRelation('hasMany', Target);
    relations.call(this)[relation.key] = relation;
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
