# tiptap-collab-server
A socket.io server for [tiptap](https://github.com/ueberdosis/tiptap) collaboration module. Handles multi-documents, users's cursors, and hooks for programmers.

[![NPM Version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Codacy Badge][codacy-image]][codacy-url]
[![Coverage Status][coveralls-image]][coveralls-url]
[![Dev dependencies][david-dm-image]][david-dm-url]

A full tutorial for setting this up is available in [this article on Naept's blog](https://www.naept.com/en/blog/easy-collaborative-editor-with-tiptap-and-prosemirror/) or on [Medium](https://medium.com/@julien.aupart/easy-collaborative-editor-with-tiptap-and-prosemirror-baa3314636c6)

## Installation
```sh
npm install tiptap-collab-server
```

## Basic Setup
```js
import CollabServer from 'tiptap-collab-server'

new CollabServer({
  port: 6002,
  namespaceFilter: /^\/[a-zA-Z0-9_/-]+$/,
  lockDelay: 1000,
  lockRetries: 10,
})
  .connectionGuard(({
    namespaceName,
    roomName,
    clientID,
    requestHeaders,
    options,
  }, resolve) => {
    
    resolve();
  })
  .onClientConnect(({
    namespaceName,
    roomName, 
    clientID,
    requestHeaders,
    clientsCount,
  }, resolve) => {
    
    resolve();
  })
  .initDocument(({
    namespaceName,
    roomName,
    clientID,
    requestHeaders,
    clientsCount,
    version,
    doc,
  }, resolve) => {
    
    resolve({ version, doc });
  })
  .leaveDocument(({
    namespaceName,
    roomName,
    clientID,
    requestHeaders,
    clientsCount,
    version,
    doc,
    deleteDatabase,
  }, resolve) => {
    
    resolve();
  })
  .onClientDisconnect(({
    namespaceName,
    roomName,
    clientID,
    requestHeaders,
    clientsCount,
  }, resolve) => {
    
    resolve();
  })
  .serve();
```

## Tests
```sh
npm run test
```
Tests need node v12.x or higher.

Contributions are welcome.

## Contributing
Builds library for publication
```sh
npm run test
```

Compiles and starts example app for development
```sh
npm run serve-example
```
Issues and pull-requests are welcome and will be considered.

[npm-image]: https://img.shields.io/npm/v/tiptap-collab-server.svg
[npm-url]: https://npmjs.org/package/tiptap-collab-server
[travis-image]: https://travis-ci.org/naept/tiptap-collab-server.svg?branch=master
[travis-url]: https://travis-ci.org/naept/tiptap-collab-server
[codacy-image]:https://app.codacy.com/project/badge/Grade/65af967d2ca740fd98b7a393674f32c4
[codacy-url]:https://www.codacy.com/gh/naept/tiptap-collab-server?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=naept/tiptap-collab-server&amp;utm_campaign=Badge_Grade
[coveralls-image]:https://coveralls.io/repos/github/naept/tiptap-collab-server/badge.svg?branch=master
[coveralls-url]:https://coveralls.io/github/naept/tiptap-collab-server?branch=master
[david-dm-image]:https://david-dm.org/naept/tiptap-collab-server.svg
[david-dm-url]:https://david-dm.org/naept/tiptap-collab-server
