'use strict';

module.exports = function () {

  var ConvexCollection = function (Model) {
    this.model = Model;
    this.models = [];
  };

  ConvexCollection.prototype.push = function (model) {
    var models = arguments;
    if (!(model instanceof this.model)) {
      models = Array.prototype.splice.call(arguments, 0)
        .map(function (data) {
          return new this.model(data);
        }, this);
    }
    this.models.push.apply(this.models, models);
    return this;
  };

  return ConvexCollection;
  
};
