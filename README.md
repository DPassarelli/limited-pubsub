# Topico

[![Linux Build Status](https://img.shields.io/travis/DPassarelli/topico/master?label=Linux%20build&logo=travis)](https://travis-ci.org/DPassarelli/topico)
[![Windows Build Status](https://img.shields.io/appveyor/build/DPassarelli/topico/master?label=Windows%20build&logo=appveyor)](https://ci.appveyor.com/project/DPassarelli/topico?branch=master)
[![Coverage Status](https://img.shields.io/coveralls/github/DPassarelli/topico/master?logo=coveralls)](https://coveralls.io/github/DPassarelli/topico?branch=master)

**A JS pub/sub implementation that only allows for specific topics to be used. Works in [Node.js](https://nodejs.org) and web browsers.**

This project adheres to the `standard` coding style (click below for more information):

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard#javascript-standard-style)


## Justification

I created this library because I don't like using pubsub with string values for topics. I think that's just silly.

## Getting Started

Install via [NPM](https://docs.npmjs.com/downloading-and-installing-packages-locally):

    npm install @dpassarelli/topico

Or [Yarn](https://yarnpkg.com/getting-started/usage#adding-a-dependency):

    yarn add @dpassarelli/topico

And add the reference inside your project's code:

    const pubsub = require('@dpassarelli/topico')
    
    pubsub.say(pubsub.topics.INFO, 'hello, world!')


## API




## License

Please refer to `LICENSE`.
