var angular = require('angular');

require('angular-mocks');

module.exports = angular.mock.module(function ($provide) {
  $provide.factory('modelCacheFactory', function ($cacheFactory) {
    return sinon.spy($cacheFactory);
  });
});