'use strict';

var angular = require('angular');
var uuid    = require('node-uuid');

describe('ConvexCache', function () {

  beforeEach(angular.mock.module(require('../../')));

  it('handles browsers without localStorage', function () {
    angular.mock.module(function ($provide) {
      $provide.decorator('$window', function () {
        return {};
      });
    });
    angular.mock.inject(function (ConvexCache, $window, $timeout) {
      var cache = new ConvexCache();
      cache.persist('', {});
      cache.fetch('');
      $timeout.flush();
      cache.remove();
      cache.destroy();
    });
  });

  describe('API', function () {

    var ConvexCache, $cacheFactory, $window, $timeout, cache, $$cache;
    beforeEach(angular.mock.inject(function ($injector) {
      ConvexCache = $injector.get('ConvexCache');
      $cacheFactory = $injector.get('$cacheFactory');
      $window = $injector.get('$window');
      $timeout = $injector.get('$timeout');
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

    });

    describe('#get', function () {

      it('gets a value from the cache by key', function () {
        cache.$$cache.put('key', 'value');
        expect(cache.get('key')).to.equal('value');
      });

    });

    describe('#persist', function () {

      it('persists a value to localStorage by key', function () {
        cache.persist('key', {foo: 'bar'});
        expect($window.localStorage.getItem('convex-key'))
          .to.equal(JSON.stringify({foo: 'bar'}));
        $timeout.flush();
      });

    });

    describe('#fetch', function () {

      it('fetchs a value from localStorage by key', function () {
        cache.persist('key', {foo: 'bar'});
        $timeout.flush();
        expect(cache.fetch('key')).to.eventually.deep.equal({foo: 'bar'});
        $timeout.flush();
      });

    });

    describe('#remove', function () {

      it('removes a value from the cache by key', function () {
        cache.put('key', 'value');
        cache.persist('key', 'value');
        $timeout.flush();
        cache.remove('key');
        expect(cache.get('key')).to.be.undefined;
        expect(cache.fetch('key')).to.eventually.be.null;
        $timeout.flush();
      });

    });

    describe('#removeAll', function () {

      it('removes all values from the memory cache', function () {
        cache.put('key', 'value');
        cache.removeAll();
        expect(cache.get('key')).to.be.undefined;
      });

      it('removes only prefixed values from localStorage', function () {
        cache.persist('key', 'value');
        $timeout.flush();
        localStorage.setItem('key2', 'foo');
        cache.removeAll();
        expect(localStorage.getItem('convex-key')).to.be.null;
        expect(localStorage.getItem('key2')).to.equal('foo');
      });

    });

  });

});
