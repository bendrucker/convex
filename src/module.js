'use strict';

module.exports = require('angular')
  .module('valet-base-model', [])
  .provider('BaseModel', require('./provider'))
  .factory('modelCacheFactory', require('./cache'))
  .factory('ModelRelation', require('./relation'));

module.exports = 'valet-base-model';