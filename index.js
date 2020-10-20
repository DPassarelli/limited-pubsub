'use strict'

const debug = require('debug')('topico')
const pubsub = require('mitt')()
const uid = require('ulid').ulid

/**
 * The list of valid topics, which is used to create the enumeration. This list
 * will grow as new topics are added.
 * @type {Array}
 */
const validTopics = [
  /**
   * This topic is intended for general announcements regarding expected
   * activity. It should not be used for reporting errors or other unplanned
   * events.
   */
  'INFO',

  /**
   * This topic is intended for information about any errors that occur.
   */
  'ERROR'
]

/**
 * The enumeration of valid topics.
 * @type {Object}
 */
let topicEnum = {}

/**
 * The number of milliseconds to wait before "timing out" a pending request.
 * @type {Number}
 */
let requestTTL = 4200

/**
 * Returns a frozen object that represents the current enumeration of valid
 * topics. The "enumeration" is really just a hashtable (or dictionary) with
 * each topic represented by a key and unique value.
 *
 * When calling this function, the existing enumeration must be supplied in
 * order to carry over existing Symbol values.
 *
 * @return {Object}
 */
function createTopicEnumeration (existingEnum, topicNames) {
  const dictionary = {}

  topicNames.forEach((name) => {
    if (Object.hasOwnProperty.call(existingEnum, name)) {
      dictionary[name] = existingEnum[name]
    } else {
      dictionary[name] = Symbol(name)
    }
  })

  return Object.freeze(dictionary)
}

/**
 * Retuns the name of the topic if found in the enumeration, otherwise `null`.
 *
 * @param  {Symbol}    topic   The value to check.
 *
 * @return {String?}
 */
function validate (topic) {
  const topicName = (topic ? topic.toString() : '')

  if (topicName.length > 0) {
    const match = validTopics.filter((key) => { return (topicName === `Symbol(${key})`) })

    if (match.length > 0) {
      return match[0]
    }
  }

  return null
}

class TopicalPubSub {
  constructor () {
    topicEnum = createTopicEnumeration({}, validTopics)
  }

  /**
   * Returns the current enumeration of valid topics.
   *
   * @return {Object}
   */
  get topics () {
    return topicEnum
  }

  get requestTTL () {
    return requestTTL
  }

  set requestTTL (value) {
    if (typeof value !== 'number') {
      throw new Error('The new value for "requestTTL" must be numeric.')
    }

    requestTTL = value
  }

  /**
   * Adds one or more topics to the enumeration.
   *
   * @param  {Array|String}   newTopicNames   The name(s) of the topic(s) to
   *                                          add. Each name will be converted
   *                                          to uppercase, and if the enum
   *                                          already contains the name, then
   *                                          it will not be re-added.
   *
   * @return {undefined}
   */
  addTopic (newTopicNames) {
    let names = null

    if (Array.isArray(newTopicNames)) {
      names = Array.from(newTopicNames)
    } else {
      names = [newTopicNames]
    }

    names.forEach((name) => {
      if (name == null || (name.toString() !== name)) {
        throw new Error('The "name" parameter for "addTopic()" is required and must be a string (or an array of strings).')
      }

      const formattedName = name.toUpperCase()

      // Avoid adding duplicate entries.
      if (!~validTopics.indexOf(formattedName)) {
        debug('Adding new topic "%s"', formattedName)
        validTopics.push(formattedName)
      }
    })

    topicEnum = createTopicEnumeration(topicEnum, validTopics)
  }

  /**
   * Adds a subscription for a particular topic.
   *
   * @param  {Symbol}      topic      One of `TopicalPubSub.prototype.topics`.
   *
   * @param  {Function}    callback   The function to call when data is published.
   *
   * @return {undefined}
   */
  listen (topic, callback) {
    const topicName = validate(topic)

    if (!topicName) {
      throw new TypeError('The "topic" parameter for "listen()" is required and must be a value from "topics".')
    }

    if (typeof callback !== 'function') {
      throw new TypeError('The "callback" parameter for "listen()" is required and must be a function.')
    }

    pubsub.on(topicName, callback)
    debug('Registered listener on topic "%s"', topicName)
  }

  /**
   * Adds a one-time subscription for a particular topic.
   *
   * @param  {Symbol}      topic      One of `TopicalPubSub.prototype.topics`.
   *
   * @param  {Function}    callback   The function to call when data is published.
   *
   * @return {undefined}
   */
  listenOnce (topic, callback) {
    const topicName = validate(topic)

    if (!topicName) {
      throw new TypeError('The "topic" parameter for "listenOnce()" is required and must be a value from "topics".')
    }

    if (typeof callback !== 'function') {
      throw new TypeError('The "callback" parameter for "listenOnce()" is required and must be a function.')
    }

    /**
     * Create a special property that will flag this callback for removal after
     * it is called the first time. Functions as objects FTW!
     */
    callback.__onlyOnce__ = true

    pubsub.on(topicName, callback)
    debug('Registered one-time listener on topic "%s"', topicName)
  }

