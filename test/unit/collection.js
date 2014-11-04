'use strict';

var angular = require('angular');
var uuid    = require('uuid');

describe('ConvexCollection', function () {

  beforeEach(angular.mock.module(require('../../')));

  var Model, ConvexCollection, collection, $httpBackend;
  beforeEach(angular.mock.inject(function ($injector) {
    ConvexCollection = $injector.get('ConvexCollection');
    Model = $injector.get('ConvexModel').extend({$name: 'item'});
    collection = new ConvexCollection(Model);
    $httpBackend = $injector.get('$httpBackend');
  }));

  describe('Constructor', function () {

    it('sets the model constructor', function () {
      expect(collection).to.have.property('$$model', Model);
    });

    it('creates an empty array of models', function () {
      expect(collection)
        .to.be.an('array')
        .that.is.empty;
      expect(angular.isArray(collection)).to.be.true;
    });

    it('can receive models', function () {
      var collection = new ConvexCollection(Model, [{}]);
      expect(collection).to.have.length(1);
    });

  });

  describe('#$attributes', function () {

    it('can get attributes', function () {
      expect(collection.$attributes()).to.be.empty;
    });

    it('can set attributes', function () {
      expect(collection.$attributes({foo: 'bar'})).to.deep.equal({
        foo: 'bar'
      });
    });

  });

  describe('#$push', function () {

    it('can receive plain objects', function () {
      var data = [{foo: 'bar'}, {baz: 'qux'}];
      collection.$push.apply(collection, data);
      expect(collection).to.have.length(2);
      expect(collection[0])
        .to.be.an.instanceOf(Model)
        .and.contain({
          foo: 'bar'
        });
      expect(collection[1])
        .to.be.an.instanceOf(Model)
        .and.contain({
          baz: 'qux'
        });
    });

    it('can push models', function () {
      var data = [new Model(), new Model()];
      collection.$push.apply(collection, data);
      expect(collection).to.have.length(2);
    });

    it('adds the attributes to models and data', function () {
      collection.$attributes({foo: 'bar'});
      collection.$push({});
      expect(collection[0]).to.have.property('foo', 'bar');
    });

    it('returns the model array', function () {
      expect(collection.$push()).to.equal(collection);
    });

  });

  describe('#fetch', function () {

    it('can fetch a collection of data using a query', function () {
      $httpBackend
        .expectGET('/items?condition=true')
        .respond(200, [{id: uuid.v4()}, {id: uuid.v4()}]);
      collection.$fetch({condition: true})
        .then(function (collection) {
          expect(collection).to.have.length(2);
        });
      $httpBackend.flush();
    });

  });

});
