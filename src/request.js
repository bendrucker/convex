'use strict';

var angular     = require('angular');
var url         = require('url');
var querystring = require('querystring');
var internals   = {};

module.exports = function ($http, $q, convexConfig) {

  var ConvexRequest = function (config) {
    this.config = internals.config(config);
    this.deferred = $q.defer();
  };

  internals.config = function (input) {
    var output = angular.extend({}, input);
    output.method = (input.method || 'get').toUpperCase();
    if (output.url) {
      var parsed = url.parse(output.url, true);
      output.base = parsed.protocol + '//' + parsed.host;
      output.path = parsed.pathname;
      output.query = parsed.query;
    }
    else {
      output.base = input.base || convexConfig.base || '';
      output.path = input.path || '';
      output.url = output.base + output.path; 
      if (output.query) {
        output.url += '?' + querystring.stringify(output.query);
      }
    }
    return output;
  };

  ConvexRequest.prototype.toJSON = function () {
    return {
      method: this.config.method,
      url: this.config.url,
      base: this.config.base,
      path: this.config.path,
      query: this.config.query,
      payload: this.config.data
    };
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
      var invalid = 'Invalid Response';
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