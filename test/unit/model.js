var angular = require('angular');

require('../../src');
require('angular-mocks');

describe('BaseModel', function () {

  var BaseModel, modelCacheFactory;
  beforeEach(angular.mock.module('valet-base-model'));
  beforeEach(angular.mock.module(function ($provide) {
    $provide.factory('modelCacheFactory', function ($cacheFactory) {
      return sinon.spy($cacheFactory);
    });
  }));
  beforeEach(angular.mock.inject(function (_BaseModel_, _modelCacheFactory_) {
    BaseModel = _BaseModel_;
    modelCacheFactory = _modelCacheFactory_;
  }));

  describe('Constructor', function () {

    it('creates an instance with the attributes', function () {
      sinon.spy(angular, 'extend');
      var attributes = {};
      var model = new BaseModel(attributes);
      expect(angular.extend).to.have.been.calledWith(model, attributes);
      angular.extend.restore();
    });

  });

  describe('BaseModel#extend', function () {

    var MockBase;
    beforeEach(function () {
      sinon.spy(angular, 'extend');
      MockBase = sinon.spy();
      MockBase.prototype = {
        name: 'base'
      };
      MockBase.extend = BaseModel.extend;
    });

    afterEach(function () {
      angular.extend.restore();
    });

    it('calls the parent in the child constructor', function () {
      var child = new (MockBase.extend())('a1', 'a2');
      expect(MockBase)
        .to.have.been.calledOn(child)
        .and.calledWith('a1', 'a2');
    });

    it('copies the parent prototype', function () {
      expect(MockBase.extend().prototype).to.deep.equal(MockBase.prototype);
    });

    it('extends the prototype with new methods', function () {
      var proto = {};
      var Child = MockBase.extend({});
      expect(angular.extend).to.have.been.calledWith(Child.prototype, proto);
    });

    it('extends the constructor with the parent', function () {
      var Child = MockBase.extend();
      expect(angular.extend).to.have.been.calledWith(Child, MockBase);
    });

    it('extends the constructor with new methods', function () {
      var ctor = {};
      var Child = MockBase.extend(null, ctor);
      expect(angular.extend).to.have.been.calledWith(Child, ctor);
    });

    it('requires a name on the prototype', function () {
      expect(BaseModel.extend.bind(BaseModel)).to.throw(/must have a name/);
    });

    describe('Instantiating the cache', function () {

      it('creates a new cache for the child model', function () {
        var Child = BaseModel.extend({name: 'base'});
        expect(modelCacheFactory).to.have.been.calledWith('base');
        expect(Child.cache).to.equal(modelCacheFactory.firstCall.returnValue);
      });

    });

  });

});