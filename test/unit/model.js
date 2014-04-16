var angular = require('angular');

require('../../src');
require('angular-mocks');

describe('BaseModel', function () {

  var BaseModel, Model, modelCacheFactory;
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
  beforeEach(function () {
    Model = BaseModel.extend({name: 'items'});
  });
  afterEach(function () {
    modelCacheFactory.get('items').destroy();
  });

  describe('Constructor', function () {

    beforeEach(function () {
      sinon.spy(angular, 'extend');
    });

    afterEach(function () {
      angular.extend.restore();
    });

    it('creates an instance with the attributes', function () {
      var attributes = {};
      var model = new Model(attributes);
      expect(angular.extend).to.have.been.calledWith(model, attributes);
    });

    it('stores new models in the cache', function () {
      sinon.stub(Model.prototype.cache, 'put');
      var model = new Model({id: 0});
      expect(model).to.be.an.instanceOf(Model);
      expect(model.cache.put).to.have.been.calledWith(0, model);
    });

    it('references the cached model if available', function () {
      var cached = {};
      sinon.stub(Model.prototype.cache, 'get').withArgs(0).returns(cached);
      expect(new Model({id: 0})).to.equal(cached);
    });

    it('extends the cached model with new attributes', function () {
      var cached = {};
      sinon.stub(Model.prototype.cache, 'get').returns(cached);
      new Model({id: 0});
      expect(cached).to.have.property('id');
    });

  });

  describe('BaseModel#extend', function () {

    var MockBase;
    beforeEach(function () {
      sinon.spy(angular, 'extend');
      MockBase = sinon.spy();
      MockBase.prototype = {
        name: 'models'
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
      expect(MockBase.extend().prototype).to.contain(MockBase.prototype);
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
      expect(function () {
        BaseModel.extend();
      }).to.throw(/must have a name/);
    });

    it('creates a new cache for the child model', function () {
      modelCacheFactory.reset();
      var Child = BaseModel.extend({name: 'models'});
      expect(modelCacheFactory).to.have.been.calledWith('models');
      expect(Child.prototype.cache).to.equal(modelCacheFactory.firstCall.returnValue);
    });

  });

});