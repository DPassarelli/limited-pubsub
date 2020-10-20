# topico

[![Linux Build Status](https://img.shields.io/travis/DPassarelli/topico/master?label=Linux%20build&logo=travis)](https://travis-ci.org/DPassarelli/topico)
[![Windows Build Status](https://img.shields.io/appveyor/build/DPassarelli/topico/master?label=Windows%20build&logo=appveyor)](https://ci.appveyor.com/project/DPassarelli/topico?branch=master)
[![Coverage Status](https://img.shields.io/coveralls/github/DPassarelli/topico/master?logo=coveralls)](https://coveralls.io/github/DPassarelli/topico?branch=master)

**A JS pub/sub implementation that only allows for specific topics to be used. Works in [Node.js](https://nodejs.org) and web browsers.**

This project adheres to the `standard` coding style (click below for more information):

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard#javascript-standard-style)


## Justification for yet another pub/sub library...

I don't like using pubsub with string values for topics. I think that's just silly. I prefer using known, domain-specific values, which can be defined ahead of time, and referenced as a property of the instance (like an enumeration of sorts). I found myself writing the same boilerplate code over and over again to achieve this goal, and finally decided to build it into an [NPM](https://docs.npmjs.com) module.

And now for something completely different, I added a unique feature that I haven't (yet) found elsewhere...the ability to use pub/sub as a simple asynchronous request/response mechanism. It's kind of like [RPC](https://en.wikipedia.org/wiki/Remote_procedure_call), but entirely within your application. Instead of `require`ing or `import`ing other modules and calling methods on them, you can instead set them up to `listen` for specific messages, and then use the `respond` method to provide a direct answer to the caller (instead of simply `say`ing a message back to all listeners). This allows for a further level of abstraction or de-coupling, where appropriate. Please refer to the API documentation below for more information and examples.


## Getting Started

Install via [NPM](https://docs.npmjs.com/downloading-and-installing-packages-locally):

    npm install @dpassarelli/topico

Or [Yarn](https://yarnpkg.com/getting-started/usage#adding-a-dependency):

    yarn add @dpassarelli/topico

And add the reference inside your project's code:

```javascript
import pubsub from '@dpassarelli/topico' // or const pubsub = require('@dpassarelli/topico')

pubsub.listen(pubsub.topics.INFO, (info) => {
  console.log(info)
})

pubsub.say(pubsub.topics.INFO, 'hello, world!') // -> prints "hello, world!" on the console
```


## API

The object exported by this module acts as a singleton. There is no provision for multiple instances. 

### Properties

#### `topics` {Object}

The list of available topics are enumerated as the keys (properties) of this dictionary. The dictionary is [frozen](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze), thus immutable. The only way to add new entries is by calling the `addTopic()` method.

By default, this dictionary includes the keys `INFO` and `ERROR`.

#### `requestTTL` {Number}

The number of milliseconds to wait for a `request` to be fulfilled (see below). The default value is 4200.

### Methods

#### `addTopic({Array|String})` returns {undefined}

Adds one or more topics to the enumeration. You can call `addTopic` from anywhere in your code, but a topic can't be referred to before it has been added. As a result, it might be a good idea to add topics near the beginning of your application's entry point.

**Note that all topics are converted into UPPER CASE before being added, and attempts to add an existing topic more than once will be safely ignored.**

Example:

```javascript
pubsub.addTopic(['SESSION', 'User', 'log']) // this will result in new entries SESSION, USER, LOG

pubsub.addTopic('USER') // this will be safely ignored

pubsub.say(pubsub.topics.User, 'welcome') // this will throw an error, since `USER` exists, not `User`
```

#### `say({Symbol}, {any})` returns {undefined}

_Publishes data for a particular topic. All subscribers will be notified._

The first parameter to `say` must be a valid key from `topics`. Anything else, including any key not defined in `topics`, will throw an error.

The second parameter can be any data type. This value may be referred to as the "payload" elsewhere is this documentation.

Example:

```javascript
pubsub.say(pubsub.topics.ERROR, { timestamp: new Date(), sessionId: 'foo', userId: 'bar', error: e }) // OK

pubsub.say(error, {}) // throws
pubsub.say('ERROR', {}) // throws
pubsub.say(pubsub.topics.DNE, {}) // throws, assuming `DNE` has not already been added to the enum
```

#### `listen({Symbol}, {Function})` returns {undefined}

_Adds a subscription for a particular topic._

All functions are called asynchronously, and their order is not specified.

#### `listenOnce({Symbol}, {Function})` returns {undefined}

_Adds a one-time subscription for a particular topic._

Once this function executes, it will be removed, and cannot be called more than once.

#### `listenFor({Symbol}, {any primitive}, {Function})` returns {undefined}

_Adds a subscription for a particular topic that will automatically cancel immediately after the specified [primitive value](https://developer.mozilla.org/en-US/docs/Glossary/Primitive) is received._

This has the same behavior as `listenOnce()`; however, this callback will only be triggered once the specified value is seen.

#### `cancel({Symbol})` returns {undefined}

_Removes all registered listeners for the specified topic._

#### `cancelAll()` returns {undefined}

_Removes all registered listeners on all topics._

This may not be needed in production code, but it helps with clean up when testing.

#### `request({Symbol}, {any})` returns {Promise}

_Request a specific piece of information from a subscriber. The subscriber must reply using the `respond` method, not `say`. The promise will resolve with the value passed into `respond`._

This method wraps the `say` method, passing along a special payload to all listeners registered on the specified topic. This special payload is a plain object with the following properties:

| Property     | Type     | Purpose |
|--------------|----------|---------|
| `trackingNo` | {String} | A unique identifier for this request. When a listener wants to act on this request, it should call the `respond` method with the value of `__trackingNo__` as the first parameter. |
| `query`    | {any}    | The second parameter passed into `request`. |

The returned promise will be fulfilled with whatever value is passed into `respond` with the same tracking number, otherwise it will be rejected if no response is made within `requestTTL` seconds. This ensures that the promise will resolve one way or another within a definite period of time.

See below for a code example.

#### `respond({String}, {any})` returns {undefined}

_Responds to a previously requested piece of information._

Example:

```javascript
pubsub.addTopic('USER_DATA')

pubsub.listen('USER_DATA', (payload) => {
  if (payload.trackingNo) {
    // do some action based on payload.query
    pubsub.respond(payload.trackingNo, answer)
  }
})

pubsub
  .request(pubsub.topic.USER_DATA, { foo: bar })
  .then((answer) => {
    // this receives whatever value was passed into `respond`
  })
  .catch((err) => {
    // you will end up here if `respond` isn't called within `requestTTL` ms (by default, 4200)
    // err.message === 'No response received within the required time limit.'
  })
```

## License

Please refer to `LICENSE`.
