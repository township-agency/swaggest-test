# swaggest-test
Here at [Motel](http://motel.is) we are starting to use Swagger more to properly build out and document our APIs. Once we found [swagger-test](https://github.com/earldouglas/swagger-test), we fell in love. However, our intense lust soon died out to the reality of a very small library with no updates and very little support. We tried to make our own [improvements](https://github.com/MotelIs/swagger-test), but the API/parsing of swagger-test didn't cut it. For this reason, we decided that if it was going to be done right, we had to do it ourselves.

## Setup
`npm install swaggest-test`

## Swagger
Setting up tests with a swagger spec has never been easier! Once you have a route and method defined in swagger, simply add an `x-test` section after your parameters & responses, for example:
```yaml
paths:
  /pets:
    get:
      description: Returns all pets from the system that the user has access to
      parameters: <blah>
      responses:
        '200': <blah>
      x-test:
        <blah>
```

The `x-test` section should look something like this:
```yaml
  x-test:
    - description: Return 50 dogs/cats
      request:
        headers:
          content-type: application/json
        parameters:
          tags:
            - dogs
            - cats
          limit: 50
          token: $TOKEN
      response:
        '200':
```

Note that parameters are simply given a value, the type (body, query, path) is grabbed from the API specification, so you don't have to worry about specifying that. At the moment, swaggest-test only has the ability to check the response code of the response, but will very soon be able to build more complete checks for responses. The description is a description that you will be able to access when it comes time to run your test, so it's good to know what's going on.

Also important to note that parameters that have a value starting with '$' are variables. You can pass these to swaggest-test and they will get filled in before the tests are generated.

Once your swagger file is setup, export it into .json and you can use it for the tool and the library!

## Tool
Swaggest-test includes a tool called `flat-white` which will run mocha based tests off of your swagger.json file, without the need for any setup. If you install swaggest-test globally via npm with `npm install -g swaggest-test`, you can run `flat-white swagger.json` and it will parse your swagger file and run your tests.

Have variables? Cool! Flat-white reads your environment variables, so you can either define them in your shell or create a file named `.env` that looks something like this
```
TOKEN=himom
```

This will fill in your `$TOKEN` variable with `himom`

## Library
The library generates test objects that you can use to run mocha (or other, but we recommend sticking to mocha) tests from.

To start, import everything and let swaggest-test parse it:
```javascript
var fs = require('fs');
var swaggestTest = require('./lib/swaggest-test');
var spec = JSON.parse(fs.readFileSync(__dirname + '/swagger.json'));
var tests = swaggestTest.parse(spec, {TOKEN: 'himom'});
```
The big thing to note here is that when parsing, we have to also pass our "variables" object so that our "$" variables can be filled in. In this case, `$TOKEN` will be replaced by `'himom'`.

The resulting 'tests' will be an Object with keys for each route. Each route then also has keys for each method. Inside each method is a list containing the tests. These tests can be run as follows:
```javascript
var preq = require('preq');
it(test.description, function() {
  return preq(test.request)
    .then(function (response) {
      swaggestTest.assert(test.response, response);
    }, function (response) {
      swaggestTest.assert(test.response, response);
    });
});
```

We highly recommend that you use our assert function rather than writing your own. This ensures future changes to the response object are always updated in the assert function.

All together, we recommend running something like this in a tests.json:
```javascript
var fs = require('fs')
  , preq = require('preq');
var swaggerTest = require('../lib/swaggest-test');

describe('test api calls', function () {
  var spec = JSON.parse(fs.readFileSync(__dirname + '/../swagger.json'));
  var tests = swaggerTest.parse(spec, {TOKEN: 'himom'});

  for (var route in tests) {
    for (var method in tests[route]) {
      var describeStr = 'Testing ' + method + ' ' + route;
      describe(describeStr, function () {
        tests[route][method].forEach(function (test) {
          it(test.description, function () {
            return request(test.request)
              .then(function (response) {
                swaggestTest.assert(test.response, response);
              }, function (response) {
                swaggestTest.assert(test.response, response);
              });
          });
        });
      });
    }
  }
});
```

In fact, that's exactly how our command line tool `flat-white` does it. If you want to just run the tests and don't care about building them yourself, simply run `bin/flat-white swagger.json` and it'll do all of the work for you.

WOOHOO! Automated tests generated using the swagger spec. Go you!

## References
This library was originally based off of [swagger-test](https://github.com/earldouglas/swagger-test), but has been changed almost entirely.
