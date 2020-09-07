import { Step } from 'prosemirror-transform';
import schema from './schema';
import Database from './database';

// setup socket server
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

function collabServer({ port }) {
  http.listen(port);

  const namespaces = io.of(/^\/[a-zA-Z0-9_/-]+$/);

  namespaces.on('connection', (socket) => {
    const namespace = socket.nsp;
    const namespaceDir = namespace.name;

    socket.on('join', async (room) => {
      socket.join(room);

      const database = new Database(namespaceDir, room);

      socket.on('update', async ({ version, clientID, steps }) => {
      // we need to check if there is another update processed
      // so we store a "locked" state
        const locked = database.getLocked();

        if (locked) {
        // we will do nothing and wait for another client update
          return;
        }

        database.storeLocked(true);

        const storedData = database.getDoc();

        // version mismatch: the stored version is newer
        // so we send all steps of this version back to the user
        if (storedData.version !== version) {
          namespace.in(room).emit('update', {
            version,
            steps: database.getSteps(version),
          });
          database.storeLocked(false);
          return;
        }

        let doc = schema.nodeFromJSON(storedData.doc);

        const newSteps = steps.map((step) => {
          const newStep = Step.fromJSON(schema, step);
          newStep.clientID = clientID;

          // apply step to document
          const result = newStep.apply(doc);
          doc = result.doc;

          return newStep;
        });

        // calculating a new version number is easy
        const newVersion = version + newSteps.length;

        // store data
        database.storeSteps({ version, steps: newSteps });
        database.storeDoc({ version: newVersion, doc });

        // send update to everyone (me and others)
        namespace.in(room).emit('update', {
          version: newVersion,
          steps: database.getSteps(version),
        });

        database.storeLocked(false);
      });

      // send latest document
      namespace.in(room).emit('init', database.getDoc());

      // send client count
      namespace.in(room).emit('getCount', namespace.adapter.rooms[room].length);
      socket.on('disconnect', () => {
        if (namespace.adapter.rooms[room]) {
          namespace.in(room).emit('getCount', namespace.adapter.rooms[room].length);
        }
      });
    });
  });
}

export default collabServer;
