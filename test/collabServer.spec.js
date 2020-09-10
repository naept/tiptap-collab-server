import { expect } from 'chai';
import sinon from 'sinon';
import io from 'socket.io-client';
import CollabServer from '../src/collabServer';

const updateData = {
  version: 20,
  clientID: 820185065,
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

      socket.emit('join', 'some-room');
    });

    it('should emit count of clients after client joins', (done) => {
      const socket2 = io('http://localhost:6000/some-namespace');
      const socket3 = io('http://localhost:6000/some-namespace');
      const socket4 = io('http://localhost:6000/some-namespace');
      const socket5 = io('http://localhost:6000/some-other-namespace');

      let count = 0;
      socket.on('getCount', (data) => {
        count += 1;
        switch (count) {
          case 1:
            expect(data).to.equal(1);
            socket2.emit('join', 'some-room');
            break;

          case 2:
            expect(data).to.equal(2);
            socket3.emit('join', 'some-room');
            break;

          case 3:
            expect(data).to.equal(3);
            socket4.emit('join', 'some-other-room');
            break;

          default:
            break;
        }
      });

      socket4.on('getCount', (data) => {
        expect(data).to.equal(1);
        socket5.emit('join', 'some-other-room');
      });

      socket5.on('getCount', (data) => {
        expect(data).to.equal(1);

        socket2.disconnect();
        socket3.disconnect();
        socket4.disconnect();
        socket5.disconnect();

        done();
      });

      socket.emit('join', 'some-room');
    });
  });

  describe('# Client disconnection', () => {
    it('should emit count of clients on client disconnect', (done) => {
      const socket2 = io('http://localhost:6000/some-namespace');
      const socket3 = io('http://localhost:6000/some-namespace');

      let count = 0;
      socket.on('getCount', (data) => {
        count += 1;
        switch (count) {
          case 1:
            expect(data).to.equal(1);
            socket2.emit('join', 'some-room');
            break;

          case 2:
            expect(data).to.equal(2);
            socket3.emit('join', 'some-room');
            break;

          case 3:
            expect(data).to.equal(3);
            socket3.disconnect();
            break;

          case 4:
            expect(data).to.equal(2);
            socket2.disconnect();
            break;

          case 5:
            expect(data).to.equal(1);
            done();
            break;

          default:
            break;
        }
      });

      socket.emit('join', 'some-room');
    });
  });

  // describe('# On update message', () => {
  //   it('should call onUpdatingCallback', () => {
  //     const onUpdatingCallbackSpy = sinon.spy(collabServer, 'onUpdatingCallback');

  //     socket.emit('join', 'some-room');
  //     socket.emit('update', updateData);

  //     expect(onUpdatingCallbackSpy.calledOnce).to.be.true;

  //     onUpdatingCallbackSpy.restore();
  //   });
  // });

  after(() => {
    collabServer.close();
  });
});
