'use strict';

var angular = require('angular');

require('../../src');

describe('BaseModelProvider', function () {

  beforeEach(angular.mock.module('valet-base-model'));

  describe('baseURL', function () {

    it('sets a default', angular.mock.inject(function (BaseModel) {
      expect(BaseModel.prototype.baseURL).to.equal('https://api.valet.io');
    }));

    it('can set the baseURL', function () {
      angular.mock.module(function (BaseModelProvider) {
        BaseModelProvider.baseURL = 'base';
      });
      angular.mock.inject(function (BaseModel) {
        expect(BaseModel.prototype.baseURL).to.equal('base');
      });
    });

  });

});