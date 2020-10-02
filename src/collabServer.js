import SocketIO from 'socket.io';
import Document from './document';

const app = require('express')();
const http = require('http').Server(app);

export default class CollabServer {
  constructor(options) {
    this.options = options || {};
    this.io = new SocketIO(http);

    this.connectionGuard((_param, resolve) => { resolve(); });
    this.initDocument((param, resolve) => { resolve(param); });
    this.onClientConnect((_param, resolve) => { resolve(); });
    this.onClientDisconnect((_param, resolve) => { resolve(); });
  }

  serve() {
    http.listen(this.options.port || 6000);

    this.namespaces = this.io.of(this.options.namespaceFilter || /^\/[a-zA-Z0-9_/-]+$/);

    this.namespaces.on('connection', (socket) => {
      const namespace = socket.nsp;

      socket.on('join', ({ roomName, clientID, options }) => {
        this.connectionGuardCallback({
          socket, roomName, clientID, options,
        })
          .then(() => {
            socket.join(roomName);

            const document = new Document(namespace.name, roomName, this.options.maxStoredSteps);

            // Document event management
            document
              .onVersionMismatch(({ version, steps }) => {
                // Send to every client in the roomName
                namespace.in(roomName).emit('update', {
                  version,
                  steps,
                });
              })
              .onNewVersion(({ version, steps }) => {
                // Send to every client in the roomName
                namespace.in(roomName).emit('update', {
                  version,
                  steps,
                });
              })
              .onSelectionsUpdated((selections) => {
                // Send to every other client in the roomName
                socket.to(roomName).emit('getSelections', selections);
              })
              .onClientsUpdated((clients) => {
                // Send to every client in the roomName
                namespace.in(roomName).emit('getClients', clients);
              });

            // Handle document update
            socket.on('update', (data) => {
              document.updateDoc({ ...data, clientID });
            });

            // Handle update selection
            socket.on('updateSelection', async (data) => {
              document.updateSelection({ ...data, clientID }, socket.id);
            });

            // Handle disconnection
            socket.on('disconnect', async () => {
              document.removeSelection(socket.id)
                .then(() => document.removeClient(socket.id))
                .then(() => this.onClientDisconnectCallback({
                  clientID,
                  room: namespace.adapter.rooms[roomName],
                  document,
                }));
            });

            // Init
            return document.cleanUpClientsAndSelections(
              Object.keys(namespace.adapter.rooms[roomName].sockets),
            )
              .then(() => this.onClientConnectCallback({
                clientID,
                room: namespace.adapter.rooms[roomName],
                document,
              }))
              .then(() => document.addClient(clientID, socket.id))
              .then(() => document.initDoc(
                ({ version, doc }) => this.initDocumentCallback({
                  clientID,
                  room: namespace.adapter.rooms[roomName],
                  version,
                  doc,
                }),
              ))
              .then(({ version, doc }) => {
                socket.emit('init', { version, doc });
              });
          })
          .catch((error) => {
            socket.emit('initFailed', error);
            socket.disconnect();
          });

        // socket.on('join', async ({ roomName, clientID, options }) => {
        //   this.connectionGuardCallback({
        //     socket, roomName, clientID, options,
        //   }).then(async () => {
        //     socket.join(roomName);

        //     const document = await this.findOrCreateDocument(namespace.name, roomName, clientID);

        //     // send latest document
        //     socket.emit('init', document.getDoc());

        //     // Handle version mismatch:
        //     // we send all steps of this version back to the user
        //     document.onVersionMismatch(({ version, steps }) => {
        //       namespace.in(roomName).emit('update', {
        //         version,
        //         steps,
        //       });
        //     });

        //     // Handle new document version
        //     // send update to everyone (me and others)
        //     document.onNewVersion(({ version, steps }) => {
        //       namespace.in(roomName).emit('update', {
        //         version,
        //         steps,
        //       });
        //     });

        //     // Handle new selections
        //     // send update to others only
        //     document.onNewSelections(({ selections }) => {
        //       socket.to(roomName).emit('getSelections', selections);
        //     });

        //     // Handle update
        //     socket.on('update', async (data) => {
        //       document.update(data);
        //     });

        //     // Handle update
        //     socket.on('updateSelection', async (data) => {
        //       document.updateSelection(data, socket.id);
        //       // if (document.updateSelection(data, socket.id)) {
        //       //   socket.to(roomName).emit('getSelections', document.getSelections());
        //       // }
        //     });

        //     // Handle disconnect
        //     socket.on('disconnect', async () => {
        //       document.removeSelection(socket.id);
        //       namespace.in(roomName).emit('getSelections', document.getSelections());

        //       document.removeClient(socket.id);
        //       namespace.in(roomName).emit('getClients', document.getClients());

        //       await this.onClientDisconnectionCallback({ clientID, document });

        //       if (!namespace.adapter.roomNames[roomName]) {
        //         // Nobody is connected to the document anymore so it is deleted
        //         // (data is kept in database)
        //         await this.removeDocument(document, clientID);
        //       }
        //     });

        //     // Add client to document
        //     document.addClient(clientID, socket.id);
        //     await this.onClientConnectionCallback({ clientID, document });

        //     // send client list
        //     namespace.in(roomName).emit('getClients', document.getClients());

      //     // send selections
      //     namespace.in(roomName).emit('getSelections', document.getSelections());
      //   }).catch((error) => {
      //     socket.emit('initFailed', error);
      //     socket.disconnect();
      //   });
      });
    });

    return this;
  }

  close() {
    this.io.close();
  }

  // Hooks
  connectionGuard(callback) {
    this.connectionGuardCallback = (param) => new Promise((resolve, reject) => {
      callback(param, resolve, reject);
    });
    return this;
  }

  initDocument(callback) {
    this.initDocumentCallback = (param) => new Promise((resolve, reject) => {
      callback(param, resolve, reject);
    });
    return this;
  }

  onClientConnect(callback) {
    this.onClientConnectCallback = (param) => new Promise((resolve, reject) => {
      callback(param, resolve, reject);
    });
    return this;
  }

  onClientDisconnect(callback) {
    this.onClientDisconnectCallback = (param) => new Promise((resolve, reject) => {
      callback(param, resolve, reject);
    });
    return this;
  }
}
