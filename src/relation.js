'use strict';

var internals         = {};

internals.key = function (Model, singular) {
  var name = Model.prototype.$name;
  return singular ? name : name + 's';
};

module.exports = function ($injector) {

  function ConvexRelation (type, target) {
    this.type = type;
    this.target = $injector.get(target);
    this.key = internals.key(this.target, this.isSingle());
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
