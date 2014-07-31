'use strict';

var angular = require('angular');

module.exports = function ($cacheFactory, $window, $q) {

  var prefix = 'convex-';
  var localStorage = $window.localStorage || {
    setItem: angular.noop,
    getItem: angular.noop,
    removeItem: angular.noop,
    clear: angular.noop
  };
  
  var ConvexCache = function (name) {
    this.$name = prefix + name;
    this.$$cache = $cacheFactory(this.$name);
  };

  ConvexCache.prototype.put = function (key, value) {
    return this.$$cache.put(key, value);
  };

  ConvexCache.prototype.get = function (key) {
    return this.$$cache.get(key);
  };

  ConvexCache.prototype.persist = function (key, value) {
    localStorage.setItem(prefix + key, angular.toJson(value));
    return $q.when(value);
  };

  ConvexCache.prototype.fetch = function (key) {
    return $q.when(angular.fromJson(localStorage.getItem(prefix + key)));
  };

  ConvexCache.prototype.remove = function (key) {
    localStorage.removeItem(prefix + key);
    this.$$cache.remove(key);
  };

  ConvexCache.prototype.removeAll = function () {
    Object.keys(localStorage)
      .filter(function (key) {
        return key.match(new RegExp('^' + prefix));
      })
      .forEach(function (key) {
        localStorage.removeItem(key);
      });
    return this.$$cache.removeAll();  
  };

  ConvexCache.prototype.destroy = function () {
    this.removeAll();
    return this.$$cache.destroy();
  };

  return ConvexCache;

};
