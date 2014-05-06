'use strict';

var angular = require('angular');

module.exports = function (Model) {
  var array = [];
  array.model = Model;
  array.add = function (data) {
    if (!angular.isArray(data)) data = [data];
    array.push.apply(array, data.map(function (modelData) {
      return new array.model(modelData);
    }));
    return array;
  };

  return array;
};