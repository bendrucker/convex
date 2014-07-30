'use strict';

module.exports = require('angular')
  .module('convex', [])
  .constant('convexConfig', {})
  .factory('ConvexModel', [
    '$q',
    '$http',
    'ConvexCache',
    'ConvexRelation',
    'convexConfig',
    require('./model')
  ])
  .factory('ConvexRequest', [
    '$http',
    '$q',
    'convexConfig',
    require('./request')
  ])
  .factory('ConvexCache', [
    '$cacheFactory',
    require('./cache')
  ])
  .factory('ConvexRelation', [
    '$injector',
    require('./relation')
  ]);

module.exports = 'convex';