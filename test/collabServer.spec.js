import { expect } from 'chai';
import fs from 'fs';
import io from 'socket.io-client';
import CollabServer from '../src/collabServer';

const initDocument = {
  version: 3,
  doc: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Tes',
          },
        ],
      },
    ],
  },
};

const storedSteps = [
  {
    version: 1,
    step: {
      stepType: 'replace',
      from: 1,
      to: 1,
      slice: {
        content: [
          {
            type: 'text',
            text: 't',
          },
        ],
      },
    },
    clientID: '123456789',
  },
  {
    version: 2,
    step: {
      stepType: 'replace',
      from: 2,
      to: 2,
      slice: {
        content: [
          {
            type: 'text',
            text: 'e',
          },
        ],
      },
    },
    clientID: '123456789',
  },
  {
    version: 3,
    step: {
      stepType: 'replace',
      from: 3,
      to: 3,
      slice: {
        content: [
          {
            type: 'text',
            text: 'x',
          },
        ],
      },
    },
    clientID: '123456789',
  },
];

const storedSelections = {
  'socket-a': {
    clientID: 'client-1',
    selection: {
      from: 3,
      to: 3,
    },
  },
  'socket-b': {
    clientID: 'client-2',
    selection: {
      from: 2,
      to: 5,
    },
  },
};

const storedClients = {
  'socket-a': 'client-1',
  'socket-b': 'client-2',
};

const updateData = {
  version: 3,
  steps: [
    {
      stepType: 'replace',
      from: 4,
      to: 4,
      slice: {
        content: [
          {
            type: 'text',
            text: 't',
          },
        ],
      },
    },
    {
      stepType: 'replace',
      from: 5,
      to: 5,
      slice: {
        content: [
          {
            type: 'text',
            text: '!',
          },
        ],
      },
    },
  ],
};

