/* eslint-env mocha */

/**
 * The following statement is required to ensure that no errors are silently
 * ignored (including those that would otherwise not be thrown when attempting
 * to add or remove properties from a JS object).
 */
'use strict'

/**
 * Code under test.
 * @type {any}
 */
const T = require('../index.js')

describe('the "topico" module', function () {
  afterEach(() => {
    T.cancelAll()
  })

  it('must export an constructor', () => {
    const expected = 'object'
    const actual = typeof T

    expect(actual).to.equal(expected)
  })

  describe('the returned object', () => {
    it('must always refer to the same instance', () => {
      const expected = T
      const actual = T

      expect(actual).to.equal(expected)
    })

    it('must have a property called "topics", which is a plain object', () => {
      const expected = 'object'
      const actual = typeof T.topics

      expect(actual).to.equal(expected)
    })

    describe('the "topics" property', () => {
      it('must not allow properties to be added', () => {
        expect(() => {
          T.topics.newTopic = 'new topic'
        }).to.throw()
      })

      it('must not allow properties to be removed', () => {
        expect(() => {
          const keys = Object.keys(T.topics)
          delete T.topics[keys[0]]
        }).to.throw()
      })

      it('must not allow properties to be changed', () => {
        expect(() => {
          const keys = Object.keys(T.topics)
          T.topics[keys[0]] = Symbol('__NEW__')
        }).to.throw()
      })

      it('must contain a symbol named "INFO"', () => {
        const expected = 'symbol'
        const actual = typeof T.topics.INFO

        expect(actual).to.equal(expected)
      })

      it('must contain a symbol named "ERROR"', () => {
        const expected = 'symbol'
        const actual = typeof T.topics.ERROR

        expect(actual).to.equal(expected)
      })
    })

    it('must have a method called "listenOnce"', () => {
      const expected = 'function'
      const actual = typeof T.listenOnce

      expect(actual).to.equal(expected)
    })

    describe('the "listenOnce" method', () => {
      const ERR_INVALID_TOPIC = 'The "topic" parameter for "listenOnce()" is required and must be a value from "topics".'
      const ERR_INVALID_FUNC = 'The "callback" parameter for "listenOnce()" is required and must be a function.'

      it('must throw an error if the first parameter is missing', () => {
        expect(() => {
          T.listenOnce()
        }).to.throw(TypeError, ERR_INVALID_TOPIC)
      })

      it('must throw an error if the first parameter is not a member of ".topics"', () => {
        expect(() => {
          T.listenOnce('topic')
        }).to.throw(TypeError, ERR_INVALID_TOPIC)
      })

      it('must throw an error if the second parameter is missing', () => {
        expect(() => {
          T.listenOnce(T.topics.INFO)
        }).to.throw(TypeError, ERR_INVALID_FUNC)
      })

      it('must throw an error if the second parameter is not a function', () => {
        expect(() => {
          T.listenOnce(T.topics.INFO, 'callback')
        }).to.throw(TypeError, ERR_INVALID_FUNC)
      })
    })

    it('must have a method called "listen"', () => {
      const expected = 'function'
      const actual = typeof T.listen

      expect(actual).to.equal(expected)
    })

    describe('the "listen" method', () => {
      const ERR_INVALID_TOPIC = 'The "topic" parameter for "listen()" is required and must be a value from "topics".'
      const ERR_INVALID_FUNC = 'The "callback" parameter for "listen()" is required and must be a function.'

      it('must throw an error if the first parameter is missing', () => {
        expect(() => {
          T.listen()
        }).to.throw(TypeError, ERR_INVALID_TOPIC)
      })

      it('must throw an error if the first parameter is not a member of ".topics"', () => {
        expect(() => {
          T.listen('topic')
        }).to.throw(TypeError, ERR_INVALID_TOPIC)
      })

      it('must throw an error if the second parameter is missing', () => {
        expect(() => {
          T.listen(T.topics.INFO)
        }).to.throw(TypeError, ERR_INVALID_FUNC)
      })

      it('must throw an error if the second parameter is not a function', () => {
        expect(() => {
          T.listen(T.topics.INFO, 'callback')
        }).to.throw(TypeError, ERR_INVALID_FUNC)
      })
    })

    it('must have a method called "say"', () => {
      const expected = 'function'
      const actual = typeof T.say

      expect(actual).to.equal(expected)
    })

    describe('the "say" method', () => {
      const ERR_INVALID_TOPIC = 'The "topic" parameter for "say()" is required and must be a value from "topics".'

      it('must throw an error if the first parameter is missing', () => {
        expect(() => {
          T.say()
        }).to.throw(TypeError, ERR_INVALID_TOPIC)
      })

      it('must throw an error if the first parameter just a string value', () => {
        expect(() => {
          T.say('topic')
        }).to.throw(TypeError, ERR_INVALID_TOPIC)
      })

      it('must throw an error if the first parameter is not a member of ".topics"', () => {
        expect(() => {
          T.say(T.topics.UNKNOWN)
        }).to.throw(TypeError, ERR_INVALID_TOPIC)
      })
    })

    describe('the "listenOnce" and "say" behavior', () => {
      it('must trigger the former after calling the latter', (done) => {
        T.listenOnce(T.topics.INFO, done)
        T.say(T.topics.INFO)
      })

      it('must pass any data entered', (done) => {
        const expected = ['hello']
        const actual = []

        T.listenOnce(T.topics.INFO, (data) => {
          actual.push(data)

          try {
            expect(actual).to.deep.equal(expected)
            done()
          } catch (e) {
            done(e)
          }
        })

        T.say(T.topics.INFO, 'hello')
      })

      it('must not be triggered more than once', (done) => {
        const expected = ['hello']
        const actual = []

        T.listenOnce(T.topics.INFO, (data) => {
          actual.push(data)
        })

        T.say(T.topics.INFO, 'hello')
        T.say(T.topics.INFO, 'world')

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

    describe('the "listen" and "say" behavior', () => {
      it('must be triggered more than once', (done) => {
        const expected = ['hello', 'world']
        const actual = []

        T.listen(T.topics.INFO, (data) => {
          actual.push(data)
        })

        T.say(T.topics.INFO, 'hello')
        T.say(T.topics.INFO, 'world')

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

    it('must have a method called "cancel"', () => {
      const expected = 'function'
      const actual = typeof T.cancel

      expect(actual).to.equal(expected)
    })

    describe('the "cancel" method', () => {
      const ERR_INVALID_TOPIC = 'The "topic" parameter for "cancel()" is required and must be a value from "topics".'

      it('must throw an error if the first parameter is missing', () => {
        expect(() => {
          T.cancel()
        }).to.throw(TypeError, ERR_INVALID_TOPIC)
      })

      it('must throw an error if the first parameter is not a member of ".topics"', () => {
        expect(() => {
          T.cancel('topic')
        }).to.throw(TypeError, ERR_INVALID_TOPIC)
      })

      describe('its behavior', () => {
        it('must cause all listeners for the specified topic not to be called', (done) => {
          const expected = ['1', '1']
          const actual = []

          T.listen(T.topics.INFO, (data) => { actual.push(data) })
          T.listen(T.topics.INFO, (data) => { actual.push(data) })

          T.say(T.topics.INFO, '1')

          T.cancel(T.topics.INFO)

          T.say(T.topics.INFO, '2')

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

    it('must have a method called "cancelAll"', () => {
      const expected = 'function'
      const actual = typeof T.cancelAll

      expect(actual).to.equal(expected)
    })

    describe('the "cancelAll" method', () => {
      it('must cancel all listeners on all topics', (done) => {
        const expected = ['1', '1']
        const actual = []

        T.listen(T.topics.INFO, (data) => { actual.push(data) })
        T.listen(T.topics.ERROR, (data) => { actual.push(data) })

        T.say(T.topics.INFO, '1')
        T.say(T.topics.ERROR, '1')

        T.cancelAll()

        T.say(T.topics.INFO, '2')
        T.say(T.topics.ERROR, '2')

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
})
