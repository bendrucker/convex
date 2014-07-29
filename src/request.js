'use strict';

var angular   = require('angular');
var join      = require('url-join');
var internals = {};

internals.config = function (input) {
  var output = angular.extend({}, input);
  output.method = (input.method || 'get').toUpperCase();
  return output;
};

module.exports = function ($http, $q, convexConfig) {

  var ConvexRequest = function (config) {
    this.config = internals.config(config);
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
    })
    .then(function (response) {
      return response.data;
    })
    .catch(function (err) {
      var e = new Error();
      var invalid = 'Invalid Response'
      e.statusCode = err.status;
      e.data = err.data || {};
      e.name = e.data.error || invalid;
      e.message = e.data.message || e.name;
      return $q.reject(e);
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