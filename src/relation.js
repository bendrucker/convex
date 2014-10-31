'use strict';

function name (Model) {
  return Model.prototype.$name;
}

function key (Model, singular) {
  var k = name(Model);
  return singular ? k : k + 's';
}

module.exports = function ($injector) {

  function ConvexRelation (type, target) {
    this.type = type;
    this.target = typeof target === 'function' ? target : $injector.get(target);
    this.foreignKey = this.isSingle() ? name(this.target) + '_id' : null;
    this.key = key(this.target, this.isSingle());
  }

  ConvexRelation.prototype.isSingle = function () {
    return this.type === 'belongsTo' || this.type === 'hasOne';
  };

  ConvexRelation.prototype.initialize = function (model) {
    var relation = this;
    if (this.type === 'belongsTo') {
      var key = this.key + '_id';
      if (model[key]) {
        model[this.key] = new this.target({id: model[key]});
      }
      Object.defineProperty(model, key, {
        get: function () {
          return this[relation.key].id;
        },
        set: function (id) {
          if (!this[relation.key] || this[relation.key].id !== id) {
            this[relation.key] = new relation.target({id: id});
          }
        },
        enumerable: true
      });
    }
  };

  return ConvexRelation;

};

module.exports.$inject = ['$injector'];
