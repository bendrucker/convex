'use strict';

var angular = require('angular');
var uuid    = require('node-uuid');

describe('ConvexModel', function () {

  var ConvexModel, Model, model, ConvexRequest, ConvexRelation, ConvexBatch, ConvexCache, $httpBackend, $timeout;
  beforeEach(angular.mock.module(require('../../')));
  beforeEach(angular.mock.module(function ($provide) {
    $provide.decorator('ConvexRequest', function ($delegate) {
      return sinon.spy($delegate);
    });
  }));
  beforeEach(angular.mock.inject(function ($injector) {
    ConvexModel = $injector.get('ConvexModel');
    ConvexRequest = $injector.get('ConvexRequest');
    ConvexRelation = $injector.get('ConvexRelation');
    ConvexBatch = $injector.get('ConvexBatch');
    ConvexCache = $injector.get('ConvexCache');
    $httpBackend = $injector.get('$httpBackend');
    $timeout = $injector.get('$timeout');
  }));
  beforeEach(function () {
    Model = ConvexModel.$new({name: 'item'});
    Related1 = ConvexModel.$new({name: 'rel1'});
    Related2 = ConvexModel.$new({name: 'rel2'});
    Model.belongsTo(Related1).belongsTo(Related2);
    model = new Model();
  });

  describe('ConvexModel#$new', function () {

    var MockBase;
    beforeEach(function () {
      MockBase = sinon.spy();
      MockBase.prototype = {
        name: 'models'
      };
      MockBase.$new = ConvexModel.$new;
    });

    it('calls the parent in the child constructor', function () {
      var child = new (MockBase.$new({name: 'm'}))('a1', 'a2');
      expect(MockBase)
        .to.have.been.calledOn(child)
        .and.calledWith('a1', 'a2');
    });

    it('copies the parent prototype', function () {
      expect(MockBase.$new({name: 'm'}).prototype)
        .to.contain(MockBase.prototype);
    });

    it('extends the prototype with new properties', function () {
      expect(MockBase.$new({name: 'm', foo: 'bar'}).prototype)
        .to.have.property('foo', 'bar');
    });

    it('extends the constructor with the parent', function () {
      MockBase.foo = 'bar';
      expect(MockBase.$new({name: 'm'})).to.have.property('foo', 'bar');
    });

    it('extends the constructor with new methods', function () {
      expect(MockBase.$new({name: 'm'}, {foo: 'bar'}))
        .to.have.property('foo', 'bar');
    });

    it('requires a name on the prototype', function () {
      expect(function () {
        ConvexModel.$new();
      }).to.throw(/must have a name/);
    });

    it('assigns the name as $name', function () {
      expect(ConvexModel.$new({name: 'm'}).prototype)
        .to.have.property('$name', 'm');
    });

    it('creates a new cache for the child model', function () {
      var Child = ConvexModel.$new({name: 'model'});
      expect(Child.prototype.$$cache).to.exist;
      expect(Child.prototype.$$cache.$name).to.equal('convex-model');
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

    it('can handle data with new nested objects');

    it('can handle data with foreign keys and new nested objects');

    it('can handle models with existing nested objects');

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
      model.id = uuid.v4();
      model.$reset();
      expect(model).to.not.have.property('id');
      expect(model).to.have.property('$$cache');
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

        xit('can handle relations', function () {
          $httpBackend
            .expectGET(url + encodeBrackets('?expand[0]=rel1&expand[1]=rel2'))
            .respond(200, res);
          model.$fetch({
            expand: ['rel1', 'rel2']
          });
          $httpBackend.flush();
          expect(model.$related)
            .to.have.been.calledWith('rel1')
            .and.calledWith('rel2');
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

    xdescribe('Collection', function () {

      var url = '/items?condition=true';
      var res = [{id: uuid.v4()}, {id: uuid.v4()}];

      beforeEach(function () {
        sinon.stub(Model.prototype, '$related');
      });

      describe('#$where', function () {

        it('sends a GET request with the query', function () {
          $httpBackend
            .expectGET(url)
            .respond(200, res);
          Model.$where({condition: true});
          $httpBackend.flush();
        });

        it('casts the returned array of models', function () {
          $httpBackend
            .expectGET(url)
            .respond(200, res);
          Model.$where({condition: true})
            .then(function (models) {
              expect(models).to.have.length(2);
              expect(models[0]).to.be.an.instanceOf(Model);
            });
          $httpBackend.flush();
        });

        xit('can handle relations', function () {
          var response = [{
            id: uuid.v4(),
            related: {
              id: uuid.v4(),
              foo: 'bar'
            }
          }];
          $httpBackend
            .expectGET(url + encodeBrackets('&expand[0]=related'))
            .respond(200, response);
          Model.$where({condition: true}, {expand: ['related']})
            .then(function (models) {
              model = models[0];
              console.log(model.related_id);
              expect(model.related_id).to.equal(response[0].related.id);
            });
          $httpBackend.flush();
        });

      });

      describe('#$find', function () {

        it('returns the first model of the results set', function () {
          $httpBackend
            .expectGET(url)
            .respond(200, res);
          Model.$find({condition: true})
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
          var promise = Model.$find({condition: true});
          $httpBackend.flush();
          expect(promise).to.be.rejected;
        });

        it('can handle relations', function () {
          $httpBackend
            .expectGET(url + encodeBrackets('&expand[0]=related'))
            .respond(200, res);
          Model.$find({condition: true}, {expand: ['related']})
            .then(function (model) {
              expect(model.$related).to.have.been.calledWith('related');
            });
          $httpBackend.flush();
        });

      });

      describe('#$all', function () {

        it('sends a GET request to the collection url', function () {
          $httpBackend
            .expectGET('/items')
            .respond(200, res);
          sinon.spy(Model, '$where');
          var options = {};
          Model.$all(options)
            .then(function (models) {
              expect(models).to.have.length(2);
              expect(models[0]).to.be.an.instanceOf(Model);
            });
          $httpBackend.flush();
          expect(Model.$where).to.have.been.calledWith(null, options);
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

    xdescribe('#$related', function () {

      it('returns a related model if already defined', function () {
        var child = new Model();
        model.child = child;
        expect(model.$related('child')).to.equal(child);
      });

      it('returns a related collection if already defined', function () {
        var child = {
          isCollection: true
        };
        model.child = child;
        expect(model.$related('child')).to.equal(child);
      });

      it('otherwise instantiates a new related model and returns it', function () {
        model.$$relations = {
          child: {
            initialize: sinon.spy()
          }
        };
        var related = model.$related('child');
        expect(related)
          .to.equal(model.$$relations.child.initialize.firstCall.returnValue);
        expect(model.child).to.equal(related);
        expect(model.$$relations.child.initialize).to.have.been.calledWith(model);
      });

    });

  });

});
