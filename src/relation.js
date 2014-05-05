'use strict';

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
    if (this.isSingle()) {
      parent[this.key] = new this.target({
        id: parent[this.targetName + '_id']
      });
    } else {
      parent[this.key] = collectionFactory(this.target);
    }
  };

  return Relation;
};