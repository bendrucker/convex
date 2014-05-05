var collectionFactory = require('../../src/collection');

describe('Collection', function () {

  var Model, collection;
  beforeEach(function () {
    Model = sinon.stub();
    collection = collectionFactory(Model);
  });

  it('returns an array with a reference to the model', function () {
    expect(collection)
      .to.be.an.instanceOf(Array)
      .and.to.have.property('model', Model);
  });

  describe('#add', function () {

    it('casts model data and pushes it to the array', function () {
      var data = {foo: 'bar'};
      Model.withArgs(data).returns(angular.extend(data, {id: 0}));
      collection.add(data);
      expect(collection).to.have.length(1);
      expect(Model).to.have.been.calledWithNew;
      expect(collection[0]).to.deep.equal({
        id: 0,
        foo: 'bar'
      });
    });

  });

});