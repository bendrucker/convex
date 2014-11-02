'use strict';

var angular = require('angular');
var uuid    = require('uuid');

describe('ConvexModel', function () {

  var ConvexModel, Model, Related1, Related2, model, ConvexCollection, ConvexRequest, ConvexRelation, ConvexBatch, ConvexCache, $httpBackend, $timeout;
  beforeEach(angular.mock.module(require('../../')));
  beforeEach(angular.mock.module(function ($provide) {
    $provide.decorator('ConvexRequest', function ($delegate) {
      return sinon.spy($delegate);
    });
  }));
  beforeEach(angular.mock.inject(function ($injector) {
    ConvexModel = $injector.get('ConvexModel');
    ConvexCollection = $injector.get('ConvexCollection');
    ConvexRequest = $injector.get('ConvexRequest');
    ConvexRelation = $injector.get('ConvexRelation');
    ConvexBatch = $injector.get('ConvexBatch');
    ConvexCache = $injector.get('ConvexCache');
    $httpBackend = $injector.get('$httpBackend');
    $timeout = $injector.get('$timeout');
  }));
  beforeEach(function () {
    Model = ConvexModel.extend({$name: 'item'});
    Related1 = ConvexModel.extend({$name: 'rel1'});
    Related2 = ConvexModel.extend({$name: 'rel2'});
    Model.belongsTo(Related1).belongsTo(Related2);
    model = new Model();
  });

  describe('ConvexModel#extend', function () {

    var MockBase;
    beforeEach(function () {
      MockBase = sinon.spy();
      MockBase.prototype = {
        $name: 'models'
      };
      MockBase.extend = ConvexModel.extend;
    });

    it('calls the parent in the child constructor', function () {
      var child = new (MockBase.extend({$name: 'm'}))('a1', 'a2');
      expect(MockBase)
        .to.have.been.calledOn(child)
        .and.calledWith('a1', 'a2');
    });

    it('copies the parent prototype', function () {
      MockBase.prototype.foo = 'bar';
      expect(MockBase.extend({$name: 'm'}).prototype)
        .to.have.property('foo', 'bar');
    });

    it('extends the prototype with new properties', function () {
      expect(MockBase.extend({$name: 'm', foo: 'bar'}).prototype)
        .to.have.property('foo', 'bar');
    });

    it('extends the constructor with the parent', function () {
      MockBase.foo = 'bar';
      expect(MockBase.extend({$name: 'm'})).to.have.property('foo', 'bar');
    });

    it('extends the constructor with new methods', function () {
      expect(MockBase.extend({$name: 'm'}, {foo: 'bar'}))
        .to.have.property('foo', 'bar');
    });

    it('requires a name on the prototype', function () {
      expect(function () {
        ConvexModel.extend();
      }).to.throw(/must have a name \(\$name\)/);
    });

    it('creates a new cache for the child model', function () {
      var Child = ConvexModel.extend({$name: 'model'});
      expect(Child.prototype.$$cache).to.exist;
      expect(Child.prototype.$$cache.$name).to.equal('convex-model');
    });

    it('creates a relation store for the child model', function () {
      var Child = ConvexModel.extend({$name: 'model'});
      expect(Child.prototype.$$relations).to.be.empty;
    });

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

    it('is "$$saved" if the ID was provided', function () {
      expect(new Model().$$saved).to.be.false;
      expect(new Model({id: uuid.v4()}).$$saved).to.be.true;
    });

    it('stores new models in the cache', function () {
      sinon.stub(Model.prototype.$$cache, 'put');
      model = new Model();
      expect(model.$$cache.put).to.have.been.calledWith(model.id, model);
    });

    it('references the cached model if available', function () {
      expect(new Model({id: model.id})).to.equal(model);
    });

    it('extends the cached model with new attributes', function () {
      new Model({id: model.id, foo: 'bar'});
      expect(model).to.have.property('foo', 'bar');
    });

    it('calls an initialization method on new models', function () {
      Model.prototype.$initialize = sinon.spy();
      model = new Model();
      expect(model.$initialize).to.have.been.called;
    });

    it('does not initialize cached models', function () {
      Model.prototype.$initialize = sinon.spy();
      model = new Model({id: model.id});
      expect(Model.prototype.$initialize).to.not.have.been.called;
    });

  });

  describe('#$set', function () {

    it('can set simple data', function () {
      model.$set({foo: 'bar'});
      expect(model.foo).to.equal('bar');
    });

    it('can handle data with foreign keys', function () {
      model.$set({rel1_id: 1});
      expect(model)
        .to.have.property('rel1')
        .that.is.an.instanceOf(Related1)
        .with.property('id', 1);
    });

    it('can handle data with new nested objects', function () {
      model.$set({
        rel1: {
          foo: 'bar'
        }
      });
      expect(model.rel1).to.have.property('foo', 'bar');
      expect(model.rel1).to.have.property('id');
    });

    it('can handle data with foreign keys and new nested objects', function () {
      model.$set({
        rel1_id: 1,
        rel1: {
          id: 1,
          foo: 'bar'
        }
      });
    });

    it('can handle models with existing nested objects', function () {
      model.rel1 = new Related1({
        id: 1
      });
      model.$set({
        rel1: {
          foo: 'bar'
        }
      });
      expect(model.rel1).to.contain({
        id: 1,
        foo: 'bar'
      });
    });

  });

  describe('#$path', function () {

    it('generates the collection endpoint', function () {
      expect(model.$path()).to.equal('/items');
    });

    it('generates a an instance endpoint with an id', function () {
      expect(model.$path('id')).to.equal('/items/id');
    });

  });

  describe('#$reset', function () {

    it('deletes the own properties of the model', function () {
      model.$reset();
      expect(model).to.not.have.property('id');
      expect(model).to.have.property('$$cache');
    });

  });

  describe('#clone', function () {

    it('clones the data to a new model', function () {
      model.foo = {
        bar: 'baz'
      };
      var cloned = model.$clone();
      expect(cloned.id).to.not.equal(model.id);
      expect(cloned.foo).to.equal(model.foo);
    });

  });

  describe('#toJSON', function () {

    it('only includes own properties', function () {
      model.foo = 'bar';
      expect(model.toJSON()).to.not.respondTo('toJSON');
      expect(model.toJSON()).to.have.property('foo', 'bar');
    });

    it('excludes relations', function () {
      model.$$relations = {foo: null};
      model.foo = 'bar';
      expect(model.toJSON()).to.not.have.property('foo');
    });

  });

  describe('#$request', function () {

    beforeEach(function () {
      sinon.stub(ConvexRequest.prototype, 'send');
    });

    it('extends defaults with options', function () {
      model.$request({
        foo: 'bar'
      },
      {
        foo: 'baz',
        bar: 'baz'
      });
      expect(ConvexRequest).to.have.been.calledWithMatch({
        foo: 'baz',
        bar: 'baz'
      });
    });

    it('sets expansion parameters', function () {
      model.$request({}, {
        expand: ['foo', 'bar']
      });
      expect(ConvexRequest).to.have.been.calledWithMatch({
        params: {
          expand: ['foo', 'bar']
        }
      });
    });

    it('can handle batch requests', function () {
      var batch = {
        add: sinon.spy()
      };
      var request = model.$request({batch: batch});
      expect(batch.add)
        .to.have.been.calledWith(request);
    });

    it('defaults to normal requests', function () {
      var request = model.$request();
      expect(request.send).to.have.been.called;
    });

    it('returns the request', function () {
      expect(model.$request()).to.equal(ConvexRequest.firstCall.returnValue);
    });

  });

  describe('REST Methods', function () {

    var encodeBrackets = function (string) {
      return string
        .replace(/\[/g, encodeURIComponent('['))
        .replace(/\]/g, encodeURIComponent(']'));
    };

    afterEach(function () {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    describe('Instance', function () {

      var id  = uuid.v4();
      var url = '/items/' + id;
      var res = {
        id: id,
        name: 'Ben'
      };

      beforeEach(function () {
        model.id = id;
        model.$$saved = true;
      });

      describe('#$fetch', function () {

        it('is a noop on an unsaved model', function () {
          model.$$saved = false;
          expect(model.$fetch()).to.eventually.equal(model);
          $timeout.flush();
        });

        it('sends a GET and populates with the response', function () {
          $httpBackend
            .expectGET(url)
            .respond(200, res);
          model.$fetch();
          $httpBackend.flush();
          expect(model).to.have.property('name', 'Ben');
        });

        it('can handle relations', function () {
          $httpBackend
            .expectGET(url + encodeBrackets('?expand[0]=rel1&expand[1]=rel2'))
            .respond(200, {
              id: id,
              name: 'Ben',
              rel1_id: 1,
              rel2_id: 2,
              rel1: {
                id: 1,
                foo: 'bar'
              },
              rel2: {
                id: 1,
                bar: 'baz'
              }
            });
          model.$fetch({
            expand: ['rel1', 'rel2']
          });
          $httpBackend.flush();
          expect(model.rel1_id).to.equal(1);
          expect(model.rel1).to.contain({
            id: 1,
            foo: 'bar'
          });
        });

      });

      describe('#$save', function () {

        it('sends a PUT when the model is saved', function () {
          $httpBackend
            .expectPUT(url, {
              id: id
            })
            .respond(200, res);
          model.$save();
          $httpBackend.flush();
          expect(model).to.have.property('name', 'Ben');
        });

        it('sends a POST when the model is unsaved', function () {
          model.$$saved = false;
          $httpBackend
            .expectPOST('/items', {
              id: id
            })
            .respond(201, res);
          model.$save();
          $httpBackend.flush();
          expect(model).to.have.property('name', 'Ben');
          expect(model.$$saved).to.be.true;
        });

        it('excludes related data', function () {
          Model.prototype.$$relations = {
            rel1: null
          };
          model.rel1 = {
            foo: 'bar'
          };
          // sinon.stub(model, '$related');
          $httpBackend
            .expectPUT(url, {
              id: model.id
            })
            .respond(200, res);
          model.$save();
          $httpBackend.flush();
        });

      });

      describe('#$delete', function () {

        beforeEach(function () {
          $httpBackend.expectDELETE(url).respond(200);
        });

        it('does not send requests if the model is unsaved', function () {
          model.$$saved = false;
          $httpBackend.resetExpectations();
          model.$delete();
        });

        it('deletes saved models from the server', function () {
          model.$delete();
          $httpBackend.flush();
          expect(model.$$saved).to.be.false;
        });

        it('deletes saved models from the cache', function () {
          sinon.spy(model.$$cache, 'remove');
          model.$delete();
          $httpBackend.flush();
          expect(model.$$cache.remove).to.have.been.calledWith(id);
        });

        it('resets the model', function () {
          sinon.spy(Model.prototype, '$reset');
          model.$delete();
          $httpBackend.flush();
          expect(model.$reset).to.have.been.called;
        });

        it('sets a deleted flag in case of direct references', function () {
          model.$delete();
          $httpBackend.flush();
          expect(model.$deleted).to.be.true;
        });

      });

    });

    describe('#$batch', function () {

      var callback, promise;
      beforeEach(function () {
        callback = sinon.spy();
        promise = {};
        sinon.stub(ConvexBatch.prototype, 'process').returns(promise);
        
      });

      it('passes a batch into the callback', function () {
        model.$batch(callback);
        expect(callback)
          .to.have.been.calledWith(sinon.match.instanceOf(ConvexBatch));
        expect(callback).to.have.been.calledOn(model);

      });

      it('returns the batch promise', function () {
        expect(model.$batch(callback)).to.equal(promise);
      });

    });

    describe('Collection', function () {

      var url = '/items?condition=true';
      var res = [{id: uuid.v4()}, {id: uuid.v4()}];

      describe('#$where', function () {

        it('delegates to collection.$fetch', function () {
          sinon.stub(ConvexCollection.prototype, '$fetch').returnsThis();
          var query = {condition: true};
          var collection = Model.$where(query);
          expect(collection.$fetch).to.have.been.calledWith(query);
        });

      });

      describe('#$all', function () {

        it('delegates to Model.$where', function () {
          sinon.stub(Model, '$where');
          Model.$all();
          expect(Model.$where).to.have.been.calledWith(undefined);
        });

      });

    });

  });

  describe('Relations', function () {

    var fn = function () {};
    fn.prototype.$name = 'foo';

    it('can create a belongsTo relation', function () {
      Model.belongsTo(fn);
      expect(Model.prototype.$$relations)
        .to.have.property('foo')
        .and.contain({
          target: fn,
          type: 'belongsTo'
        });
    });

    it('can create a hasMany relation', function () {
      Model.hasMany(fn);
      expect(Model.prototype.$$relations)
        .to.have.property('foos')
        .and.contain({
          target: fn,
          type: 'hasMany'
        });
    });

  });

});
