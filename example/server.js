import CollabServer from 'tiptap-collab-server';
// import CollabServer from '../src/collabServer';

new CollabServer({
  port: 6002,
  namespaceFilter: /^\/[a-zA-Z0-9_/-]+$/,
  lockDelay: 1000,
  lockRetries: 10,
})
  .connectionGuard(({
    namespaceName, roomName, clientID, requestHeaders, options,
  }, resolve) => {
    console.log('connectionGuard', namespaceName, roomName, clientID, options, requestHeaders);
    resolve();
  })
  .initDocument(({
    namespaceName, roomName, clientID, requestHeaders, clientsCount, version, doc,
  }, resolve) => {
    console.log('initDocument', {
      namespaceName, roomName, clientID, requestHeaders, clientsCount, version, doc,
    });
    // Load from backend if first user connected
    if (clientsCount === 1 && version === 0) {
      resolve({
        version: 1,
        doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'A tiny paragraph to start.',
                },
              ],
            },
          ],
        },
      });
    } else {
      resolve();
    }
  })
  .leaveDocument(({
    namespaceName, roomName, clientID, requestHeaders, clientsCount, version, doc, deleteDatabase,
  }, resolve) => {
    console.log('leaveDocument', {
      namespaceName, roomName, clientID, requestHeaders, clientsCount, version, doc, deleteDatabase,
    });
    // Save to backend if last user disconnected
    if (clientsCount === 0) {
      deleteDatabase().then(() => resolve());
    }
    resolve();
  })
  .onClientConnect(({
    namespaceName, roomName, clientID, requestHeaders, clientsCount,
  }, resolve) => {
    console.log('onClientConnect', namespaceName, roomName, clientID, requestHeaders, clientsCount);
    resolve();
  })
  .onClientDisconnect(({
    namespaceName, roomName, clientID, requestHeaders, clientsCount,
  }, resolve) => {
    console.log('onClientDisconnect', namespaceName, roomName, clientID, requestHeaders, clientsCount);
    resolve();
  })
  .serve();
