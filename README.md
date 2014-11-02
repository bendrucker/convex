convex [![Build Status](https://travis-ci.org/bendrucker/convex.svg?branch=master)](https://travis-ci.org/bendrucker/convex) [![Code Climate](https://codeclimate.com/github/bendrucker/convex/badges/gpa.svg)](https://codeclimate.com/github/bendrucker/convex) [![Test Coverage](https://codeclimate.com/github/bendrucker/convex/badges/coverage.svg)](https://codeclimate.com/github/bendrucker/convex) [![NPM version](https://badge.fury.io/js/convex.svg)](http://badge.fury.io/js/convex)
======

A powerful, opionated ORM for Angular with support for caching and batch operations. I built convex to scratch my own itch and use it actively in production at [Valet.io](http://www.valet.io). It makes a number of assumptions about how you build your APIs:

* Primary keys are UUIDs
* The batch endpoint handles the [batch-me-if-you-can](https://github.com/bendrucker/batch-me-if-you-can) protocol
* Querystrings are parsed according to the [qs](https://github.com/hapijs/qs) spec
* Nested objects can be expanded a la [Stripe](https://stripe.com/docs/api#expand)
* Foreign keys are named `{{object}}_id`

If convex is missing something you need or you can't abide by these assumptions, I welcome [issues and PRs](CONTRIBUTING.md).

## Setup

```bash
$ npm install convex
```

```js
angular.module('myApp', [
  require('convex')
]);
```

## ConvexModel

### Creating Models

#### `ConvexModel.extend(prototype, constructor)` -> `ConvexModel`
Creates a new model contructor, adding methods to the prototype from `prototype` and to the constructor from `constructor`. `$name` is a required property in `prototype` and should be the lowercase, singular name of the object.

```js
var User = ConvexModel.extend({
  $name: 'user'
});
```

Because data is set directly on the instances of `ConvexModel`, you need to avoid collisions by ensuring that `prototype` properties never share the same name with your data properties. The easiest way to accomplish this is by prefixing methods with `$` and never using that prefix in your API responses.

#### `new ConvexModel(attributes)` -> `model`
Accepts an optional `attributes` objects with initial data to set on the model. If one of those attributes is an `id`, convex will look for an existing model with the same `id`. If one is found, convex will add any new `attributes` to that cached model and return it. If not, the new model will be cached. When `attributes.id` is omitted, it will be assigned as a new UUID.

```js
var uuid = require('uuid').v4();
var user1 = new User({id: uuid});
var user2 = new User({id: uuid});
user1 === user2 // true
```

### Model Methods

#### `$set(attributes)` -> `model`
Special setter method for handling related data. You can set data normally, but `$set` will automatically handle delegating nested objects to a related model where appropriate. It plays an important internal role but you may never actually need to use it.

#### `$path(id)` -> `String`
Pluralizes the `$name` to generate the path to the resource. If `id` is provided the path includes the resource `id`. 

```js
user.$path(); // '/users'
user.$path(user.id); '/users/5d6b6...'
```

#### `$reset` -> `model`
Removes all data

#### `$clone` -> `model`
Copies the original model's data to a new model with a new `id`.
