/* eslint-env mocha */

/**
 * The following statement is required to ensure that no errors are silently
 * ignored (including those that would otherwise not be thrown when attempting
 * to add or remove properties from a JS object).
 */
'use strict'

const isPlainObject = require('is-plain-obj')
const fakeTimers = require('@sinonjs/fake-timers')
const unique = require('lodash.uniq')

/**
 * Code under test.
 * @type {any}
 */
const T = require('../index.js')

describe('the "topico" module', function () {
  afterEach(() => {
    T.cancelAll()
  })

  describe('the returned object', () => {
    before(() => {
      T.addTopic('TEST')
    })

    it('must have a property called "requestTTL"', () => {
      const expected = 'number'
      const actual = typeof T.requestTTL

      expect(actual).to.equal(expected)
    })

    describe('the "requestTTL" property', () => {
      it('must be read/write', () => {
        const defaultValue = T.requestTTL

        expect(T.requestTTL).to.not.equal(1)

        T.requestTTL = 1

        expect(T.requestTTL).to.equal(1)

        T.requestTTL = defaultValue
      })

      it('must not accept non-numeric values', () => {
        expect(() => {
          T.requestTTL = 'never'
        }).to.throw()
      })
    })

    it('must have a method called "request"', () => {
      const expected = 'function'
      const actual = typeof T.request

      expect(actual).to.equal(expected)
    })

    describe('the "request" method', () => {
      const ERR_INVALID_TOPIC = 'The "topic" parameter for "request()" is required and must be a value from "topics".'

      /**
       * Instead of waiting for all of the timeouts to pass in real-time, the
       * fake clock allows us to "fast-forward" as needed. Thus, the test suite
       * will complete itself "in no time at all".
       * @type {Object}
       */
      let fastClock = null

      before(() => {
        fastClock = fakeTimers.install()
      })

      after(() => {
        fastClock.uninstall()
      })

      it('must return a Promise', () => {
        return expect(T.request()).to.be.rejected
      })

      it('must be rejected if the first parameter is missing', () => {
        return expect(T.request()).to.be.rejectedWith(TypeError, ERR_INVALID_TOPIC)
      })

      it('must be rejected if the first parameter is not a member of ".topics"', () => {
        return expect(T.request('topic')).to.be.rejectedWith(TypeError, ERR_INVALID_TOPIC)
      })

      it('must publish a message on the specified topic with a plain object as the payload', (done) => {
        T.listenOnce(T.topics.TEST, (payload) => {
          try {
            expect(isPlainObject(payload)).to.be.true // eslint-disable-line no-unused-expressions
            done()
          } catch (e) {
            done(e)
          }
        })

        T.request(T.topics.TEST).catch((e) => { /* safe to ignore timeout error */ })
        fastClock.runToLast()
      })

      describe('the published payload', () => {
        it('must have a property called "trackingNo"', (done) => {
          T.listenOnce(T.topics.TEST, (payload) => {
            try {
              expect(payload).to.have.property('trackingNo')
              done()
            } catch (e) {
              done(e)
            }
          })

          T.request(T.topics.TEST).catch((e) => { /* safe to ignore timeout error */ })
          fastClock.runToLast()
        })

        describe('the "trackingNo" property', () => {
          it('must be unique across multiple calls', (done) => {
            const trackingNumbers = []

            T.listen(T.topics.TEST, (payload) => {
              trackingNumbers.push(payload.trackingNo)

              if (trackingNumbers.length === 3) {
                const actual = unique(trackingNumbers)

                try {
                  expect(actual).to.deep.equal(trackingNumbers)
                  done()
                } catch (e) {
                  done(e)
                }
              }
            })

            T.request(T.topics.TEST).catch((e) => { /* safe to ignore timeout error */ })
            fastClock.runToLast()

            T.request(T.topics.TEST).catch((e) => { /* safe to ignore timeout error */ })
            fastClock.runToLast()

            T.request(T.topics.TEST).catch((e) => { /* safe to ignore timeout error */ })
            fastClock.runToLast()
          })
        })

        it('must have a property called "query"', (done) => {
          T.listenOnce(T.topics.TEST, (payload) => {
            try {
              expect(payload).to.have.property('query')
              done()
            } catch (e) {
              done(e)
            }
          })

          T.request(T.topics.TEST).catch((e) => { /* safe to ignore timeout error */ })
          fastClock.runToLast()
        })

        describe('the "query" property', () => {
          it('must be the same value as that passed into "request"', (done) => {
            const expected = 'some query'

            T.listenOnce(T.topics.TEST, (payload) => {
              const actual = payload.query

              try {
                expect(actual).to.equal(expected)
                done()
              } catch (e) {
                done(e)
              }
            })

            T.request(T.topics.TEST, expected).catch((e) => { /* safe to ignore timeout error */ })
            fastClock.runToLast()
          })
        })
      })
    })

    it('must have a method called "respond"', () => {
      const expected = 'function'
      const actual = typeof T.respond

      expect(actual).to.equal(expected)
    })

    describe('the "request" and "respond" behavior', () => {
      /**
       * The length of time to wait for the watchdog to kill the pending
       * request. Must be just over the watchdog limit.
       * @type {Number}
       */
      const timelimit = T.requestTTL + 100

      /**
       * Instead of waiting for all of the timeouts to pass in real-time, the
       * fake clock allows us to "fast-forward" as needed. Thus, the test suite
       * will complete itself "in no time at all".
       * @type {Object}
       */
      let fastClock = null

      before(() => {
        fastClock = fakeTimers.install()
      })

      after(() => {
        fastClock.uninstall()
      })

      it('must work if a response is submitted', () => {
        const expected = 'world'

        T.listenOnce(T.topics.TEST, (payload) => {
          T.respond(payload.trackingNo, expected)
        })

        return T.request(T.topics.TEST, 'hello')
          .then((actual) => {
            expect(actual).to.equal(expected)
          })
      })

      it('must throw an error if a response is never submitted', (done) => {
        T.request(T.topics.TEST, 'hello')
          .then((answer) => {
            done(new Error('The promise was not rejected.'))
          })
          .catch((e) => {
            done()
          })

        fastClock.runToLast()
      }).timeout(timelimit) // https://github.com/mochajs/mocha/issues/2018#issuecomment-353032913
    })
  })
})
