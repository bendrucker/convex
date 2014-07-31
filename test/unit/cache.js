'use strict';

var angular = require('angular');
var uuid    = require('node-uuid');

describe('ConvexCache', function () {

  beforeEach(angular.mock.module(require('../../')));

  it('handles browsers without localStorage', function () {
    angular.mock.module(function ($provide) {
      $provide.decorator('$window', function ($delegate) {
        $delegate.localStorage = void 0;
        return $delegate;
      });
    });
    angular.mock.inject(function (ConvexCache) {
      var cache = new ConvexCache();
      cache.persist('', {});
      cache.fetch('');
    });
  });

  describe('API', function () {

    var ConvexCache, $cacheFactory, cache, $$cache;
    beforeEach(angular.mock.inject(function ($injector) {
      ConvexCache = $injector.get('ConvexCache');
      $cacheFactory = $injector.get('$cacheFactory');
    }));
    beforeEach(function () {
      cache = new ConvexCache('model');
      $$cache = cache.$$cache;
    });
    afterEach(function () {
      cache.destroy();
    });

    describe('Constructor', function () {

      it('names the cache', function () {
        expect(cache).to.have.property('$name', 'convex-model');
      });

      it('instantiates a cache with $cacheFactory', function () {
        expect(cache)
          .to.have.property('$$cache')
          .that.equals($cacheFactory.get(cache.$name));
      });

    });

    describe('#put', function () {

      it('puts a key/value pair into the cache', function () {
        expect(cache.put('key', 'value')).to.equal('value');
        expect(cache.get('key')).to.equal('value');
      });

    });

    describe('#get', function () {

      it('gets a value from the cache by key', function () {
        cache.put('key', 'value');
        expect(cache.get('key')).to.equal('value');
      });

    });

    describe('#remove', function () {

      it('removes a value from the cache by key', function () {
        cache.put('key', 'value');
        cache.remove('key');
        expect(cache.get('key')).to.be.undefined;
      });

    });

    describe('#removeAll', function () {

      it('removes all values from the cache', function () {
        cache.put('key', 'value');
        cache.removeAll();
        expect(cache.get('key')).to.be.undefined;
      });

    });

  });

});
