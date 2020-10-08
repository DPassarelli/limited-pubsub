/* eslint-env mocha */

/**
 * The following statement is required to ensure that no errors are silently
 * ignored (including those that would otherwise not be thrown when attempting
 * to add or remove properties from a JS object).
 */
'use strict'

const uid = require('ulid').ulid

/**
 * Code under test.
 * @type {any}
 */
const T = require('../index.js')

/**
 * Returns a unique value with respect to time. This can be used when adding a
 * new topic, to prevent unintended dependencies across tests (since topic names
 * cannot be removed once added.)
 *
 * @return {String}
 */
function getUniqueTopicName () {
  return uid()
}

describe('the "topico" module', function () {
  afterEach(() => {
    T.cancelAll()
  })

  it('must have a method called "addTopic"', () => {
    const expected = 'function'
    const actual = typeof T.addTopic

    expect(actual).to.equal(expected)
  })

  describe('the "addTopic" method', () => {
    const ERR_INVALID_TOPIC = 'The "name" parameter for "addTopic()" is required and must be a string (or an array of strings).'

    it('must throw an error if the topic name is missing', () => {
      expect(() => {
        T.addTopic()
      }).to.throw(ERR_INVALID_TOPIC)
    })

    it('must throw an error if the topic name is not a string value', () => {
      const invalidValues = [
        null,
        3.1415,
        new Date()
      ]

      invalidValues.forEach((value) => {
        expect(() => {
          T.addTopic(value)
        }).to.throw(ERR_INVALID_TOPIC)
      })
    })

    it('must not throw an error if the same topic name is added more than once', () => {
      expect(() => {
        const newTopicName = getUniqueTopicName()
        T.addTopic(newTopicName)
        T.addTopic(newTopicName)
      }).to.not.throw()
    })

    it('must not alter the original Symbol values after being called', () => {
      const expected = T.topics.INFO

      T.addTopic(getUniqueTopicName())

      const actual = T.topics.INFO

      expect(actual).to.equal(expected)
    })

    it('must accept multiple entries', () => {
      const expected = []
      expected.push(getUniqueTopicName())
      expected.push(getUniqueTopicName())
      expected.push(getUniqueTopicName())

      T.addTopic(expected)

      const actual = Object.keys(T.topics)

      expect(actual).to.include.members(expected)
    })

    it('must convert all entries into upper case', () => {
      const expected = [
        'ABCDEFG',
        'HIJKLMN'
      ]

      T.addTopic([
        'AbCdEfG',
        'hijklmn'
      ])

      const actual = Object.keys(T.topics)

      expect(actual).to.include.members(expected)
    })
  })

  describe('the "listenOnce" and "say" behavior', () => {
    it('must work with an added topic', (done) => {
      const newTopicName = getUniqueTopicName()

      T.addTopic(newTopicName)
      T.listenOnce(T.topics[newTopicName], done)
      T.say(T.topics[newTopicName])
    })

    it('must not work when referring to an added topic in a different casing', () => {
      const newTopicName = getUniqueTopicName()

      T.addTopic(newTopicName)

      expect(() => {
        T.say(T.topics[newTopicName.toLowerCase()])
      }).to.throw('The "topic" parameter for "say()" is required and must be a value from "topics".')
    })
  })

  describe('the "listen" and "say" behavior', () => {
    it('must work even if the same topic name is added more than once', (done) => {
      const expected = ['hello', 'world']
      const actual = []

      const newTopicName = getUniqueTopicName()

      T.addTopic(newTopicName)

      T.listen(T.topics[newTopicName], (data) => {
        actual.push(data)
      })

      T.say(T.topics[newTopicName], 'hello')

      T.addTopic(newTopicName)

      T.say(T.topics[newTopicName], 'world')

      /**
       * The test results should be analyzed after both words are "said".
       * Since `say` is asynchronous, the analysis must be as well.
       */
      global.setTimeout(() => {
        try {
          expect(actual).to.deep.equal(expected)
          done()
        } catch (e) {
          done(e)
        }
      }, 10)
    })
  })
})
