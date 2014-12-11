'use strict';

var angular = require('angular');
var url     = require('url');
var qs      = require('qs');

module.exports = function ($http, $q, $timeout, ConvexCache, convexConfig) {

  function ConvexRequest (config) {
    this.config = parseConfig(config);
    this.deferred = $q.defer();
  }

  function querystring (params) {
    if (Object.keys(params).length) {
      return '?' + qs.stringify(params);
    }
    else {
      return '';
    }
  }

  function parseConfig (input) {
    input = input || {};
    var output = angular.extend({}, input);
    output.method = (input.method || 'get').toUpperCase();
    if (output.url) {
      var parsed = url.parse(output.url, true);
      output.base = parsed.protocol + '//' + parsed.host;
      output.path = parsed.pathname;
      output.params = parsed.query;
    }
    else {
      output.base = input.base || convexConfig.base || '';
      output.path = input.path || '';
      output.params = input.params || {};
      output.url = output.base + output.path; 
      output.url += querystring(output.params);
    }
    return output;
  }

  ConvexRequest.prototype.$$cache = new ConvexCache('ConvexRequest');

  ConvexRequest.prototype.toJSON = function () {
    return {
      method: this.config.method,
      path: this.config.path + querystring(this.config.params),
      payload: this.config.data
    };
  };

  function getCachedRequest (request) {
    if (request.config.method === 'GET') {
      if (request.config.cache && !request.config.force) { 
        var cached = request.$$cache.get(
          request.config.url,
          request.config.cache === 'persist'
        );
        if (cached) request.cacheHit = true;
        return cached;
      }
    }
  }

  function putCachedResponse (request, response) {
    if (request.config.cache && !request.cacheHit) {
      request.$$cache.put(
        request.config.url,
        response.data,
        request.config.cache === 'persist'
      );
    }
  }

  ConvexRequest.prototype.send = function () {
    var request = this;
    var attempts = -1;
    function send (request) {
      attempts++;
      return $http({
        method: request.config.method,
        url: request.config.url,
        data: request.config.data,
        timeout: 20000
      })
      .catch(function (response) {
        if (response.status !== 503 || attempts > 2) return $q.reject(response);
        return $timeout(function () {
          return send(request);
        }, Math.exp(2, attempts + 1));
      });
    }
    return $q.when(getCachedRequest(this) || send(this))
      .then(function (response) {
        putCachedResponse(request, response);
        return response;
      })
      .then(angular.bind(this, this.fulfill))
      .catch(angular.bind(this, this.reject));
  };

  ConvexRequest.prototype.fulfill = function (response) {
    $q.when(response)
      .then(function (response) {
        if (typeof response.headers !== 'function') {
          if (response.error) {
            return $q.reject({
              status: response.statusCode,
              data: response,
            });
          }
          else {
            return response;
          }
        }
        else {
          return response.data;
        }
      })
      .then(this.deferred.resolve)
      .catch(angular.bind(this, this.reject));
    return this;
  };

  ConvexRequest.prototype.reject = function (err) {
    var e = new Error();
    var invalid = 'Invalid Response';
    e.statusCode = err.status;
    e.data = err.data || {};
    e.name = e.data.error || invalid;
    e.message = e.data.message || e.name;
    this.deferred.reject(e);
    return this;
  };

  ConvexRequest.prototype.then = function (success, failure) {
    return this.deferred.promise.then(success, failure);
  };

  ConvexRequest.prototype.catch = function (failure) {
    return this.deferred.promise.catch(failure);
  };

  return ConvexRequest;

};

module.exports.$inject = [
  '$http',
  '$q',
  '$timeout',
  'ConvexCache',
  'convexConfig'
];