  /**
   * Adds a subscription for a particular topic that will automatically cancel
   * immediately after the specified primitive value is received.
   *
   * @param  {Symbol}     topic      One of `TopicalPubSub.prototype.topics`.
   *
   * @param  {[type]}     value      The primitive value to watch for.
   *
   * @param  {Function}   callback   The function to call when data is published.
   *
   * @return {undefined}
   */
  listenFor (topic, value, callback) {
    const topicName = validate(topic)

    if (!topicName) {
      throw new TypeError('The "topic" parameter for "listenFor()" is required and must be a value from "topics".')
    }

    /**
     * A list of all primitive value types. Found at
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures
     * @type {Array}
     */
    const primitives = [
      'boolean',
      'number',
      'string',
      'bigint',
      'symbol'
    ]

    if (value == null || !~primitives.indexOf(typeof value)) {
      throw new TypeError('The "value" parameter for "listenFor()" is required and must be a primitive value.')
    }

    if (typeof callback !== 'function') {
      throw new TypeError('The "callback" parameter for "listenFor()" is required and must be a function.')
    }

    const fn = (payload) => {
      if (payload === value) {
        process.nextTick(callback) // let this run async
        pubsub.off(topicName, fn)
      }
    }

    pubsub.on(topicName, fn)
  }

  /**
   * Publishes data for a particular topic. All subscribers will be notified.
   *
   * @param  {Symbol}      topic   One of `TopicalPubSub.prototype.topics`.
   *
   * @param  {any}         data    The value to publish.
   *
   * @return {undefined}
   */
  say (topic, data) {
    const topicName = validate(topic)

    if (!topicName) {
      throw new TypeError('The "topic" parameter for "say()" is required and must be a value from "topics".')
    }

    debug('Saying %o on topic "%s"', data, topicName)
    pubsub.emit(topicName, data)

    if (pubsub.all.has(topicName)) {
      debug('Removing one-time listeners...')

      pubsub.all
        .get(topicName)
        .filter((fn) => { return fn.__onlyOnce__ })
        .forEach((fn) => {
          pubsub.off(topicName, fn)
        })

      debug('...done')
    }
  }

  /**
   * Removes all registered listeners for the specified topic.
   *
   * @param  {Symbol}      topic   One of `TopicalPubSub.prototype.topics`.
   *
   * @return {undefined}
   */
  cancel (topic) {
    const topicName = validate(topic)

    if (!topicName) {
      throw new TypeError('The "topic" parameter for "cancel()" is required and must be a value from "topics".')
    }

    debug('Dropping all listeners on topic "%s"', topicName)
    pubsub.all.delete(topicName)
  }

  /**
   * Removes all registered listeners on all topics.
   *
   * @return {undefined}
   */
  cancelAll () {
    debug('Dropping all listeners on all topics')
    pubsub.all.clear()
  }

  /**
   * Request a specific piece of information from a subscriber. The subscriber
   * must reply using the `respond` method, not `say`. The promise will resolve
   * with the value sent to `respond`.
   *
   * @param  {Symbol}      topic    One of `TopicalPubSub.prototype.topics`.
   *
   * @param  {any}         query    A value that identifies the information being
   *                                sought.
   *
   * @return {Promise}
   */
  request (topic, query) {
    return new Promise((resolve, reject) => {
      const topicName = validate(topic)

      if (!topicName) {
        throw new TypeError('The "topic" parameter for "request()" is required and must be a value from "topics".')
      }

      /**
       * The "tracking number" is a unique identifier that belongs to this
       * request, and only this request. It is used to match up the response.
       * @type {String}
       */
      const trackingNo = uid()

      /**
       * This is used to report the amount of time spent waiting for the response.
       * Should be useful for troubleshooting or anaylzing the performance of
       * other parts of code.
       * @type {Date}
       */
      const startTime = new Date()

      /**
       * This Promise will only be resolved when the matching response is
       * received. If (for whatever reason) the response never arrives, then the
       * entire application could freeze, stuck in an endless loop.
       *
       * This "watchdog" is responsible for preventing such a situation. If the
       * response doesn't arrive within a specific timeframe (defined above in
       * the constructor), then the watchdog will cause the Promise to be
       * rejected.
       * @type {Timeout}
       */
      const watchdog = global.setTimeout(
        () => {
          debug('Failed to receive response to %s within %d sec', trackingNo, (requestTTL / 1000))
          reject(new Error('No response received within the required time limit.'))
        },
        requestTTL
      )

      debug('Submitting request for %o with tracking number %s', query, trackingNo)

      // the handler needs to be set before calling `say` (otherwise the
      // sequence of events won't work out right)
      pubsub.on(trackingNo, (answer) => {
        global.clearTimeout(watchdog)

        const now = new Date()
        let elapsedTime = (now.getTime() - startTime.getTime()) / 1000

        if (elapsedTime < 1) {
          elapsedTime = 'less than 1 sec'
        } else {
          elapsedTime = `${elapsedTime} sec`
        }

        debug('%s had a cycle time of %s', trackingNo, elapsedTime)

        resolve(answer)

        // remove the listener after we're done here, because it can never be
        // called again
        process.nextTick(() => {
          pubsub.all.delete(trackingNo)
        })
      })

      this.say(topic, { trackingNo: trackingNo, query: query })
    })
  }

  /**
   * Responds to a request for a specific piece of information.
   *
   * @param  {any}   trackingNo   The value published as part of the original
   *                              request. This is required in order to match
   *                              everything up correctly.
   *
   * @param  {any}   answer       The information that was requested.
   *
   * @return {undefined}
   */
  respond (trackingNo, answer) {
    debug('Received response for %s: %o', trackingNo, answer)
    pubsub.emit(trackingNo, answer)
  }
}

const instance = new TopicalPubSub()

module.exports = instance
