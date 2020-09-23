import SocketIO from 'socket.io';
import Document from './document';

const app = require('express')();
const http = require('http').Server(app);

export default class CollabServer {
  constructor(options) {
    this.options = options || {};
    this.io = new SocketIO(http);
    this.documents = [];

    this.beforeConnection((_param, resolve) => { resolve(); });
    this.onClientConnect((_param, resolve) => { resolve(); });
    this.onClientDisconnect((_param, resolve) => { resolve(); });
    this.onNewDocument((_param, resolve) => { resolve(); });
    this.onLeaveDocument((_param, resolve) => { resolve(); });
  }

  serve() {
    http.listen(this.options.port || 6000);

    this.namespaces = this.io.of(this.options.namespaceFilter || /^\/[a-zA-Z0-9_/-]+$/);

    this.namespaces.on('connection', (socket) => {
      const namespace = socket.nsp;

      socket.on('join', async ({ room, clientID, options }) => {
        this.connectionGuard({
          socket, room, clientID, options,
        }).then(async () => {
          socket.join(room);

          const document = await this.findOrCreateDocument(namespace.name, room, clientID);

          // send latest document
          socket.emit('init', document.getDoc());

          // Handle version mismatch:
          // we send all steps of this version back to the user
          document.onVersionMismatch(({ version, steps }) => {
            namespace.in(room).emit('update', {
              version,
              steps,
            });
          });

          // Handle new document version
          // send update to everyone (me and others)
          document.onNewVersion(({ version, steps }) => {
            namespace.in(room).emit('update', {
              version,
              steps,
            });
          });

          // Handle update
          socket.on('update', async (data) => {
            document.update(data);
          });

          // Handle update
          socket.on('updateSelection', async (data) => {
            if (document.updateSelection(data, socket.id)) {
              socket.to(room).emit('getSelections', document.getSelections());
            }
          });

          // Handle disconnect
          socket.on('disconnect', async () => {
            document.removeSelection(socket.id);
            namespace.in(room).emit('getSelections', document.getSelections());

            document.removeClient(socket.id);
            namespace.in(room).emit('getClients', document.getClients());

            await this.onClientDisconnectionCallback({ clientID, document });

            if (!namespace.adapter.rooms[room]) {
              // Nobody is connected to the document anymore so it is deleted
              // (data is kept in database)
              await this.removeDocument(document, clientID);
            }
          });

          // Add client to document
          document.addClient(clientID, socket.id);
          await this.onClientConnectionCallback({ clientID, document });

          // send client list
          namespace.in(room).emit('getClients', document.getClients());

          // send selections
          namespace.in(room).emit('getSelections', document.getSelections());
        }).catch((error) => {
          socket.emit('initFailed', error);
        });
      });
    });

    return this;
  }

  async findOrCreateDocument(namespaceName, room, clientID) {
    let document = this.findDocument(namespaceName, room);
    if (!document) {
      document = new Document(namespaceName, room, this.options.maxStoredSteps);
      await this.onCreateDocumentCallback({ document, clientID });
      this.documents.push(document);
    }

    return document;
  }

  findDocument(namespaceName, room) {
    return this.documents.find(
      (document) => document.id === `${namespaceName}/${room}`,
    );
  }

  async removeDocument(document, clientID) {
    await this.onRemoveDocumentCallback({ document, clientID });
    this.documents = this.documents.filter((doc) => doc.id !== document.id);
  }

  close() {
    this.io.close();
  }

  // Hooks
  beforeConnection(callback) {
    this.connectionGuard = (param) => new Promise((resolve, reject) => {
      callback(param, resolve, reject);
    });
    return this;
  }

  onClientConnect(callback) {
    this.onClientConnectionCallback = (param) => new Promise((resolve, reject) => {
      callback(param, resolve, reject);
    });
    return this;
  }

  onClientDisconnect(callback) {
    this.onClientDisconnectionCallback = (param) => new Promise((resolve, reject) => {
      callback(param, resolve, reject);
    });
    return this;
  }

  onNewDocument(callback) {
    this.onCreateDocumentCallback = (param) => new Promise((resolve, reject) => {
      callback(param, resolve, reject);
    });
    return this;
  }

  onLeaveDocument(callback) {
    this.onRemoveDocumentCallback = (param) => new Promise((resolve, reject) => {
      callback(param, resolve, reject);
    });
    return this;
  }
}
