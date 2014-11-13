'use strict';

var angular = require('angular');

describe('ConvexRelation', function () {

  var Relation, MockModel, Collection;
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
    Collection = $injector.get('ConvexCollection');
  }));

  describe('Constructor', function () {

    it('sets the relation type', function () {
      expect(new Relation({
        type: 'belongsTo'
      }))
      .to.have.property('type', 'belongsTo');
    });

    it('can receive a target Model directly', function () {
      expect(new Relation({
        target: MockModel
      }))
      .to.have.property('target', MockModel);
    });

    it('can receive an injectable', function () {
      expect(new Relation({
        target: 'MockModel'
      }))
      .to.have.property('target', MockModel);
    });

    it('sets the key', function () {
      expect(new Relation({
        key: 'k'
      }))
      .to.have.property('key', 'k');
    });

    it('sets the foreign key to key_id by default', function () {
      expect(new Relation({
        type: 'belongsTo',
        key: 'key'
      }))
      .to.have.property('foreignKey', 'key_id');
    });

    it('can set a custom foreign key', function () {
      expect({
        type: 'belongsTo',
        key: 'key',
        foreignKey: 'fkey'
      })
      .to.have.property('foreignKey', 'fkey');
    });

    it('has no foreign key hasN relations', function () {
      expect({
        type: 'belongsTo',
        key: 'k',
        foreignKey: 'fkey'
      })
      .to.have.property('foreignKey', undefined);
    });

  });

  describe('#isSingle', function () {

    it('is true for belongsTo relations', function () {
      expect(Relation.prototype.isSingle.call({type: 'belongsTo'})).to.be.true;
    });

    it('is true for hasOne relations', function () {
      expect(Relation.prototype.isSingle.call({type: 'hasOne'})).to.be.true;
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
        relation = new Relation({
          type: 'belongsTo',
          target: 'MockModel',
          key: 'mock'
        });
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

    describe('hasMany', function () {

      var model, relation;
      beforeEach(function () {
        model = {
          $name: 'item',
          id: 1
        };
        relation = new Relation({
          type: 'hasMany',
          target: 'MockModel',
          key: 'mocks'
        });
        sinon.spy(Collection.prototype, '$related');
        relation.initialize(model);
      });

      it('instantiates a related collection bound to the target', function () {
        expect(model.mocks).to.be.an('array');
        expect(model.mocks.$$model).to.equal(MockModel);
      });

      it('attaches the parent', function () {
        expect(Collection.prototype.$related).to.have.been.calledWith('item', model);
      });

    });

  });

});
