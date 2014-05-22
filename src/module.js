'use strict';

module.exports = require('angular')
  .module('valet-base-model', [])
  .provider('BaseModel', require('./provider'))
  .factory('modelCacheFactory', [
    '$cacheFactory',
    require('./cache')
  ])
  .factory('ModelRelation', [
    '$injector',
    require('./relation')
  ]);

module.exports = 'valet-base-model';