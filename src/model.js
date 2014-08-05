'use strict';

var angular           = require('angular');
var uuid              = require('node-uuid');
var collectionFactory = require('./collection');
var internals         = {};

module.exports = function ($q, ConvexRequest, ConvexCache, ConvexBatch, ConvexRelation) {

  internals.relations = function (model, options) {
    if (options && options.expand) {
      options.expand.forEach(model.$related, model);
    }
    return model;
  };

  var ConvexModel = function (attributes, options) {
    angular.extend(this, attributes);
    internals.relations(this, options);
    Object.defineProperties(this, {
      $saved: {
        enumerable: false,
        writable: true
      }
    });
    if (!this.id) {
      this.$saved = false;
      this.id = uuid.v4();
    }
    else {
      this.$saved = true;
    }
    var cached = this.$$cache.get(this.id);
    if (cached) {
      return angular.extend(cached, this);
    }
    else {
      if (this.$initialize) this.$initialize();
      this.$$cache.put(this.id, this);
    }
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
    if (!this.$saved) return $q.when(this);
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
      method: this.$saved ? 'put' : 'post',
      path: this.$saved ? this.$path(this.id) : this.$path(),
      data: this
    }, options)
    .then(function (response) {
      model.$saved = true;
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
        if (model.$saved) {
          return model.$request({
            method: 'delete',
            path: model.$path(model.id)
          }, options);
        }
      })
      .then(function () {
        model.$$cache.remove(model.id);
        model.$reset();
        model.$saved = false;
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

  internals.cast = function (Model, data, options) {
    return collectionFactory(Model).add(data, options);
  };

  ConvexModel.$where = function (attributes, options) {
    var Model = this;
    return internals.query(this, attributes, options)
      .then(function (data) {
        return internals.cast(Model, data, options);
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

  internals.relationStore = function (Model) {
    return Model.prototype.$$relations || (Model.prototype.$$relations = {});
  };

  ConvexModel.belongsTo = function (Target) {
    var relation = new ConvexRelation('belongsTo', Target);
    internals.relationStore(this)[relation.key] = relation;
    return this;
  };

  ConvexModel.hasMany = function (Target) {
    var relation = new ConvexRelation('hasMany', Target);
    internals.relationStore(this)[relation.key] = relation;
    return this;
  };

  ConvexModel.prototype.$related = function (name) {
    if (this[name] && (this[name] instanceof ConvexModel || this[name].isCollection)) {
      return this[name];
    } else {
      return (this[name] = this.$$relations[name].initialize(this));
    }
  };

  return ConvexModel;

};
