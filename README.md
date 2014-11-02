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

#### `ConvexModel.extend(prototype, constructor)` -> `ConvexModel`
Creates a new model contructor, adding methods to the prototype from `prototype` and to the constructor from `constructor`. `$name` is a required property in `prototype` and should be the lowercase, singular name of the object.

```js
var User = ConvexModel.extend({
  $name: 'user'
});
```

Because data is set directly on the instances of `ConvexModel`, you need to avoid collisions by ensuring that `prototype` properties never share the same name with your data properties. The easiest way to accomplish this is by prefixing methods with `$` and never using that prefix in your API responses.
