'use strict';

var angular = require('angular');

describe('ConvexRelation', function () {

  var Relation, MockModel;
  beforeEach(angular.mock.module(require('../../')));
  beforeEach(function () {
    MockModel = sinon.spy();
    MockModel.prototype.$name = 'mock';
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

    it('can receive a target fn directly', function () {
      var fn = function () {};
      expect(new Relation(null, fn))
        .to.have.property('target', fn);
    });

    it('gets the target from the injector', function () {
      expect(new Relation(null, 'MockModel'))
        .to.have.property('target', MockModel);
    });

    it('sets a foreign key for single relations', function () {
      expect(new Relation('belongsTo', 'MockModel'))
        .to.have.property('foreignKey', 'mock_id');
    });

    describe('key', function () {

      it('is the name for singular relations', function () {
        expect(new Relation('belongsTo', 'MockModel'))
          .to.have.property('key', 'mock');
      });

      it('is pluralized automatically for 1-to-many relations', function () {
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

    describe('belongsTo', function () {

      var model, relation;
      beforeEach(function () {
        model = {};
        relation = new Relation('belongsTo', 'MockModel');
      });

      it('references the related object for the foreign key', function () {
        relation.initialize(model);
        model.mock = {id: 'foo'};
        expect(model.mock_id).to.equal('foo');
      });

      it('creates a new related object when changing the key', function () {
        relation.initialize(model);
        model.mock_id = 'bar';
        expect(model.mock).to.be.an.instanceOf(MockModel);
        expect(MockModel).to.have.been.calledWithMatch({id: 'bar'});
      });

      it('is a noop when setting the key is a noop', function () {
        relation.initialize(model);
        model.mock = {
          id: 'bar'
        };
        var mock = model.mock;
        model.mock_id = 'bar';
        expect(model.mock).to.equal(mock);
      });

    });    

  });

});
