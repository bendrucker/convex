'use strict';

require('angular')
  .module('convex', [])
  .constant('convexConfig', {
    batch: '/batch'
  })
  .factory('ConvexModel', require('./model'))
  .factory('ConvexCollection', require('./collection'))
  .factory('ConvexRequest', require('./request'))
  .factory('ConvexBatch', require('./batch'))
  .factory('ConvexCache', require('./cache'))
  .factory('ConvexRelation', require('./relation'));

module.exports = 'convex';