describe('CollabServer', () => {
  let collabServer;
  let client;

  before(() => {
    collabServer = new CollabServer().serve();
  });

  after(() => {
    collabServer.close();
  });

  beforeEach(() => {
    fs.rmdirSync('db', { recursive: true });
    client = io('http://localhost:6000/some-namespace');
  });

  afterEach(() => {
    client && client.connected && client.disconnect();
  });

  describe('# receive init', () => {
    describe('- if connectionGuard rejects', () => {
      beforeEach(() => {
        collabServer.connectionGuard((_param, _resolve, reject) => { reject(); });
      });

      it('should emit initFailed', (done) => {
        client.on('initFailed', () => {
          done();
        });

        client.emit('join', {
          roomName: 'some-room',
          clientID: 'client',
        });
      });

      it('should disconnect client', (done) => {
        client.on('disconnect', () => {
          done();
        });

        client.emit('join', {
          roomName: 'some-room',
          clientID: 'client',
        });
      });
    });

    describe('- if connectionGuard resolves', () => {
      beforeEach(() => {
        collabServer.connectionGuard((_param, resolve) => { resolve(); });
      });

      it('should emit getClients with new client in list', (done) => {
        // This event will be send again on disconnect
        client.on('getClients', (clients) => {
          expect(clients).to.be.eql(['client']);
          done();
          client.on('getClients', () => {}); // restore
        });

        client.emit('join', {
          roomName: 'some-room',
          clientID: 'client',
        });
      });

      it('should go through onClientConnectCallback', (done) => {
        collabServer.onClientConnect((_param, resolve) => {
          collabServer.onClientConnect((_p, r) => { r(); }); // restore
          done();
          resolve();
        });

        client.emit('join', {
          roomName: 'some-room',
          clientID: 'client',
        });
      });

      describe('- - if init document callback rejects', () => {
        beforeEach(() => {
          collabServer.initDocument((_param, _resolve, reject) => { reject(); });
        });

        it('should emit initFailed', (done) => {
          client.on('initFailed', () => {
            done();
          });

          client.emit('join', {
            roomName: 'some-room',
            clientID: 'client',
          });
        });

        it('should disconnect client', (done) => {
          client.on('disconnect', () => {
            done();
          });

          client.emit('join', {
            roomName: 'some-room',
            clientID: 'client',
          });
        });
      });

      describe('- - if init document callback resolves', () => {
        it('should emit init with document default content if initDocument does nothing', (done) => {
          collabServer.initDocument((param, resolve) => { resolve(param); });

          client.on('init', (params) => {
            expect(params).to.be.eql({
              version: 0,
              doc: { type: 'doc', content: [{ type: 'paragraph' }] },
            });
            done();
          });

          client.emit('join', {
            roomName: 'some-room',
            clientID: 'client',
          });
        });

        it('should emit init with document modified content if initDocument modifies document', (done) => {
          collabServer.initDocument((_param, resolve) => { resolve(initDocument); });

          client.on('init', (params) => {
            expect(params).to.be.eql(initDocument);
            done();
          });

          client.emit('join', {
            roomName: 'some-room',
            clientID: 'client',
          });
        });

        it('should emit getSelections with selections', (done) => {
          client.on('getSelections', (selections) => {
            expect(selections).to.be.eql([]);
            done();
            client.on('getSelections', () => {}); // restore
          });

          client.emit('join', {
            roomName: 'some-room',
            clientID: 'client',
          });
        });
      });
    });
  });

  describe('# receive update', () => {
    beforeEach((done) => {
      fs.mkdirSync('./db/some-namespace', { recursive: true });
      fs.writeFileSync('./db/some-namespace/some-room-steps.json', JSON.stringify(storedSteps));

      collabServer.connectionGuard((_param, resolve) => { resolve(); });
      collabServer.initDocument((_param, resolve) => { resolve(initDocument); });

      client.on('init', () => {
        done();
      });

      client.emit('join', {
        roomName: 'some-room',
        clientID: 'client',
      });
    });

    describe('- if version mismatch', () => {
      it('should emit update with steps from received version', (done) => {
        client.on('update', (params) => {
          expect(params).to.be.eql({
            version: 1,
            steps: storedSteps.filter((s) => s.version > 1),
          });
          done();
        });

        client.emit('update', {
          ...updateData,
          version: 1,
        });
      });
    });

    describe('- if version match', () => {
      it('should emit update with new steps from received version', (done) => {
        client.on('update', (params) => {
          expect(params).to.be.eql({
            version: updateData.version + updateData.steps.length,
            steps: updateData.steps.map((step, index) => ({
              step: JSON.parse(JSON.stringify(step)),
              version: updateData.version + index + 1,
              clientID: 'client',
            })),
          });
          done();
        });

        client.emit('update', updateData);
      });
    });
  });

  describe('# receive updateSelection', () => {
    let client2;

    beforeEach((done) => {
      collabServer.connectionGuard((_param, resolve) => { resolve(); });
      collabServer.initDocument((_param, resolve) => { resolve(initDocument); });

      client2 = io('http://localhost:6000/some-namespace');
      client2.on('init', () => {
        done();
      });

      client.on('getSelections', () => {
        client2.emit('join', {
          roomName: 'some-room',
          clientID: 'client-2',
        });
      });

      client.emit('join', {
        roomName: 'some-room',
        clientID: 'client',
      });
    });

    afterEach(() => {
      client2 && client2.connected && client2.disconnect();
    });

    it('should emit getSelections with all current selections to every other client', (done) => {
      const newSelection1 = { selection: { from: 1, to: 2 } };
      const newSelection2 = { selection: { from: 4, to: 4 } };

      let client2GetSelectionsCount = 0;

      client2.on('getSelections', (params) => {
        client2GetSelectionsCount += 1;
        switch (client2GetSelectionsCount) {
          case 1:
            expect(params).to.be.eql([]);
            break;

          case 2:
            expect(params).to.be.eql([
              {
                ...newSelection1,
                clientID: 'client',
              },
            ]);
            client2.emit('updateSelection', newSelection2);
            break;

          default:
            break;
        }
      });

      client.on('getSelections', (params) => {
        expect(params).to.be.eql([
          {
            ...newSelection1,
            clientID: 'client',
          },
          {
            ...newSelection2,
            clientID: 'client-2',
          },
        ]);
        done();
      });

      client.emit('updateSelection', newSelection1);
    });
  });

  describe('# disconnection', () => {
    let client2;

    beforeEach((done) => {
      fs.mkdirSync('./db/some-namespace', { recursive: true });
      fs.writeFileSync('./db/some-namespace/some-room-steps.json', JSON.stringify(storedSteps));

      collabServer.connectionGuard((_param, resolve) => { resolve(); });
      collabServer.initDocument((_param, resolve) => { resolve(initDocument); });

      client2 = io('http://localhost:6000/some-namespace');
      client2.once('init', () => {
        done();
      });

      client.once('getSelections', () => {
        client2.emit('join', {
          roomName: 'some-room',
          clientID: 'client-2',
        });
      });

      client.emit('join', {
        roomName: 'some-room',
        clientID: 'client',
      });
    });

    afterEach(() => {
      client2 && client2.connected && client2.disconnect();
    });

    it('should emit getSelections with all current selections to every other client', (done) => {
      let client2GetSelectionsCount = 0;

      client2.on('getSelections', (params) => {
        client2GetSelectionsCount += 1;
        switch (client2GetSelectionsCount) {
          case 1:
            // Emitted once after client2 init
            break;

          case 2:
            expect(params).to.be.eql(Object.values(storedSelections));
            done();
            break;

          default:
            break;
        }
      });

      fs.writeFileSync('./db/some-namespace/some-room-sel.json', JSON.stringify({
        ...storedSelections,
        [client.id]: {
          clientID: 'client-1',
          selection: {
            from: 3,
            to: 3,
          },
        },
      }));

      client.disconnect();
    });

    it('should emit getClients to every other client', (done) => {
      client2.on('getClients', (params) => {
        expect(params).to.be.eql(Object.values(storedClients));
        done();
      });

      fs.writeFileSync('./db/some-namespace/some-room-clients.json', JSON.stringify({
        ...storedClients,
        [client.id]: 'client-1',
      }));

      client.disconnect();
    });

    it('should go through leaveDocumentCallback', (done) => {
      collabServer.leaveDocument((_param, resolve) => {
        collabServer.leaveDocument((_p, r) => { r(); }); // restore
        done();
        resolve();
      });

      client.disconnect();
    });

    it('should go through onClientDisconnectCallback', (done) => {
      collabServer.onClientDisconnect((_param, resolve) => {
        collabServer.onClientDisconnect((_p, r) => { r(); }); // restore
        done();
        resolve();
      });

      client.disconnect();
    });
  });
});
