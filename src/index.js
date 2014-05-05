'use strict';

module.exports = require('angular')
  .module('valet-base-model', [])
  .factory('BaseModel', require('./model'))
  .factory('modelCacheFactory', require('./cache'))
  .factory('ModelRelation', require('./relation'));