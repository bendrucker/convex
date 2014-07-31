'use strict';

module.exports = require('angular')
  .module('convex', [])
  .constant('convexConfig', {
    batch: '/batch'
  })
  .factory('ConvexModel', [
    '$q',
    'ConvexRequest',
    'ConvexCache',
    'ConvexBatch',
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
    '$window',
    '$q',
    require('./cache')
  ])
  .factory('ConvexRelation', [
    '$injector',
    require('./relation')
  ]);

module.exports = 'convex';
