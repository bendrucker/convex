'use strict';

var angular = require('angular');

var collectionFactory = function (Model) {
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

collectionFactory.isCollection = function (value) {
  return angular.isArray(value) && typeof value.add === 'function';
};

module.exports = collectionFactory;