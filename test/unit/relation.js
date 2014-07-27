'use strict';

var angular = require('angular');

describe('ConvexRelation', function () {

  var Relation, MockModel;
  beforeEach(angular.mock.module(require('../../')));
  beforeEach(function () {
    MockModel = sinon.spy();
    MockModel.prototype.objectName = 'mock';
  });
  beforeEach(angular.mock.module(function ($provide) {
    $provide.value('MockModel', MockModel);
  }));
  beforeEach(angular.mock.inject(function ($injector) {
    Relation = $injector.get('ConvexRelation');
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

  describe('#isSingle', function () {

    it('is true for belongsTo relations', function () {
      expect(Relation.prototype.isSingle.call({type: 'belongsTo'})).to.be.true;
    });

    it('is false for hasMany relations', function () {
      expect(Relation.prototype.isSingle.call({type: 'hasMany'})).to.be.false;
    });

  });

  describe('#initialize', function () {

    describe('n-to-1 relations', function () {

      it('returns a new related model using the foreign key', function () {
        expect(new Relation('belongsTo', 'MockModel').initialize({
          mock_id: 0
        }))
        .to.be.an.instanceOf(MockModel);
        expect(MockModel).to.have.been.calledWithMatch({id: 0});
      });

      it('extends the model with existing data', function () {
        expect(new Relation('belongsTo', 'MockModel').initialize({
          mock: {
            id: 0,
            name: 'mock'
          }
        }))
        .to.be.an.instanceOf(MockModel)
        .and.to.contain({
          id: 0,
          name: 'mock'
        });
      });

    });

    describe('n-to-many relations', function () {

      it('returns a collection', function () {
        expect(new Relation('hasMany', 'MockModel').initialize({}))
          .to.have.property('add');
      });

      it('casts an existing collection of data', function () {
        expect(new Relation('hasMany', 'MockModel').initialize({
          mocks: [
            {id: 0},
            {id: 1}
          ]
        }))
        .to.have.length(2);
        expect(MockModel)
          .to.have.been.calledWithMatch({id: 0})
          .and.calledWithMatch({id: 1});
      });

    });

  });

});