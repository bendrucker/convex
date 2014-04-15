var angular = require('angular');

require('angular-mocks');

module.exports = angular.mock.module(function ($provide) {
  $provide.value('modelCacheFactory', sinon.spy());
});