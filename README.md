# tiptap-collab-server
A socket.io server for [tiptap](https://github.com/ueberdosis/tiptap) collaboration module. Handles multi-documents, users's cursors, and hooks for programmers.

## Installation
```
$ npm install tiptap-collab-server
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
```
$ npm run test
```
Contributions are welcome

## Contributing
Builds library for publication
```
$ npm run test
```
Issues and pull-requests are welcome and will be considered.
