'use strict';

var angular = require('angular');

describe('ConvexCollection', function () {

  beforeEach(angular.mock.module(require('../../')));

  var Model, ConvexCollection, collection;
  beforeEach(angular.mock.inject(function (_ConvexCollection_) {
    ConvexCollection = _ConvexCollection_;
    Model = sinon.stub();
    collection = new ConvexCollection(Model);
  }));

  describe('Constructor', function () {

    it('sets the model constructor', function () {
      expect(collection).to.have.property('model', Model);
    });

    it('creates an empty array of models', function () {
      expect(collection)
        .to.have.a.property('models')
        .that.is.an('array')
        .and.is.empty;
    });

  });

  describe('#push', function () {

    it('can receive plain objects', function () {
      var data = [{foo: 'bar'}, {baz: 'qux'}];
      collection.push.apply(collection, data);
      expect(collection.models).to.have.length(2);
      expect(Model).to.have.been.calledWith(data[0]);
      expect(Model).to.have.been.calledWith(data[1]);
    });

    it('receive models', function () {
      var data = [new Model(), new Model()];
      Model.reset();
      collection.push.apply(collection, data);
      expect(collection.models).to.have.length(2);
      expect(Model).to.not.have.been.called;
    });

  });

});