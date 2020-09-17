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
    this.onClientConnect(() => {});
    this.onClientDisconnect(() => {});
    this.onNewDocument(() => {});
    this.onLeaveDocument(() => {});
  }

  serve() {
    http.listen(this.options.port || 6000);

    this.namespaces = this.io.of(this.options.namespaceFilter || /^\/[a-zA-Z0-9_/-]+$/);

    this.namespaces.on('connection', (socket) => {
      const namespace = socket.nsp;

      socket.on('join', async ({ room, clientID, options }) => {
        this.connectionGuard({
          socket, room, clientID, options,
        }).then(() => {
          socket.join(room);

          const document = this.findOrCreateDocument(namespace.name, room);

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
          socket.on('disconnect', () => {
            document.removeSelection(socket.id);
            namespace.in(room).emit('getSelections', document.getSelections());

            document.removeClient(socket.id);
            namespace.in(room).emit('getClients', document.getClients());

            this.onClientDisconnectionCallback({ clientID, document });

            if (!namespace.adapter.rooms[room]) {
              // Nobody is connected to the document anymore so it is deleted
              // (data is kept in database)
              this.removeDocument(document);
            }
          });

          // send latest document
          socket.emit('init', document.getDoc());

          // send selections
          namespace.in(room).emit('getSelections', document.getSelections());

          // send client list
          document.addClient(clientID, socket.id);
          namespace.in(room).emit('getClients', document.getClients());

          this.onClientConnectionCallback({ clientID, document });
        }).catch((error) => {
          socket.emit('initFailed', error);
        });
      });
    });

    return this;
  }

  findOrCreateDocument(namespaceName, room) {
    let document = this.findDocument(namespaceName, room);
    if (!document) {
      document = new Document(namespaceName, room, this.options.maxStoredSteps);
      this.onCreateDocumentCallback(document);
      this.documents.push(document);
    }

    return document;
  }

  findDocument(namespaceName, room) {
    return this.documents.find((document) => document.id === `${namespaceName}/${room}`);
  }

  removeDocument(document) {
    this.onRemoveDocumentCallback(document);
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
    this.onClientConnectionCallback = callback;
    return this;
  }

  onClientDisconnect(callback) {
    this.onClientDisconnectionCallback = callback;
    return this;
  }

  onNewDocument(callback) {
    this.onCreateDocumentCallback = callback;
    return this;
  }

  onLeaveDocument(callback) {
    this.onRemoveDocumentCallback = callback;
    return this;
  }
}
