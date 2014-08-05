'use strict';

var angular = require('angular');

describe('ConvexCache', function () {

  beforeEach(angular.mock.module(require('../../')));

  it('handles browsers without localStorage', function () {
    angular.mock.module(function ($provide) {
      $provide.decorator('$window', function () {
        return {};
      });
    });
    angular.mock.inject(function (ConvexCache) {
      var cache = new ConvexCache();
      cache.get('', true);
      cache.put('', {}, true);
      cache.remove();
      cache.destroy();
    });
  });

  describe('API', function () {

    var ConvexCache, $cacheFactory, ls, $window, cache, $$cache;
    beforeEach(angular.mock.inject(function ($injector) {
      ConvexCache = $injector.get('ConvexCache');
      $cacheFactory = $injector.get('$cacheFactory');
      $window = $injector.get('$window');
      ls = $window.localStorage;
      cache = new ConvexCache('model');
      $$cache = cache.$$cache;
    }));
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

      it('can put a key/value pair into local storage', function () {
        cache.put('key', 'value', true);
        expect(ls.getItem('convex-key')).to.equal('"value"');
      });

    });

    describe('#get', function () {

      it('gets a value from the cache by key', function () {
        cache.$$cache.put('key', 'value');
        expect(cache.get('key')).to.equal('value');
      });

      it('can get from local storage', function () {
        ls.setItem('convex-foo', '{}');
        expect(cache.get('foo')).to.be.undefined;
        expect(cache.get('foo', true)).to.not.be.undefined;
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

      it('removes all values from the memory cache', function () {
        cache.put('key', 'value');
        cache.removeAll();
        expect(cache.get('key')).to.be.undefined;
      });

      it('removes only prefixed values from ls', function () {
        cache.removeAll();
        expect(ls.getItem('convex-key')).to.be.null;
        expect(ls.getItem('key2')).to.equal('foo');
      });

    });

  });

});
