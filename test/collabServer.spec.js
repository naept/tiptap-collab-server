import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import io from 'socket.io-client';
import CollabServer from '../src/collabServer';

const storedData = {
  version: 20,
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
const updateData = {
  version: 20,
  clientID: '820185065',
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
  ],
};

describe('CollabServer', () => {
  let collabServer;
  let socket;

  before(() => {
    collabServer = new CollabServer().serve();
  });

  beforeEach((done) => {
    socket = io('http://localhost:6000/some-namespace');
    done();
  });

  afterEach((done) => {
    socket && socket.connected && socket.disconnect();
    fs.rmdirSync('db', { recursive: true });
    done();
  });

  describe('# Client connection', () => {
    it('should allow connection on http port 6000', (done) => {
      socket.on('connect', () => {
        done();
      });
    });

    it('should emit init after client joins', (done) => {
      socket.on('init', () => {
        done();
      });

      socket.emit('join', {
        room: 'some-room',
        clientID: 'client-1',
      });
    });

    it('should emit clients IDs after client joins', (done) => {
      const socket2 = io('http://localhost:6000/some-namespace');
      const socket3 = io('http://localhost:6000/some-namespace');
      const socket4 = io('http://localhost:6000/some-namespace');
      const socket5 = io('http://localhost:6000/some-other-namespace');

      let step = 0;
      socket.on('getClients', (data) => {
        step += 1;
        switch (step) {
          case 1:
            expect(data).to.eql(['client-1']);
            socket2.emit('join', {
              room: 'some-room',
              clientID: 'client-2',
            });
            break;

          case 2:
            expect(data).to.eql(['client-1', 'client-2']);
            socket3.emit('join', {
              room: 'some-room',
              clientID: 'client-3',
            });
            break;

          case 3:
            expect(data).to.eql(['client-1', 'client-2', 'client-3']);
            socket4.emit('join', {
              room: 'some-other-room',
              clientID: 'client-4',
            });
            break;

          default:
            break;
        }
      });

      socket4.on('getClients', (data) => {
        expect(data).to.eql(['client-4']);
        socket5.emit('join', {
          room: 'some-other-room',
          clientID: 'client-5',
        });
      });

      socket5.on('getClients', (data) => {
        expect(data).to.eql(['client-5']);

        socket2.disconnect();
        socket3.disconnect();
        socket4.disconnect();
        socket5.disconnect();

        done();
      });

      socket.emit('join', {
        room: 'some-room',
        clientID: 'client-1',
      });
    });

    it('should emit getSelection after client joins', (done) => {
      const socket2 = io('http://localhost:6000/some-namespace');

      let step = 0;
      socket.on('getSelections', (data) => {
        step += 1;
        switch (step) {
          case 1:
            expect(data).to.eql([]);
            socket2.emit('join', {
              room: 'some-room',
              clientID: 'client-2',
            });
            break;

          case 2:
            expect(data).to.eql([]);
            socket.disconnect();
            socket2.disconnect();
            done();
            break;

          default:
            break;
        }
      });

      socket.emit('join', {
        room: 'some-room',
        clientID: 'client-1',
      });
    });

    it('should emit initFailed if connection guard rejects', (done) => {
      collabServer.beforeConnection((_param, _resolve, reject) => { reject(); });

      socket.on('initFailed', () => {
        collabServer.beforeConnection((_param, resolve) => { resolve(); });
        done();
      });

      socket.emit('join', {
        room: 'some-room',
        clientID: 'client-1',
      });
    });
  });

  describe('# On update message', () => {
    it('should emit new version of steps if version matches', (done) => {
      collabServer.findOrCreateDocument('/some-namespace', 'some-room').then((document) => {
        const databaseGetDocStub = sinon.stub(document.database, 'getDoc');
        databaseGetDocStub.returns(storedData);

        socket.on('update', (data) => {
          expect(data).to.eql({
            version: updateData.version + 1,
            steps: updateData.steps.map((step, index) => ({
              step: JSON.parse(JSON.stringify(step)),
              version: updateData.version + index + 1,
              clientID: updateData.clientID,
            })),
          });

          databaseGetDocStub.restore();
          done();
        });

        socket.emit('join', {
          room: 'some-room',
          clientID: 'client-1',
        });
        socket.emit('update', updateData);
      });
    });

    it('should emit stored version of steps if version does not match', (done) => {
      socket.on('update', (data) => {
        expect(data).to.eql({
          version: updateData.version,
          steps: [],
        });

        done();
      });

      socket.emit('join', {
        room: 'some-room',
        clientID: 'client-1',
      });
      socket.emit('update', updateData);
    });
  });

  describe('# On updateSelection message', () => {
    let socket2;

    beforeEach((done) => {
      socket.emit('join', {
        room: 'some-room',
        clientID: 'client-1',
      });

      socket.on('init', () => {
        socket2 = io('http://localhost:6000/some-namespace');
        socket2.emit('join', {
          room: 'some-room',
          clientID: 'client-2',
        });
        socket2.on('init', () => {
          done();
        });
      });
    });

    afterEach((done) => {
      socket.disconnect();
      socket2.disconnect();
      done();
    });

    it('should emit getSelection with updated selection to every other socket of the room if modified', (done) => {
      let step = 0;
      socket2.on('getSelections', (data) => {
        step += 1;
        switch (step) {
          case 1: // init
            break;

          case 2:
            expect(data).to.eql([
              {
                clientID: 'client-1',
                selection: {
                  from: 1,
                  to: 1,
                },
              },
            ]);
            done();
            break;

          default:
            break;
        }
      });

      socket.emit('updateSelection', {
        clientID: 'client-1',
        selection: {
          from: 1,
          to: 1,
        },
      });
    });

    it('should not emit getSelection with updated selection to every other socket of the room if not modified', (done) => {
      let step = 0;
      socket2.on('getSelections', (data) => {
        step += 1;
        switch (step) {
          case 1: // init
            break;

          case 2:
            socket.emit('updateSelection', {
              clientID: 'client-1',
              selection: {
                from: 1,
                to: 1,
              },
            });
            setTimeout(() => {}, 500);
            socket.emit('updateSelection', {
              clientID: 'client-1',
              selection: {
                from: 2,
                to: 3,
              },
            });
            break;

          case 3:
            expect(data).to.eql([
              {
                clientID: 'client-1',
                selection: {
                  from: 2,
                  to: 3,
                },
              },
            ]);
            done();
            break;

          default:
            break;
        }
      });

      socket.emit('updateSelection', {
        clientID: 'client-1',
        selection: {
          from: 1,
          to: 1,
        },
      });
    });
  });

  describe('# on client disconnection', () => {
    it('should emit getSelections', (done) => {
      const socket2 = io('http://localhost:6000/some-namespace');

      let step = 0;
      socket.on('getSelections', (data) => {
        step += 1;
        switch (step) {
          case 1:
            expect(data).to.eql([]);
            socket2.emit('join', {
              room: 'some-room',
              clientID: 'client-2',
            });
            break;

          case 2:
            expect(data).to.eql([]);
            socket2.disconnect();
            break;

          case 3:
            expect(data).to.eql([]);
            socket.disconnect();
            done();
            break;

          default:
            break;
        }
      });

      socket.emit('join', {
        room: 'some-room',
        clientID: 'client-1',
      });
    });

    it('should emit getClients', (done) => {
      const socket2 = io('http://localhost:6000/some-namespace');
      const socket3 = io('http://localhost:6000/some-namespace');

      let step = 0;
      socket.on('getClients', (data) => {
        step += 1;
        switch (step) {
          case 1:
            expect(data).to.eql(['client-1']);
            socket2.emit('join', {
              room: 'some-room',
              clientID: 'client-2',
            });
            break;

          case 2:
            expect(data).to.eql(['client-1', 'client-2']);
            socket3.emit('join', {
              room: 'some-room',
              clientID: 'client-3',
            });
            break;

          case 3:
            expect(data).to.eql(['client-1', 'client-2', 'client-3']);
            socket2.disconnect();
            break;

          case 4:
            expect(data).to.eql(['client-1', 'client-3']);
            socket3.disconnect();
            break;

          case 5:
            expect(data).to.eql(['client-1']);
            done();
            break;

          default:
            break;
        }
      });

      socket.emit('join', {
        room: 'some-room',
        clientID: 'client-1',
      });
    });
  });

  after(() => {
    collabServer.close();
  });
});
