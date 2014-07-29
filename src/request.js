'use strict';

var angular   = require('angular');
var url       = require('url');
var internals = {};

module.exports = function ($http, $q, convexConfig) {

  var ConvexRequest = function (config) {
    this.config = internals.config(config);
    this.deferred = $q.defer();
  };

  internals.config = function (input) {
    var output = angular.extend({}, input);
    output.method = (input.method || 'get').toUpperCase();
    if (output.url) {
      var parsed = url.parse(output.url);
      output.base = parsed.protocol + '//' + parsed.host;
      output.path = parsed.pathname;
    }
    else {
      output.base = input.base || convexConfig.base || '';
      output.path = input.path || '';
      output.url =  output.base + output.path;
    }
    return output;
  };

  ConvexRequest.prototype.send = function () {
    return $http({
      method: this.config.method,
      url: this.config.url,
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