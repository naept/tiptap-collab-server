import Document from './document';

// setup socket server
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

export default class CollabServer {
  constructor(options) {
    this.options = options;

    this.onConnectingCallback = () => {};
    this.onConnectedCallback = () => {};
    this.onUpdatingCallback = () => {};
    this.onUpdatedCallback = () => {};
  }

  connect() {
    http.listen(this.options.port || 6000);

    // const namespaces = io.of(/^\/[a-zA-Z0-9_/-]+$/);
    const namespaces = io.of(this.options.namespaceFilter || /^\/[a-zA-Z0-9_/-]+$/);

    namespaces.on('connection', (socket) => {
      const namespace = socket.nsp;
      const namespaceDir = namespace.name;

      socket.on('join', async (room) => {
        this.onConnectingCallback({ namespaceDir, room });

        socket.join(room);

        const document = new Document(namespaceDir, room);

        // version mismatch: the stored version is newer
        // so we send all steps of this version back to the user
        document.onVersionMismatch(({ version, steps }) => {
          namespace.in(room).emit('update', {
            version,
            steps,
          });
        });

        // send update to everyone (me and others)
        document.onNewVersion(({ version, steps }) => {
          namespace.in(room).emit('update', {
            version,
            steps,
          });
        });

        this.onConnectedCallback({ document });

        socket.on('update', async (data) => {
          this.onUpdatingCallback({ document, data });
          document.update(data);
          this.onUpdatedCallback({ document, data });
        });

        // send latest document
        namespace.in(room).emit('init', document.getDoc());

        // send client count
        namespace.in(room).emit('getCount', namespace.adapter.rooms[room].length);
        socket.on('disconnect', () => {
          if (namespace.adapter.rooms[room]) {
            namespace.in(room).emit('getCount', namespace.adapter.rooms[room].length);
          }
        });
      });
    });

    return this;
  }

  onConnecting(callback) {
    this.onConnectingCallback = callback;
    return this;
  }

  onConnected(callback) {
    this.onConnectedCallback = callback;
    return this;
  }

  onUpdating(callback) {
    this.onUpdatingCallback = callback;
    return this;
  }

  onUpdated(callback) {
    this.onUpdatedCallback = callback;
    return this;
  }
}
