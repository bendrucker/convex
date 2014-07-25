'use strict';

var angular = require('angular');
var uuid    = require('node-uuid');

require('../../src');

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
    Model = BaseModel.extend({objectName: 'item'});
    model = new Model();
  });
  afterEach(function () {
    modelCacheFactory.get('item').destroy();
  });

  beforeEach(function () {
    sinon.spy(angular, 'extend');
  });

  afterEach(function () {
    angular.extend.restore();
  });

  describe('Constructor', function () {

    it('creates an instance with the attributes', function () {
      model = new Model({
        foo: 'bar'
      });
      expect(model).to.contain({
        foo: 'bar'
      });
    });

    it('is "saved" if the ID was provided', function () {
      expect(new Model().saved).to.be.false;
      expect(new Model({id: uuid.v4()}).saved).to.be.true;
    });

    it('stores new models in the cache', function () {
      sinon.stub(Model.prototype.cache, 'put');
      model = new Model();
      expect(model.cache.put).to.have.been.calledWith(model.id, model);
    });

    it('references the cached model if available', function () {
      var cached = {};
      var id = uuid.v4();
      sinon.stub(Model.prototype.cache, 'get').withArgs(id).returns(cached);
      expect(new Model({id: id})).to.equal(cached);
    });

    it('extends the cached model with new attributes', function () {
      var cached = {};
      var id = uuid.v4();
      sinon.stub(Model.prototype.cache, 'get').returns(cached);
      new Model({id: id, foo: 'bar'});
      expect(cached).to.have.property('foo', 'bar');
    });

    it('calls an initialization method on new models', function () {
      Model.prototype.initialize = sinon.spy();
      model = new Model();
      expect(model.initialize).to.have.been.called;
    });

    it('does not initialize cached models', function () {
      var cached = {
        initialize: sinon.spy()
      };
      Model.prototype.initialize = sinon.spy();
      sinon.stub(Model.prototype.cache, 'get').returns(cached);
      model = new Model();
      expect(model.initialize).to.not.have.been.called;
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

  describe('#url', function () {

    beforeEach(function () {
      model.baseURL ='api';
    });

    it('generates the collection endpoint for unsaved models', function () {
      expect(model.url()).to.equal('api/items');
    });

    it('generates a model endpoint for saved models', function () {
      model.id = uuid.v4();
      model.saved = true;
      expect(model.url()).to.equal('api/items/' + model.id);
    });

  });

  describe('#reset', function () {

    it('deletes the own properties of the model', function () {
      model.id = uuid.v4();
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
      // $httpBackend.verifyNoOutstandingExpectation();
      // $httpBackend.verifyNoOutstandingRequest();
    });

    describe('Instance', function () {

      var id  = uuid.v4();
      var url = 'https://api/items/' + id;
      var res = {
        id: id,
        name: 'Ben'
      };

      beforeEach(function () {
        model.id = id;
        model.saved = true;
      });

      describe('#fetch', function () {

        it('is a noop on an unsaved model', function () {
          model.saved = false;
          var promise = model.fetch();
          $timeout.flush();
          expect(promise).to.eventually.equal(this);
        });

        it('sends a GET and populates with the response', function () {
          $httpBackend
            .expectGET(url)
            .respond(200, res);
          model.fetch();
          $httpBackend.flush();
          expect(model).to.have.property('name', 'Ben');
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

        it('sends a PUT when the model is saved', function () {
          $httpBackend
            .expectPUT(url, {
              id: id
            })
            .respond(200, res);
          model.save();
          $httpBackend.flush();
          expect(model).to.have.property('name', 'Ben');
        });

        it('sends a POST when the model is unsaved', function () {
          model.saved = false;
          $httpBackend
            .expectPOST('https://api/items', {
              id: id
            })
            .respond(201, res);
          model.save();
          $httpBackend.flush();
          expect(model).to.have.property('name', 'Ben');
        });

        xit('can excluded related data', function () {
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
          $httpBackend.expectDELETE(url).respond(200);
        });

        it('does not send requests if the model is unsaved', function () {
          model.saved = false;
          $httpBackend.resetExpectations();
          model.delete();
        });

        it('deletes saved models from the server', function () {
          model.delete();
          $httpBackend.flush();
        });

        it('deletes saved models from the cache', function () {
          sinon.spy(model.cache, 'remove');
          model.delete();
          $httpBackend.flush();
          expect(model.cache.remove).to.have.been.calledWith(id);
        });

        it('resets the model', function () {
          sinon.spy(Model.prototype, 'reset');
          model.delete();
          $httpBackend.flush();
          expect(model.reset).to.have.been.called;
        });

        it('sets a deleted flag in case of direct references', function () {
          model.delete();
          $httpBackend.flush();
          expect(model.deleted).to.be.true;
        });

      });

    });

    describe('Collection', function () {

      var url = 'https://api/items?condition=true';
      var res = [{id: uuid.v4()}, {id: uuid.v4()}];

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
                .and.have.property('id', res[0].id);
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
