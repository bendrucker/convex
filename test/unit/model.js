'use strict';

var angular = require('angular');

require('../../src');
require('angular-mocks');

describe('BaseModel', function () {

  var BaseModel, Model, model, ModelRelation, modelCacheFactory, $httpBackend, $timeout;
  beforeEach(angular.mock.module('valet-base-model'));
  beforeEach(angular.mock.module(function ($provide) {
    $provide.factory('modelCacheFactory', function ($cacheFactory) {
      return sinon.spy($cacheFactory);
    });
    $provide.factory('ModelRelation', function () {
      return sinon.stub();
    });
  }));
  beforeEach(angular.mock.inject(function ($injector) {
    BaseModel = $injector.get('BaseModel');
    ModelRelation = $injector.get('ModelRelation');
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

    it('instantiates specified relations', function () {
      sinon.stub(Model.prototype, 'related');
      model = new Model({}, {
        withRelated: ['relation']
      });
      expect(model.related).to.have.been.calledWith('relation');
      expect(model.related).to.have.been.calledOn(model);
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

        it('can handle relations', function () {
          sinon.stub(model, 'related');
          $httpBackend
            .expectGET(url + '?expand=rel1&expand=rel2')
            .respond(200, res);
          model.fetch({
            withRelated: ['rel1', 'rel2']
          });
          $httpBackend.flush();
          expect(model.related)
            .to.have.been.calledWith('rel1')
            .and.calledWith('rel2');
        });

      });

      describe('#save', function () {

        it('sends a PUT when the model is not new', function () {
          $httpBackend
            .expectPUT(url, {
              id: 0
            })
            .respond(200, res);
          model.save();
          $httpBackend.flush();
          expect(angular.extend).to.have.been.calledWith(model, res);
        });

        it('sends a POST when the model is new', function () {
          delete model.id;
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

        it('can handle related data', function () {
          Model.prototype.relations = {
            rel1: null,
            rel2: null
          };
          model.rel1 = {
            foo: 'bar'
          };
          model.rel2 = {
            foo: 'bar'
          };
          sinon.stub(model, 'related');
          $httpBackend
            .expectPUT('https://api/items/0?expand=rel1', {
              id: 0,
              rel1: {
                foo: 'bar'
              }
            })
            .respond(200, res);
          model.save({
            withRelated: ['rel1']
          });
          $httpBackend.flush();
          expect(model.related)
            .to.have.been.calledWith('rel1')
            .and.not.calledWith('rel2');
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

      var url = 'https://api/items?condition=true';
      var res = [{id: 0}, {id: 1}];

      beforeEach(function () {
        sinon.stub(Model.prototype, 'related');
      });

      describe('#where', function () {

        it('sends a GET request with the query', function () {
          $httpBackend
            .expectGET(url)
            .respond(200, res);
          Model.where({condition: true});
          $httpBackend.flush();
        });

        it('casts the returned array of models', function () {
          $httpBackend
            .expectGET(url)
            .respond(200, res);
          Model.where({condition: true})
            .then(function (models) {
              expect(models).to.have.length(2);
              expect(models[0]).to.be.an.instanceOf(Model);
            });
          $httpBackend.flush();
        });

        it('can handle relations', function () {
          $httpBackend
            .expectGET(url + '&expand=related')
            .respond(200, res);
          Model.where({condition: true}, {withRelated: ['related']})
            .then(function (models) {
              expect(models[0].related).to.have.been.calledWith('related');
            });
          $httpBackend.flush();
        });

      });

      describe('#find', function () {

        it('returns the first model of the results set', function () {
          $httpBackend
            .expectGET(url)
            .respond(200, res);
          Model.find({condition: true})
            .then(function (model) {
              expect(model)
                .to.be.an.instanceOf(Model)
                .and.have.property('id', 0);
            });
          $httpBackend.flush();
        });

        it('rejects with an empty result', function () {
          $httpBackend
            .expectGET(url)
            .respond(200, []);
          var promise = Model.find({condition: true});
          $httpBackend.flush();
          expect(promise).to.be.rejected;
        });

        it('can handle relations', function () {
          $httpBackend
            .expectGET(url + '&expand=related')
            .respond(200, res);
          Model.find({condition: true}, {withRelated: ['related']})
            .then(function (model) {
              expect(model.related).to.have.been.calledWith('related');
            });
          $httpBackend.flush();
        });

      });

      describe('#all', function () {

        it('sends a GET request to the collection url', function () {
          $httpBackend
            .expectGET('https://api/items')
            .respond(200, res);
          sinon.spy(Model, 'where');
          var options = {};
          Model.all(options)
            .then(function (models) {
              expect(models).to.have.length(2);
              expect(models[0]).to.be.an.instanceOf(Model);
            });
          $httpBackend.flush();
          expect(Model.where).to.have.been.calledWith(null, options);
        });

      });

    });

  });

  describe('Relations', function () {

    it('can create a belongsTo relation', function () {
      ModelRelation.returns({
        key: 'target'
      });
      Model.belongsTo('Target');
      expect(Model.prototype.relations)
        .to.have.property('target')
        .that.equals(ModelRelation.firstCall.returnValue);
      expect(ModelRelation).to.have.been.calledWithNew;
    });

    it('can create a hasMany relation', function () {
      ModelRelation.returns({
        key: 'targets'
      });
      Model.belongsTo('Target');
      expect(Model.prototype.relations)
        .to.have.property('targets')
        .that.equals(ModelRelation.firstCall.returnValue);
      expect(ModelRelation).to.have.been.calledWithNew;
    });

    describe('#related', function () {

      it('returns a related model if already defined', function () {
        var child = new Model();
        model.child = child;
        expect(model.related('child')).to.equal(child);
      });

      it('returns a related collection if already defined', function () {
        var child = {
          isCollection: true
        };
        model.child = child;
        expect(model.related('child')).to.equal(child);
      });

      it('otherwise instantiates a new related model and returns it', function () {
        model.relations = {
          child: {
            initialize: sinon.spy()
          }
        };
        var related = model.related('child');
        expect(related)
          .to.equal(model.relations.child.initialize.firstCall.returnValue);
        expect(model.child).to.equal(related);
        expect(model.relations.child.initialize).to.have.been.calledWith(model);
      });

    });

  });

});