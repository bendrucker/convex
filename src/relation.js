'use strict';

var angular           = require('angular');
var collectionFactory = require('./collection');

module.exports = function ($injector) {
  var ConvexRelation = function (type, target) {
    this.type = type;
    this.target = $injector.get(target);
    this.targetName = this.target.prototype.$name;
    this.key = this.isSingle() ? 
      this.targetName : this.target.prototype.plural || this.targetName + 's';
  };

  ConvexRelation.prototype.isSingle = function () {
    return this.type === 'belongsTo';
  };

  ConvexRelation.prototype.initialize = function (parent) {
    var data = parent[this.key], relation;
    if (this.isSingle()) {
      relation = new this.target({
        id: parent[this.targetName + '_id']
      });
      angular.extend(relation, data);
    } else {
      relation = collectionFactory(this.target);
      if (data) relation.add(data);
    }
    return relation;
  };

  return ConvexRelation;
};
