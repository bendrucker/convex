'use strict';

var angular           = require('angular');
var pluralize         = require('pluralize');
var collectionFactory = require('./collection');

module.exports = function ($injector) {
  var Relation = function (type, target) {
    this.type = type;
    this.target = $injector.get(target);
    this.targetName = this.target.prototype.objectName;
    this.key = this.isSingle() ? this.targetName : pluralize(this.targetName);
  };

  Relation.prototype.isSingle = function () {
    return this.type === 'belongsTo';
  };

  Relation.prototype.initialize = function (parent) {
    var data = parent[this.key];
    if (this.isSingle()) {
      var relation = parent[this.key] = new this.target({
        id: parent[this.targetName + '_id']
      });
      angular.extend(relation, data);
    } else {
      var relation = parent[this.key] = collectionFactory(this.target)
      relation.add(data || []);
    }
  };

  return Relation;
};