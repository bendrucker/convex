'use strict';

var angular = require('angular');

module.exports = function () {

  function ConvexCollection (Model, models) {
    this.$$model = Model;
    this.$$models = [];

    var proto = ConvexCollection.prototype;
    for (var m in proto) {
      this.$$models[m] = angular.bind(this, proto[m]);
    }
    this.$$models.$$model = this.$$model;

    if (models) this.$push.apply(this, models);
    
    return this.$$models;
  }

  ConvexCollection.prototype.$relate = function (name, model) {
    this.$$parentKey = name;
    this.$$parent = model;
    return this;
  };

  ConvexCollection.prototype.$push = function (model) {
    var models = Array.prototype.splice.call(arguments, 0)
        .map(function (data) {
          return data instanceof this.$$model ? data : new this.$$model(data);
        }, this)
        .map(function (model) {
          var key = this.$$parentKey;
          if (!model[key]) model[key] = this.$$parent;
          return model;
        }, this)
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
