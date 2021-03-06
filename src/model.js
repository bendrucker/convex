'use strict';

var angular = require('angular');
var uuid    = require('uuid');

module.exports = function ($q, ConvexRequest, ConvexCache, ConvexBatch, ConvexRelation, ConvexCollection) {

  function ConvexModel (attributes) {
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
      this.id = attributes.id;
      var relations = this.$$relations;
      Object.keys(relations).forEach(function (relation) {
        relations[relation].initialize(this);
      }, this);
      this.$set(attributes);
      if (this.$initialize) this.$initialize();
      this.$$cache.put(this.id, this);
    }
  }

  function isForeignKey (key) {
    return (/_id$/).test(key);
  }

  function hasRelation (model, key) {
    return model.$$relations[key];
  }

  ConvexModel.prototype.$set = function (attributes) {
    var model = this;
    Object.keys(attributes)
      .filter(function (key) {
        if (isForeignKey(key) || !hasRelation(model, key)) {
          model[key] = attributes[key];
        }
        else {
          return true;
        }
      })
      .map(function (key) {
        return model.$$relations[key];
      })
      .forEach(function (relation) {
        var key = relation.key;
        var data = attributes[key];
        if (model[key] && model[key].$set) {
          model[key].$set(data);
        }
        else if (model[key] && model[key].$push) {
          var target = model[key];
          target.$push.apply(target, data);
        }
        else {
          model[key] = new relation.target(data);
          if (relation.type === 'hasOne') {
            model[key][model.$name] = model;
          }
        }
      });
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

    if (!proto.$name) throw new Error('All models must have a name ($name)');
    Child.prototype.$plural = proto.$plural || proto.$name + 's';
    Child.prototype.$$cache = new ConvexCache(proto.$name);
    Child.prototype.$$relations = {};
    Child.prototype.constructor = Child;

    return Child;
  };

  ConvexModel.prototype.$path = function (withId) {
    var path = '/' + this.$plural;
    if (withId !== false) path += ('/' + this.id);
    return path;
  };

  ConvexModel.prototype.$reset = function () {
    for (var property in this) {
      if (this.hasOwnProperty(property)) this[property] = void 0;
    }
    return this;
  };

  ConvexModel.prototype.$clone = function () {
    var data = {};
    for (var property in this) {
      if (this.hasOwnProperty(property)) data[property] = this[property];
    }
    data.id = void 0;
    return new this.constructor(data);
  };

  ConvexModel.prototype.toJSON = function () {
    var data = {};
    for (var key in this) {
      if (key.charAt(0) !== '$' && !this.$$relations[key]) {
        data[key] = this[key];
      }
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
      path: this.$path(this.$$saved),
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
            path: model.$path()
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
    batch.return = callback.call(this, batch);
    return batch.process();
  };

  ConvexModel.$where = function (query, options) {
    return new ConvexCollection(this).$fetch(query, options);
  };

  ConvexModel.$all = function (options) {
    return this.$where(void 0, options);
  };

  ['belongsTo', 'hasOne', 'hasMany'].forEach(function (relationType) {
    ConvexModel[relationType] = function (Target, key, options) {
      this.prototype.$$relations[key] = new ConvexRelation(angular.extend({
        type: relationType,
        target: Target,
        key: key
      }, options));
      return this;
    };
  });

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
