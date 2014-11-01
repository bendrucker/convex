'use strict';

function name (Model) {
  return Model.prototype.$name;
}

function key (Model, singular) {
  var k = name(Model);
  return singular ? k : k + 's';
}

module.exports = function ($injector, ConvexCollection) {

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
    switch (this.type) {
      case 'belongsTo':
        Object.defineProperty(model, this.foreignKey, {
          get: function () {
            var related = this[relation.key];
            return related ? related.id : void 0;
          },
          set: function (id) {
            if (!this[relation.key] || this[relation.key].id !== id) {
              this[relation.key] = new relation.target({id: id});
            }
          },
          enumerable: true
        });
        break;
      case 'hasMany':
        model[relation.key] = new ConvexCollection(this.target);
        break;
    }
  };

  return ConvexRelation;

};

module.exports.$inject = ['$injector', 'ConvexCollection'];
