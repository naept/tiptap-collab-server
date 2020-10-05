import SocketIO from 'socket.io';
import Document from './document';

const app = require('express')();
const http = require('http').Server(app);

export default class CollabServer {
  constructor(options) {
    this.options = options || {};
    this.io = new SocketIO(http);

    this.connectionGuard((_param, resolve) => { resolve(); });
    this.initDocument((_param, resolve) => { resolve(); });
    this.leaveDocument((_param, resolve) => { resolve(); });
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
          namespaceName: namespace.name, roomName, clientID, options,
        })
          .then(() => {
            socket.join(roomName);

            const document = new Document(
              namespace.name,
              roomName,
              this.options.lockDelay,
              this.options.lockRetries,
              this.options.maxStoredSteps,
            );

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
            socket.on('updateSelection', (data) => {
              document.updateSelection({ ...data, clientID }, socket.id);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
              document.leaveDoc(socket.id,
                ({ version, doc }, deleteDatabase) => this.leaveDocumentCallback({
                  namespaceName: namespace.name,
                  roomName,
                  clientID,
                  clientsCount: namespace.adapter.rooms[roomName]
                    ? namespace.adapter.rooms[roomName].length
                    : 0,
                  version,
                  doc,
                  deleteDatabase,
                }))
                .then(() => this.onClientDisconnectCallback({
                  namespaceName: namespace.name,
                  roomName,
                  clientID,
                  clientsCount: namespace.adapter.rooms[roomName]
                    ? namespace.adapter.rooms[roomName].length
                    : 0,
                }));
            });

            // Init
            return document.cleanUpClientsAndSelections(
              Object.keys(namespace.adapter.rooms[roomName].sockets),
            )
              .then(() => this.onClientConnectCallback({
                namespaceName: namespace.name,
                roomName,
                clientID,
                clientsCount: namespace.adapter.rooms[roomName].length,
              }))
              .then(() => document.addClient(clientID, socket.id))
              .then(() => document.initDoc(
                ({ version, doc }) => this.initDocumentCallback({
                  namespaceName: namespace.name,
                  roomName,
                  clientID,
                  clientsCount: namespace.adapter.rooms[roomName].length,
                  version,
                  doc,
                }),
              ))
              .then(({ version, doc }) => {
                socket.emit('init', { version, doc });
                return document.getSelections();
              })
              .then((selections) => {
                socket.emit('getSelections', selections);
              });
          })
          .catch((error) => {
            socket.emit('initFailed', error);
            socket.disconnect();
          });
      });
    });

    return this;
  }

  close() {
    this.io.close();
  }

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

  leaveDocument(callback) {
    this.leaveDocumentCallback = (param) => new Promise((resolve, reject) => {
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
