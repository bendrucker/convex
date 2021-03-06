'use strict';

var angular = require('angular');
var uuid    = require('uuid');
var sinon   = require('sinon');
var expect  = require('../expect');

describe('ConvexModel', function () {

  var ConvexModel, Model, BelongsTo, HasOne, HasMany, model, ConvexCollection, ConvexRequest, ConvexRelation, ConvexBatch, ConvexCache, $httpBackend, $timeout;
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
    BelongsTo = ConvexModel.extend({$name: 'belongsTo'});
    HasOne = ConvexModel.extend({$name: 'hasOne'});
    HasMany = ConvexModel.extend({$name: 'hasMany'});
    Model.belongsTo(BelongsTo, 'belongsTo').hasOne(HasOne, 'hasOne').hasMany(HasMany, 'hasMany');
    HasOne.belongsTo(Model, 'item');
    HasMany.belongsTo(Model, 'item');
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

    it('adds the default plural', function () {
      expect(MockBase.extend({$name: 'foo'}).prototype)
        .to.have.property('$plural', 'foos');
    });

    it('takes a custom plural', function () {
      expect(MockBase.extend({$name: 'sheep', $plural: 'sheep'}).prototype)
        .to.have.property('$plural', 'sheep');
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
      model.$set({belongsTo_id: 1});
      expect(model)
        .to.have.property('belongsTo')
        .that.is.an.instanceOf(BelongsTo)
        .with.property('id', 1);
    });

    it('can handle data with new nested objects', function () {
      model.$set({
        belongsTo: {
          foo: 'bar'
        }
      });
      expect(model.belongsTo).to.have.property('foo', 'bar');
      expect(model.belongsTo).to.have.property('id');
    });

    it('can handle data with foreign keys and new nested objects', function () {
      model.$set({
        belongsTo_id: 1,
        belongsTo: {
          id: 1,
          foo: 'bar'
        }
      });
    });

    it('can handle models with existing nested objects', function () {
      model.belongsTo = new BelongsTo({
        id: 1
      });
      model.$set({
        belongsTo: {
          foo: 'bar'
        }
      });
      expect(model.belongsTo).to.contain({
        id: 1,
        foo: 'bar'
      });
    });

    it('can handle empty hasOne relations', function () {
      model.$set({
        hasOne: {}
      });
      expect(model.hasOne).to.contain({
        item_id: model.id,
        item: model
      });
    });

    it('casts related collections', function () {
      model.$set({
        hasMany: [{}]
      });
      expect(Array.isArray(model.hasMany)).to.equal(true);
      expect(model.hasMany[0]).to.be.an.instanceOf(HasMany);
    });

  });

  describe('#$path', function () {

    it('generates the model endpoint', function () {
      expect(model.$path()).to.equal('/items/' + model.id);
    });

    it('generates a collection endpoint with false', function () {
      expect(model.$path(false)).to.equal('/items');
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

    it('excludes $ prefixed properties', function () {
      model.$foo = 'bar';
      expect(model.toJSON()).to.not.have.property('$foo');
    });

    it('includes prototype properties', function () {
      Model.prototype.notOwn = 'foo';
      expect(model.toJSON()).to.have.property('notOwn', 'foo');
    });

    it('excludes relations', function () {
      model.$$relations = {foo: {}};
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
        callback = sinon.stub();
        promise = {};
        sinon.stub(ConvexBatch.prototype, 'process').returns(promise);
        
      });

      it('passes a batch into the callback', function () {
        model.$batch(callback);
        expect(callback)
          .to.have.been.calledWith(sinon.match.instanceOf(ConvexBatch));
        expect(callback).to.have.been.calledOn(model);
      });

      it('sets the return value for the batch', function () {
        callback.returns('foo');
        model.$batch(callback);
        expect(callback.firstCall.args[0].return)
          .to.equal('foo');
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
      Model.belongsTo(fn, 'key');
      expect(Model.prototype.$$relations)
        .to.have.property('key')
        .and.contain({
          type: 'belongsTo',
          key: 'key',
          target: fn
        });
    });

    it('can create a hasOne relation', function () {
      Model.hasOne(fn, 'key');
      expect(Model.prototype.$$relations)
        .to.have.property('key')
        .and.contain({
          type: 'hasOne',
          key: 'key',
          target: fn
        });
    });

    it('can create a hasMany relation', function () {
      Model.hasMany(fn, 'keys');
      expect(Model.prototype.$$relations)
        .to.have.property('keys')
        .and.contain({
          type: 'hasMany',
          target: fn
        });
    });

    it('can create a relation with custom options', function () {
      Model.belongsTo(fn, 'key', {
        foreignKey: 'fkey'
      });
      expect(Model.prototype.$$relations)
        .to.have.deep.property('key.foreignKey', 'fkey');
    });

  });

});
