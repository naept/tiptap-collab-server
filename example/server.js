// import CollabServer from 'tiptap-collab-server';
import CollabServer from '../src/collabServer';

new CollabServer({
  port: 6002,
  namespaceFilter: /^\/[a-zA-Z0-9_/-]+$/,
})
  .connectionGuard(({
    socket, roomName, clientID, options,
  }, resolve) => {
    console.log('connectionGuard', socket.nsp.name, roomName, clientID, options);
    resolve();
  })
  .initDocument(({
    room, clientID, version, doc,
  }, resolve) => {
    console.log('initDocument', {
      room, clientID, version, doc,
    });
    // Load from backend if first user connected
    if (room.length === 1 && version === 0) {
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
                  text: 'Un peu de texte pour commencer',
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
  .onClientConnect(({ clientID, room, document }, resolve) => {
    console.log('onClientConnect', clientID, room, document);
    resolve();
  })
  .onClientDisconnect(({ clientID, room, document }, resolve) => {
    // Save to backend
    console.log('onClientDisconnect', clientID, room, document);
    if (room === undefined) {
      document.deleteDatabase();
    } else {
      resolve();
    }
  })
  .serve();
