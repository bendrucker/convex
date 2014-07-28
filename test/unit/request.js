'use strict';

var angular = require('angular');

describe('ConvexRequest', function () {

  var ConvexRequest, convexConfig, $httpBackend;
  beforeEach(angular.mock.module(require('../../')));
  beforeEach(angular.mock.inject(function ($injector) {
    ConvexRequest = $injector.get('ConvexRequest');
    convexConfig = $injector.get('convexConfig');
    $httpBackend = $injector.get('$httpBackend');
  }));

  describe('Constructor', function () {

    it('stores the configuration', function () {
      var config = {};
      expect(new ConvexRequest(config)).to.have.property('config', config);
    });

    it('creates a deferred', function () {
      expect(new ConvexRequest())
        .to.have.deep.property('deferred.promise');
    });

  });

  describe('#url', function () {

    it('can use a specific url', function () {
      expect(ConvexRequest.prototype.url.call({
        config: {
          url: 'url'
        }
      }))
      .to.equal('url');
    });

    it('can use a specific base', function () {
      expect(ConvexRequest.prototype.url.call({
        config: {
          base: 'base'
        }
      }))
      .to.equal('base/');
    });

    it('falls back to the global base', function () {
      convexConfig.base = 'gbase'
      expect(ConvexRequest.prototype.url.call({
        config: {}
      }))
      .to.equal('gbase/');
    });

    it('appends a path', function () {
      expect(ConvexRequest.prototype.url.call({
        config: {
          base: 'base',
          path: '/path'
        }
      }))
      .to.equal('base/path');
    });

  });

});
