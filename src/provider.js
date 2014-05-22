'use strict';

module.exports = function () {
  this.baseURL = 'https://api.valet.io',
  this.$get = [
    '$http',
    '$q',
    'ModelRelation',
    'modelCacheFactory',
    require('./model')
  ];
};