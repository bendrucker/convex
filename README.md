convex [![Build Status](https://travis-ci.org/bendrucker/convex.svg?branch=master)](https://travis-ci.org/bendrucker/convex) [![Code Climate](https://codeclimate.com/github/bendrucker/convex/badges/gpa.svg)](https://codeclimate.com/github/bendrucker/convex) [![Test Coverage](https://codeclimate.com/github/bendrucker/convex/badges/coverage.svg)](https://codeclimate.com/github/bendrucker/convex) [![NPM version](https://badge.fury.io/js/convex.svg)](http://badge.fury.io/js/convex)
======

A powerful, opionated ORM for Angular with support for caching and batch operations. I built convex to scratch my own itch and use it actively in production at [Valet.io](http://www.valet.io). It makes a number of assumptions about how you build your APIs:

* Primary keys are UUIDs
* The batch endpoint handles the [batch-me-if-you-can](https://github.com/bendrucker/batch-me-if-you-can) protocol
* Querystrings are parsed according to the [qs](https://github.com/hapijs/qs) spec
* Nested objects can be expanded a la [Stripe](https://stripe.com/docs/api#expand)
* Foreign keys are named `{{object}}_id`

If convex is missing something you need or you can't abide by these assumptions, I welcome [issues and PRs](CONTRIBUTING.md).

## Requirements
Because convex uses `Object.defineProperty` for relations, it is not compatible with IE 8. Angular `<1.3` and earlier are not supported but Angular `1.2` should work.

[![Sauce Test Status](https://saucelabs.com/browser-matrix/convex.svg)](https://saucelabs.com/u/convex)

## Setup

```bash
$ npm install convex
```

```js
angular.module('myApp', [
  require('convex')
]);
```

`ConvexModel` is the core service in convex. It provides access to all convex features and creates the objects that will store your data.

## Creating Models

#### `ConvexModel.extend(prototype, constructor)` -> `ConvexModel`
Creates a new model contructor, adding methods to the prototype from `prototype` and to the constructor from `constructor`. `$name` is a required property in `prototype` and should be the lowercase, singular name of the object.

```js
var User = ConvexModel.extend({
  $name: 'user'
});
```

Because data is set directly on the instances of `ConvexModel`, you need to avoid collisions by ensuring that `prototype` properties never share the same name with your data properties. The easiest way to accomplish this is by prefixing methods with `$` and never using that prefix in your API responses.

#### `new ConvexModel([attributes])` -> `model`
Accepts an optional `attributes` objects with initial data to set on the model. If one of those attributes is an `id`, convex will look for an existing model with the same `id`. If one is found, convex will add any new `attributes` to that cached model and return it. If not, the new model will be cached. When `attributes.id` is omitted, it will be assigned as a new UUID.

```js
var uuid = require('uuid').v4();
var user1 = new User({id: uuid});
var user2 = new User({id: uuid});
user1 === user2 // true
```

## Model API

#### `$set([attributes])` -> `model`
Special setter method for handling related data. You can set data normally, but `$set` will automatically handle delegating nested objects to a related model where appropriate. It plays an important internal role but you may never actually need to use it.

#### `$path([instance])` -> `string`
Pluralizes the `$name` and adds the `id` to generate the path to the resource. If `instance` is `false` the path omits the `id`. 

```js
user.$path(); // '/users'
user.$path(user.id); '/users/5d6b6...'
```

#### `$reset()` -> `model`
Removes all data

#### `$clone()` -> `model`
Copies the original model's data to a new model with a new `id`.

#### `$fetch([options])` -> `promise(model)`
Fetches the model data from the remote server. Sets received data on the `model`. This is a noop unless an id was passed when creating the `model` or it has already been saved.

`GET /users/5d6b6...` responds with:

```json
{
  "id": "5d6b6...",
  "name": "Ben"
}
```

```js
user.$fetch().then(function (user) {
  user.name === 'Ben' // true
});
```

#### `$save([options])` -> `promise(model)`
Saves the model to the server. Intelligently chooses between a `POST` and `PUT` request based on whether the model has been saved before or provided an `id` to the constructor. [Related data](#relations-api) will be automatically excluded from the request payload.

```js
user.name = 'Ben Drucker';
user.$save().then(function (user) {
  // Successful request:
  // PUT /users/5d6b6...
});
```

#### `$delete([options])` -> `promise(model)`
Deletes the model if it has been saved and removes all other references. Also sets `model.$deleted = true` in case you're referencing the model directly anywhere in your application.

```js
user.$delete().then(function (user) {
  user.$deleted === true; // true
});
```
<a name="Model-where"></a>
#### `Model.$where([query], [options])` -> `promise(collection)`

Gets an array of models using the `query` to construct a querystring to filter the results.

`GET /users?admin=true` responds with:

```json
[
  {
    "id": "5d6b6...",
    "name": "Ben",
    "admin": true
  }
]
```

```js
User.$where({admin: true}).then(function (users) {
  users.length === 1 // true
  users[0] instanceof User // true
  users[0].name === 'Ben' // true
});
```

#### `Model.$all([options])` -> `promise(collection)`

Gets an array of models. Equivalent to calling `Model.$where(undefined)`. 

## Collection API

The Collection API implements a decorated array. It can be passed to directives like `ngRepeat` but also provides special methods for working with models.

#### `new ConvexCollection(Model, [models])` -> `collection`
Creates a new collection that uses the provided `Model` to cast data. The optional `models` argument is an array of models or model data that will be passed to `collection.$push`.

#### `collection.$attributes([attributes]) -> `attributes`
Sets attributes (an object) with data that will appear on all models when added with `$push`. When called with no arguments it will return the existing attributes. This is used by relations to allow empty models to automatically be associated with the parent:

```js
var User = ConvexModel.extend({
  $name: 'user'
});
var Project = ConvexModel.extend({
  $name: 'project'
});
User.hasMany(Project);
var user = new User({
  id: '5d6b6...'
});
user.projects.$attributes().user_id === '5d6b6...' // true
user.projects.push({
  title: 'convex'
  awesome: true
});
user.projects[0].user === user // true
```

#### `collection.$push(modelOrObject...)` -> `collection`
Similar to `Array.prototype.push` but can handle either `Model` instances or plain objects that will be cast as models.

#### `collection.$fetch([query], [options])` -> `promise(collection)`
Requests an array of data and casts is to `Model` instances, filtering it by setting `query` as the querystring. [`Model.$where`](#Model-where) uses this method.


## Batch API

Convex can construct batch requests that wrap multiple request configurations into a single payload. This is especially useful for applications designed for mobile use since high latency makes multiple requests particularly costly. Convex will automatically assemble this payload and handle fulfilling the requests as if they were each made individually.

For more detail on how your server should handle batch requests, refer to the [batch-me-if-you-can protocol](https://github.com/bendrucker/batch-me-if-you-can/blob/master/SCHEMA.md).

#### `model.$batch(callback)` -> `promise(requests)`

Calls the provided `callback` with `batch` (a [`ConvexBatch`](src/batch.js) instance). All REST methods can pass this as `batch` in `options`. `$batch` returns a promise that is resolved with the return value (or resolution if a promise is returned) of `callback`. All individual requests and promises are also resolved/rejected directly.

```js
var user1 = new User({name: 'Ben'});
var user2 = new User({name: 'Ben2'});

user1.$batch(function (batch) {
  return $q.all([
    user1.$save({batch: batch})
      .then(function (user) {
        console.log('User 1 saved', user);
      }),
    user2.$save({batch: batch})
      .then(function (user) {
        console.log('User 2 saved', user);
      })
  ]);
})
.then(function (users) {
  console.log('All users saved successfully', users);
})
.catch(function (err) {
  console.log('One or more users failed to save:', err);
});
```

#### `batch.parallel([setting])` -> `boolean`

When called with no arguments, returns the setting (defaults to `true`). When an argument is provided, it sets the `parallel` setting for the batch.

## Relations API

Convex can help managed related data and cast it into real models. Combined with the [Batch](#batch-api) and [Cache](#cache-api) APIs, relations provide a powerful means to minimize requests and keep data in sync within your application. 

#### `Model.belongsTo(Target, key, [options])` -> `Model`
Creates a new *belongsTo* relation on `Model` where `model` instances are expected to have a `{{key}}_id` (or `options.foreignKey`) foreign key. `Target` can be a `ConvexModel` instance or a string that represents an injectable service.

`GET /users/5d6b6...` responds with:

```json
{
  "name": "Ben",
  "family_id": "9f8mc..."
}
```

```js
app
  .factory('User', function (ConvexModel) {
    return ConvexModel.extend({
      $name: 'family'
    })
    .belongsTo('Family');
  })
  .factory('Family', function (ConvexModel) {
    return ConvexModel.extend({
      $name: 'family',
      $plural: 'families'
    });
  })
  .run(function (User, Family) {
    new User({id: '5d6b6...'})
      .$fetch()
      .then(function (user) {
        user.family instanceof Family // true
        user.family_id === user.family.id // true
      });
  });
```

#### `Model.hasOne(Target, key, [options])` -> `Model`
Creates a new `hasOne` relation on `Model` where one `Target` instance is expected to have a `{{key}}_id` that references each `model`.

#### `Model.hasMany(Target, key, [options])` -> `Model`
Creates a new `hasMany` relation on `Model` where many `Target` instances are expected to have a `{{key}}_id` that references each `model`.

### Requesting Related Data

All requests can accept an array in `options.expand` that will be added to the query object before it is formatted with [qs](https://github.com/hapijs/qs). Nested expansion can be requested using dot syntax. Your API is expected to handle the `expand` querystring array and return the requested related data.

Expansion is only supported for `GET` requests. If you wish to save multiple objects without multiple requests to your remote API, you should use the [Batch API](#batch-api).

`GET /families/9f8mc...` responds with:

```json
{
  "id": "9f8mc...",
  "surname": "Drucker"
}
```

```js
user.$fetch({
  expand: ['family']
})
.then(function (user) {
  user.family.surname === 'Drucker'; // true
});
```


## Cache API
Any `GET` request can be cached either for the duration of the page session or permanently in local storage. `options.cache` controls caching behavior for requests. Passing `true` will cache in memory while `'persist'` will cache to local storage and memory.

```js
model.$fetch({
  cache: 'persist'
});
```

Even after restarting the browser, rerunning the above example will retrieve the data from local storage instead of performing a new request. Convex's own in-memory cache will always be checked before falling back to local storage. To request fresh data, just omit the `cache` option. To force a refresh of the cache, pass the `force` option and set the `cache` option to the desired cache level. A remote request will be performed and the response will overwrite the old cache. 
