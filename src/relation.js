'use strict';

module.exports = function ($injector, ConvexCollection) {

  function ConvexRelation (config) {
    this.type = config.type;
    this.key = config.key;
    this.foreignKey = config.foreignKey || (config.type === 'belongsTo' ? config.key + '_id' : void 0);
    this.rawTarget = config.target;
  }

  Object.defineProperties(ConvexRelation.prototype, {
    target: {
      get: function () {
        var target = this.rawTarget;
        return typeof target === 'function' ? target : $injector.get(target);
      }
    }
  });

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
        var collection = model[relation.key] = new ConvexCollection(this.target);
        var attributes = {};
        attributes[model.$name + '_id'] = model.id;
        collection.$attributes(attributes);
        break;
    }
  };

  return ConvexRelation;

};

module.exports.$inject = ['$injector', 'ConvexCollection'];
