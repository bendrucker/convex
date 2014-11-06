'use strict';

var angular = require('angular');

module.exports = function () {

  function ConvexCollection (Model, models) {
    this.$$model = Model;
    this.$$models = [];
    this.$$related = {};

    var proto = ConvexCollection.prototype;
    for (var m in proto) {
      this.$$models[m] = angular.bind(this, proto[m]);
    }
    this.$$models.$$model = this.$$model;

    if (models) this.$push.apply(this, models);
    
    return this.$$models;
  }

  ConvexCollection.prototype.$relate = function (name, model) {
    var relation = {};
    relation[name] = model;
    angular.extend(this.$$related, relation);
    return this;
  };

  ConvexCollection.prototype.$new = function (attributes) {
    if (attributes instanceof this.$$model) {
      return attributes.$set(this.$$related);
    }
    else {
      return new this.$$model(angular.extend({}, attributes, this.$$related)); 
    }
  };

  ConvexCollection.prototype.$push = function (model) {
    var models = Array.prototype.splice.call(arguments, 0)
        .map(function (attributes) {
          return this.$new(attributes);
        }, this);
    this.$$models.push.apply(this.$$models, models);
    return this.$$models;
  };

  ConvexCollection.prototype.$fetch = function (query, options) {
    var collection = this;
    var Model = this.$$model;
    return Model.prototype.$request({
      method: 'get',
      path: Model.prototype.$path(false),
      params: query
    }, options)
    .then(function (data) {
      collection.$push.apply(collection, data);
      return collection.$$models;
    });
  };

  return ConvexCollection;
  
};
