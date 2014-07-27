'use strict';

module.exports = function ($cacheFactory) {
  
  var ConvexCache = function (name) {
    this.$name = 'convex-' + name;
    this.$$cache = $cacheFactory(this.$name);
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
    return this.$$cache.destroy();
  };

  return ConvexCache;

};
