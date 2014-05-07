'use strict';

var angular = require('angular');

module.exports = function (Model) {
  var array = [];

  array.model = Model;
  array.isCollection = true;

  array.add = function (data, options) {
    if (!angular.isArray(data)) data = [data];
    array.push.apply(array, data.map(function (modelData) {
      return new array.model(modelData, options);
    }));
    return array;
  };

  return array;
};