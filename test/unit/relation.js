'use strict';

var angular = require('angular');

require('../../src');
require('angular-mocks');

describe('BaseModel', function () {

  var Relation, MockModel;
  beforeEach(angular.mock.module('valet-base-model'));
  beforeEach(function () {
    MockModel = sinon.spy();
    MockModel.prototype.objectName = 'mock';
  });
  beforeEach(angular.mock.module(function ($provide) {
    $provide.value('MockModel', MockModel);
  }));
  beforeEach(angular.mock.inject(function ($injector) {
    Relation = $injector.get('ModelRelation');
  }));

  describe('Constructor', function () {

    it('sets the relation type', function () {
      expect(new Relation('belongsTo', 'MockModel'))
        .to.have.property('type', 'belongsTo');
    });

    it('gets the target from the injector', function () {
      expect(new Relation(null, 'MockModel'))
        .to.have.property('target', MockModel);
    });

    it('sets the target name for easy access', function () {
      expect(new Relation(null, 'MockModel'))
        .to.have.property('targetName', 'mock');
    });

    describe('key', function () {

      it('is the name for singular relations', function () {
        expect(new Relation('belongsTo', 'MockModel'))
          .to.have.property('key', 'mock');
      });

      it('is pluralized for 1-to-many relations', function () {
        expect(new Relation('hasMany', 'MockModel'))
          .to.have.property('key', 'mocks');
      });

    });

  });

  var relation;

  describe('#isSingle', function () {

    it('is true for belongsTo relations', function () {
      expect(Relation.prototype.isSingle.call({type: 'belongsTo'})).to.be.true;
    });

    it('is false for hasMany relations', function () {
      expect(Relation.prototype.isSingle.call({type: 'hasMany'})).to.be.false;
    });

  });

  describe('#initialize', function () {

    var model;
    beforeEach(function () {
      model = {};
    });

    it('attaches a new target model by id for single relations', function () {
      model.mock_id = 0;
      new Relation('belongsTo', 'MockModel').initialize(model);
      expect(model)
        .to.have.property('mock')
        .that.is.an.instanceOf(MockModel);
      expect(MockModel).to.have.been.calledWithMatch({id: 0});
    });

    it('attaches a collection for 1-many relations', function () {
      new Relation('hasMany', 'MockModel').initialize(model);
      expect(model)
        .to.have.property('mocks')
        .with.property('model', MockModel);
    });

  });

});