'use strict';

module.exports = require('angular')
  .module('convex', [])
  .constant('convexConfig', {
    batch: '/batch'
  })
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
  .factory('ConvexBatch', [
    'ConvexRequest',
    '$q',
    'convexConfig',
    require('./batch')
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