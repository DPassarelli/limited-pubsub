'use strict'

const debug = require('debug')('topical-pubsub')
const pubsub = require('mitt')()

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

  /**
   * Adds a new topic to the enumeration.
   *
   * @param {String}       name   The name of the topic to add.
   *
   * @return {undefined}
   */
  addTopic (name) {
    if (name == null || (name.toString() !== name)) {
      throw new Error('The "name" parameter for "addTopic()" is required and must be a string.')
    }

    // Avoid adding duplicate entries.
    if (!~validTopics.indexOf(name)) {
      debug('Adding new topic "%s"', name)
      validTopics.push(name)
      topicEnum = createTopicEnumeration(topicEnum, validTopics)
    }
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
}

const instance = new TopicalPubSub()

module.exports = instance
