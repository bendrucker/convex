'use strict';

module.exports = function ($cacheFactory) {
  
  var ConvexCache = function (name) {
    this.$name = 'convex-' + name;
    this.$$cache = $cacheFactory(this.$name);
    ConvexCache.caches[name] = this;
  };

  ConvexCache.caches = {};

  ConvexCache.get = function (name) {
    return this.caches[name];
  };

  ConvexCache.prototype.put = function (key, value) {
    return this.$$cache.put(key, value);
  };

  ConvexCache.prototype.get = function (key) {
    return this.$$cache.get(key);
  };

  ConvexCache.prototype.remove = function (key) {
    return this.$$cache.remove(key);
  };

  ConvexCache.prototype.removeAll = function () {
    return this.$$cache.removeAll();
  };

  ConvexCache.prototype.destroy = function () {
    this.$$cache.destroy();
    delete ConvexCache.caches[this.$name];
  };

  return ConvexCache;

};