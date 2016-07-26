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
          headers:
            content-type: application/json
          schema:
            message: 'SUCCESS'
```

Note that parameters are simply given a value, the type (body, query, path) is grabbed from the API specification, so you don't have to worry about specifying that. At the moment, swaggest-test only has the ability to check the response code of the response, but will very soon be able to build more complete checks for responses. The description is a description that you will be able to access when it comes time to run your test, so it's good to know what's going on.

Using `$ref` in parameters e.g. `- $ref: '#/parameters/test'` is allowed, as well as using `$ref` in the body schema, like `schema: $ref: '#/parameters/test'`.

Also important to note that parameters that have a value starting with '$' are variables. You can pass these to swaggest-test and they will get filled in before the tests are generated.

Last thing to discuss is the response. By default, we check types and required values as specified in your specification. Past that, you can define a "schema" which essentially functions as a checker for the JSON response. In our example, the JSON returned would have to have the parameter "message" set to "SUCCESS".

Once your swagger file is setup, export it into .json and you can use it for the tool and the library!

## Tool
Swaggest-test includes a tool called `flat-white` which will run mocha based tests off of your swagger.json file, without the need for any setup. If you install swaggest-test globally via npm with `npm install -g swaggest-test`, you can run `flat-white swagger.json` and it will parse your swagger file and run your tests.

Have variables? Cool! Flat-white reads your environment variables, so you can either define them in your shell or create a file named `.env` that looks something like this
```
TOKEN=himom
```

This will fill in your `$TOKEN` variable with `himom`

## Library
The swaggest-test library generates and runs mocha-based tests for you, using a simple function.

```javascript
var swaggestTest = require('swaggest-test');
swaggestTest.runTests(__dirname + '/swagger.json', {TOKEN: 'himom'});
```

If you put that in a file and run it with mocha, swaggest-test will parse your swagger file, and run the tests. For simplicity's sake, swaggest-test runs all tests asynchronously, so you don't have to worry about overlapping network requests.

## References
This library was originally based off of [swagger-test](https://github.com/earldouglas/swagger-test), but has been changed almost entirely.

Also huge thanks to [@saminakh](https://github.com/saminakh) and her work on the Motel swagger-test branch. She did some great work and inspired me to continue making improvements to this library!
