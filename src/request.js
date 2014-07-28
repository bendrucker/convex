'use strict';

var join = require('url-join');

module.exports = function ($http, $q, convexConfig) {

  var ConvexRequest = function (config) {
    this.config = config;
    this.deferred = $q.defer();
  };

  ConvexRequest.prototype.url = function () {
    var c = this.config;
    return c.url || join(c.base || convexConfig.base, c.path);
  };

  ConvexRequest.prototype.send = function () {
    return $http({
      method: this.config.method,
      url: this.url(),
      data: this.config.data
    });
  };

  ConvexRequest.prototype.then = function (success, failure) {
    return this.deferred.promise.then(success, failure);
  };

  ConvexRequest.prototype.catch = function (failure) {
    return this.deferred.promise.catch(failure);
  };

  return ConvexRequest;

};