# tiptap-collab-server
A socket.io server for [tiptap](https://github.com/ueberdosis/tiptap) collaboration module. Handles multi-documents, users's cursors, and hooks for programmers.

[![Build Status](https://travis-ci.org/naept/tiptap-collab-server.svg?branch=master)](https://travis-ci.org/naept/tiptap-collab-server)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/65af967d2ca740fd98b7a393674f32c4)](https://www.codacy.com/gh/naept/tiptap-collab-server?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=naept/tiptap-collab-server&amp;utm_campaign=Badge_Grade)
[![Coverage Status](https://coveralls.io/repos/github/naept/tiptap-collab-server/badge.svg?branch=master)](https://coveralls.io/github/naept/tiptap-collab-server?branch=master)

## Installation
```sh
npm install tiptap-collab-server
```

## Basic Setup
```js
import CollabServer from 'tiptap-collab-server'

new CollabServer({
  port: 6000,
  namespaceFilter: /^\/[a-zA-Z0-9_/-]+$/
})
  .beforeConnection(({ socket, room, clientID, options }, resolve, reject) => {
    
    resolve()
  })
  .onClientConnect(({ clientID, document }) => {

  })
  .onClientDisconnect(({ clientID, document }) => {

  })
  .onNewDocument((document) => {
    
  })
  .onLeaveDocument((document) => {
    
  })
  .serve()
```

## Tests
```sh
npm run test
```
Contributions are welcome

## Contributing
Builds library for publication
```sh
npm run test
```
Issues and pull-requests are welcome and will be considered.
