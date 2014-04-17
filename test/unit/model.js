'use strict';

var angular = require('angular');

require('../../src');
require('angular-mocks');

describe('BaseModel', function () {

  var BaseModel, Model, model, modelCacheFactory, $httpBackend, $timeout;
  beforeEach(angular.mock.module('valet-base-model'));
  beforeEach(angular.mock.module(function ($provide) {
    $provide.factory('modelCacheFactory', function ($cacheFactory) {
      return sinon.spy($cacheFactory);
    });
  }));
  beforeEach(angular.mock.inject(function ($injector) {
    BaseModel = $injector.get('BaseModel');
    modelCacheFactory = $injector.get('modelCacheFactory');
    $httpBackend = $injector.get('$httpBackend');
    $timeout = $injector.get('$timeout');
  }));
  beforeEach(function () {
    Model = BaseModel.extend({objectName: 'items'});
    model = new Model();
  });
  afterEach(function () {
    modelCacheFactory.get('items').destroy();
  });

  beforeEach(function () {
    sinon.spy(angular, 'extend');
  });

  afterEach(function () {
    angular.extend.restore();
  });

  describe('Constructor', function () {

    it('creates an instance with the attributes', function () {
      var attributes = {};
      model = new Model(attributes);
      expect(angular.extend).to.have.been.calledWith(model, attributes);
    });

    it('stores new models in the cache', function () {
      sinon.stub(Model.prototype.cache, 'put');
      model = new Model({id: 0});
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
      MockBase = sinon.spy();
      MockBase.prototype = {
        objectName: 'models'
      };
      MockBase.extend = BaseModel.extend;
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
      var Child = BaseModel.extend({objectName: 'models'});
      expect(modelCacheFactory).to.have.been.calledWith('models');
      expect(Child.prototype.cache).to.equal(modelCacheFactory.firstCall.returnValue);
    });

  });

  describe('#isNew', function () {

    it('is false when the model has an id', function () {
      expect(new Model({id: 0}).isNew()).to.be.false;
    });

    it('is true when there is no id', function () {
      expect(new Model().isNew()).to.be.true;
    });

  });

  describe('#url', function () {

    beforeEach(function () {
      model.baseURL ='api';
    });

    it('generates the collection endpoint for new models', function () {
      expect(model.url()).to.equal('api/items');
    });

    it('generates a model endpoint for persisted models', function () {
      model.id = 0;
      expect(model.url()).to.equal('api/items/0');
    });

  });

  describe('#reset', function () {

    it('deletes the own properties of the model', function () {
      model.id = 1;
      model.reset();
      expect(model).to.not.have.property('id');
      expect(model).to.have.property('cache');
    });

  });

  describe('REST Methods', function () {

    beforeEach(function () {
      Model.prototype.baseURL = 'https://api';
    });

    afterEach(function () {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    describe('Instance', function () {

      var url = 'https://api/items/0';
      var res = {
        id: 0,
        name: 'Ben'
      };

      beforeEach(function () {
        model.id = 0;
      });

      describe('#fetch', function () {

        it('rejects on a new model', function () {
          model.id = null;
          expect(model.fetch()).to.be.rejectedWith(/new model/);
        });

        it('sends a GET and populates with the response', function () {
          $httpBackend
            .expectGET(url)
            .respond(200, res);
          model.fetch();
          $httpBackend.flush();
          expect(angular.extend).to.have.been.calledWith(model, res);
        });

      });

      describe('#save', function () {

        it('sends a put when the model is not new', function () {
          $httpBackend
            .expectPUT(url, {
              id: 0
            })
            .respond(200, res);
          model.save();
          $httpBackend.flush();
          expect(angular.extend).to.have.been.calledWith(model, res);
        });

        it('sends a post when the model is new', function () {
          model.id = undefined;
          model.name = 'Ben';
          $httpBackend
            .expectPOST('https://api/items', {
              name: 'Ben'
            })
            .respond(200, res);
          model.save();
          $httpBackend.flush();
          expect(angular.extend).to.have.been.calledWith(model, res);
        });

      });

      describe('#delete', function () {

        beforeEach(function () {
          model.id = null;
        });

        it('does not send requests if the model is new', function () {
          model.delete();
        });

        it('sends a DELETE request if the model is not new', function () {
          $httpBackend.expectDELETE(url).respond(200);
          model.id = 0;
          model.delete();
          $httpBackend.flush();
        });

        it('removes the model from the cache if it was not new', function () {
          sinon.spy(model.cache, 'remove');
          $httpBackend.expectDELETE(url).respond(200);
          model.id = 0;
          model.delete();
          $httpBackend.flush();
          expect(model.cache.remove).to.have.been.calledWith(0);
        });

        it('resets the model', function () {
          sinon.spy(Model.prototype, 'reset');
          model.delete();
          $timeout.flush();
          expect(model.reset).to.have.been.called;
        });

        it('sets a deleted flag in case of direct references', function () {
          model.delete();
          $timeout.flush();
          expect(model.deleted).to.be.true;
        });

      });

    });

    describe('Collection', function () {

      describe('#query', function () {

        beforeEach(function () {
          $httpBackend
            .expectGET('https://api/items?condition=true')
            .respond(200, [{id: 0}, {id: 1}]);
        });

        it('sends a GET request with the query', function () {
          Model.query({condition: true});
          $httpBackend.flush();
        });

        it('casts the returned array of models', function () {
          Model.query({condition: true})
            .then(function (models) {
              expect(models).to.have.length(2);
              expect(models[0]).to.be.an.instanceOf(Model);
            });
          $httpBackend.flush();
        });

      });

      describe('#all', function () {

        it('sends a GET request to the collection url', function () {
          $httpBackend
            .expectGET('https://api/items')
            .respond(200, [{id: 0}, {id: 1}]);
          Model.all()
            .then(function (models) {
              expect(models).to.have.length(2);
              expect(models[0]).to.be.an.instanceOf(Model);
            });
          $httpBackend.flush();
        });

      });

    });

  });

});