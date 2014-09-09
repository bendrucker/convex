'use strict';

module.exports = function () {

  var ConvexCollection = function (Model) {
    this.model = Model;
    this.models = [];
  };

  ConvexCollection.prototype.push = function (model) {
    if (!(model instanceof this.Model) model = new this.model(model);
    this.models.push.apply(this, model);
  };

  return ConvexCollection;
  
};
