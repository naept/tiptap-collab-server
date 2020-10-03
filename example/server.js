import CollabServer from 'tiptap-collab-server';
// import CollabServer from '../src/collabServer';

new CollabServer({
  port: 6002,
  namespaceFilter: /^\/[a-zA-Z0-9_/-]+$/,
})
  .connectionGuard(({
    namespaceName, roomName, clientID, options,
  }, resolve) => {
    console.log('connectionGuard', namespaceName, roomName, clientID, options);
    resolve();
  })
  .initDocument(({
    namespaceName, roomName, clientID, clientsCount, version, doc,
  }, resolve) => {
    console.log('initDocument', {
      namespaceName, roomName, clientID, clientsCount, version, doc,
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
      resolve({ version, doc });
    }
  })
  .onClientConnect(({
    namespaceName, roomName, clientID, clientsCount, document,
  }, resolve) => {
    console.log('onClientConnect', namespaceName, roomName, clientID, clientsCount, document);
    resolve();
  })
  .onClientDisconnect(({
    namespaceName, roomName, clientID, clientsCount, document,
  }, resolve) => {
    // Save to backend
    console.log('onClientDisconnect', namespaceName, roomName, clientID, clientsCount, document);
    if (clientsCount === 0) {
      document.deleteDatabase();
    } else {
      resolve();
    }
  })
  .serve();
