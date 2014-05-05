'use strict';

var angular = require('angular');

module.exports = function (Model) {
  var array = [];
  array.model = Model;
  array.add = function (data) {
    this.push(new this.model(data));
  };

  return array;
};