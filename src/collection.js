'use strict';

var angular = require('angular');

module.exports = function () {

  function ConvexCollection (Model, models) {
    this.$$model = Model;
    this.$$models = [];
    this.$$attributes = {};

    var proto = ConvexCollection.prototype;
    for (var m in proto) {
      this.$$models[m] = angular.bind(this, proto[m]);
    }
    this.$$models.$$model = this.$$model;

    if (models) this.$push.apply(this, models);
    
    return this.$$models;
  }

  ConvexCollection.prototype.$attributes = function (attributes) {
    if (typeof attributes !== 'undefined') {
      this.$$attributes = attributes;
    }
    return this.$$attributes;
  };

  ConvexCollection.prototype.$push = function (model) {
    var models = Array.prototype.splice.call(arguments, 0)
        .map(function (data) {
          data = angular.extend({}, data, this.$$attributes);
          return data instanceof this.$$model ? data : new this.$$model(data);
        }, this);
    this.$$models.push.apply(this.$$models, models);
    return this.$$models;
  };

  ConvexCollection.prototype.$fetch = function (query, options) {
    var collection = this;
    var Model = this.$$model;
    return Model.prototype.$request({
      method: 'get',
      path: Model.prototype.$path(),
      params: query
    }, options)
    .then(function (data) {
      collection.$push.apply(collection, data);
      return collection.$$models;
    });
  };

  return ConvexCollection;
  
};
