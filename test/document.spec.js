import { expect } from 'chai';
import sinon from 'sinon';
import Document from '../src/document';
import Database from '../src/database';

const defaultData = {
  version: 0,
  doc: { type: 'doc', content: [{ type: 'paragraph' }] },
};

const storedDocument = {
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

const updatedDocument = {
  version: 5,
  doc: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Test!',
          },
        ],
      },
    ],
  },
};

describe('Document', () => {
  let document;

  let databaseLockSpy;
  let databaseUnlockSpy;

  it('can be created with maxStoredSteps argument', () => {
    document = new Document('/Namespace', 'Room', 50);
    expect(document.maxStoredSteps).to.be.equal(50);
  });

  beforeEach(() => {
    document = new Document('/Namespace', 'Room');
    databaseLockSpy = sinon.spy(document.database, 'lock');
    databaseUnlockSpy = sinon.spy(document.database, 'unlock');
  });

  afterEach((done) => {
    databaseLockSpy.restore();
    databaseUnlockSpy.restore();
    document.deleteDatabase()
      .then(() => {
        done();
      });
  });

  describe('# When created', () => {
    it('should have a namespaceDir', () => {
      expect(document).to.have.property('namespaceDir');
      expect(document.namespaceDir).to.equal('/Namespace');
    });

    it('should have a roomName', () => {
      expect(document).to.have.property('roomName');
      expect(document.roomName).to.equal('Room');
    });

    it('should create database', () => {
      expect(document).to.have.property('database');
      expect(document.database).to.be.instanceOf(Database);
    });

    it('should have onVersionMismatchCallback empty function', () => {
      expect(document).to.have.property('onVersionMismatchCallback');
      expect(document.onVersionMismatchCallback()).to.equal(undefined);
    });

    it('should have onNewVersionCallback empty function', () => {
      expect(document).to.have.property('onNewVersionCallback');
      expect(document.onNewVersionCallback()).to.equal(undefined);
    });

    it('should have onSelectionsUpdatedCallback empty function', () => {
      expect(document).to.have.property('onSelectionsUpdatedCallback');
      expect(document.onSelectionsUpdatedCallback()).to.equal(undefined);
    });

    it('should have onClientsUpdatedCallback empty function', () => {
      expect(document).to.have.property('onClientsUpdatedCallback');
      expect(document.onClientsUpdatedCallback()).to.equal(undefined);
    });
  });

  describe('# initDoc', () => {
    const docContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Brand new text!',
            },
          ],
        },
      ],
    };

    it('should store new doc with version in database', (done) => {
      document.initDoc((data) => {
        expect(data).to.be.eql(defaultData);
        return new Promise((resolve) => {
          resolve({
            version: 1,
            doc: docContent,
          });
        });
      })
        .then(() => document.getDoc())
        .then((data) => {
          expect(data).to.be.eql({
            version: 1,
            doc: docContent,
          });
        })
        .finally(() => {
          done();
        });
    });

    it('should return the new doc with version', (done) => {
      document.initDoc((data) => {
        expect(data).to.be.eql(defaultData);
        return new Promise((resolve) => {
          resolve({
            version: 1,
            doc: docContent,
          });
        });
      })
        .then((data) => {
          expect(data).to.be.eql({
            version: 1,
            doc: docContent,
          });
        })
        .finally(() => {
          done();
        });
    });

    it('should lock the database during operation', (done) => {
      const databaseGetSpy = sinon.spy(document.database, 'get');
      const databaseStoreSpy = sinon.spy(document.database, 'store');

      document.initDoc(() => new Promise((resolve) => {
        resolve({
          version: 1,
          doc: docContent,
        });
      }))
        .then(() => {
          expect(databaseLockSpy.calledBefore(databaseGetSpy)).to.be.true;
          expect(databaseUnlockSpy.calledAfter(databaseStoreSpy)).to.be.true;
        })
        .finally(() => {
          databaseGetSpy.restore();
          databaseStoreSpy.restore();
          done();
        });
    });
  });

  describe('# getDoc', () => {
    it('should return doc defaultData if it does not exist in database', (done) => {
      document.getDoc()
        .then((data) => {
          expect(data).to.be.eql(defaultData);
        })
        .finally(() => {
          done();
        });
    });

    it('should return doc data if it does exist in database', (done) => {
      const databaseGetStub = sinon.stub(document.database, 'get');
      databaseGetStub.withArgs('doc').resolves(storedDocument);

      document.getDoc()
        .then((data) => {
          expect(data).to.be.eql(storedDocument);
        })
        .finally(() => {
          databaseGetStub.restore();
          done();
        });
    });

    it('should lock the database during operation', (done) => {
      const databaseGetSpy = sinon.spy(document.database, 'get');

      document.getDoc()
        .then(() => {
          expect(databaseLockSpy.calledBefore(databaseGetSpy)).to.be.true;
          expect(databaseUnlockSpy.calledAfter(databaseGetSpy)).to.be.true;
        })
        .finally(() => {
          databaseGetSpy.restore();
          done();
        });
    });
  });

  describe('# updateDoc', () => {
    let databaseGetStub;

    beforeEach(() => {
      databaseGetStub = sinon.stub(document.database, 'get');
      databaseGetStub.withArgs('doc').resolves(storedDocument);
      databaseGetStub.withArgs('steps').resolves(storedSteps);
    });

    afterEach(() => {
      databaseGetStub.restore();
    });

    describe('- if database is locked', () => {
      it('should not throw error', (done) => {
        document.database.lock()
          .then(() => document.updateDoc(updateData))
          .then(() => {
            done();
          });
      });
    });

    describe('- if versions don\'t match', () => {
      it('should call onVersionMismatchCallback with steps from the given version', (done) => {
        const onVersionMismatchCallbackSpy = sinon.spy(document, 'onVersionMismatchCallback');

        document.updateDoc({
          ...updateData,
          version: 1,
        })
          .then(() => {
            expect(onVersionMismatchCallbackSpy.calledOnceWithExactly({
              version: 1,
              steps: storedSteps.filter((step) => step.version > 1),
            })).to.be.true;
          })
          .finally(() => {
            onVersionMismatchCallbackSpy.restore();
            done();
          });
      });

      it('should not update the document', (done) => {
        const databaseStoreSpy = sinon.spy(document.database, 'store');

        document.updateDoc({
          ...updateData,
          version: 1,
        })
          .then(() => {
            expect(databaseStoreSpy.neverCalledWith('doc')).to.be.true;
          })
          .finally(() => {
            databaseStoreSpy.restore();
            done();
          });
      });

      it('should not update the steps', (done) => {
        const databaseStoreSpy = sinon.spy(document.database, 'store');

        document.updateDoc({
          ...updateData,
          version: 1,
        })
          .then(() => {
            expect(databaseStoreSpy.neverCalledWith('steps')).to.be.true;
          })
          .finally(() => {
            databaseStoreSpy.restore();
            done();
          });
      });

      it('should lock the database during operation', (done) => {
        document.updateDoc({
          ...updateData,
          version: 1,
        })
          .then(() => {
            expect(databaseLockSpy.calledBefore(databaseGetStub)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseGetStub)).to.be.true;
          })
          .finally(() => {
            done();
          });
      });
    });

    describe('- if versions do match', () => {
      it('should apply steps to document', (done) => {
        const databaseStoreSpy = sinon.spy(document.database, 'store');

        document.updateDoc(updateData)
          .then(() => {
            expect(databaseStoreSpy.calledWith('doc', updatedDocument)).to.be.true;
          })
          .finally(() => {
            databaseStoreSpy.restore();
            done();
          });
      });

      it('should update the steps', (done) => {
        const databaseStoreSpy = sinon.spy(document.database, 'store');

        document.updateDoc(updateData)
          .then(() => {
            expect(databaseStoreSpy.calledWith('steps', [
              ...storedSteps,
              ...updateData.steps.map((step, index) => ({
                step: JSON.parse(JSON.stringify(step)),
                version: updateData.version + index + 1,
                clientID: updateData.clientID,
              })),
            ])).to.be.true;
          })
          .finally(() => {
            databaseStoreSpy.restore();
            done();
          });
      });

      it('should update the steps and remove old steps from database', (done) => {
        const databaseStoreSpy = sinon.spy(document.database, 'store');

        document.maxStoredSteps = 1;

        document.updateDoc(updateData)
          .then(() => {
            expect(databaseStoreSpy.calledWith('steps', [
              storedSteps[2],
              ...updateData.steps.map((step, index) => ({
                step: JSON.parse(JSON.stringify(step)),
                version: updateData.version + index + 1,
                clientID: updateData.clientID,
              })),
            ])).to.be.true;
          })
          .finally(() => {
            databaseStoreSpy.restore();
            done();
          });
      });

      it('should call onNewVersionCallback with new version and new steps', (done) => {
        const onNewVersionCallbackSpy = sinon.spy(document, 'onNewVersionCallback');

        document.updateDoc(updateData)
          .then(() => {
            expect(onNewVersionCallbackSpy.calledOnceWithExactly({
              version: updateData.version + updateData.steps.length,
              steps: updateData.steps.map((step, index) => ({
                step: JSON.parse(JSON.stringify(step)),
                version: updateData.version + index + 1,
                clientID: updateData.clientID,
              })),
            })).to.be.true;
          })
          .finally(() => {
            onNewVersionCallbackSpy.restore();
            done();
          });
      });

      it('should lock the database during operation', (done) => {
        const databaseStoreSpy = sinon.spy(document.database, 'store');
        document.updateDoc(updateData)
          .then(() => {
            expect(databaseLockSpy.calledBefore(databaseGetStub)).to.be.true;
            expect(databaseLockSpy.calledBefore(databaseStoreSpy)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseStoreSpy)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseGetStub)).to.be.true;
          })
          .finally(() => {
            databaseStoreSpy.restore();
            done();
          });
      });
    });
  });

  describe('# getSelections', () => {
    it('should return an empty array if no selection exist', (done) => {
      document.getSelections()
        .then((data) => {
          expect(data).to.be.eql([]);
        })
        .finally(() => {
          done();
        });
    });

    it('should return selections as an array if some selections exist', (done) => {
      const databaseGetStub = sinon.stub(document.database, 'get');
      databaseGetStub.withArgs('sel').resolves(storedSelections);

      document.getSelections()
        .then((data) => {
          expect(data).to.be.eql(Object.values(storedSelections));
        })
        .finally(() => {
          databaseGetStub.restore();
          done();
        });
    });

    it('should lock the database during operation', (done) => {
      const databaseGetSpy = sinon.spy(document.database, 'get');

      document.getSelections()
        .then(() => {
          expect(databaseLockSpy.calledBefore(databaseGetSpy)).to.be.true;
          expect(databaseUnlockSpy.calledAfter(databaseGetSpy)).to.be.true;
        })
        .finally(() => {
          databaseGetSpy.restore();
          done();
        });
    });
  });

  describe('# updateSelection', () => {
    let databaseGetStub;
    let databaseStoreSpy;

    beforeEach(() => {
      databaseGetStub = sinon.stub(document.database, 'get');
      databaseGetStub.withArgs('sel').resolves(storedSelections);
      databaseStoreSpy = sinon.spy(document.database, 'store');
    });

    afterEach(() => {
      databaseStoreSpy.restore();
      databaseGetStub.restore();
    });

    describe('- if database is locked', () => {
      it('should not throw error', (done) => {
        document.database.lock()
          .then(() => document.updateSelection({ clientID: 'newClient', selection: { from: 1, to: 2 } }, 'newSocket'))
          .then(() => {
            done();
          });
      });
    });

    describe('- if client not already in the list', () => {
      it('should add selection to list', (done) => {
        document.updateSelection({ clientID: 'newClient', selection: { from: 1, to: 2 } }, 'newSocket')
          .then(() => {
            expect(databaseStoreSpy.calledOnceWithExactly('sel', {
              ...storedSelections,
              newSocket: {
                clientID: 'newClient',
                selection: {
                  from: 1,
                  to: 2,
                },
              },
            })).to.be.true;
          })
          .finally(() => {
            done();
          });
      });

      it('should call onSelectionsUpdatedCallback with updated selections', (done) => {
        const onSelectionsUpdatedCallbackSpy = sinon.spy(document, 'onSelectionsUpdatedCallback');

        document.updateSelection({ clientID: 'newClient', selection: { from: 1, to: 2 } }, 'newSocket')
          .then(() => {
            expect(onSelectionsUpdatedCallbackSpy.calledOnceWithExactly(Object.values({
              ...storedSelections,
              newSocket: {
                clientID: 'newClient',
                selection: {
                  from: 1,
                  to: 2,
                },
              },
            }))).to.be.true;
          })
          .finally(() => {
            onSelectionsUpdatedCallbackSpy.restore();
            done();
          });
      });

      it('should lock the database during operation', (done) => {
        document.updateSelection({ clientID: 'newClient', selection: { from: 1, to: 2 } }, 'newSocket')
          .then(() => {
            expect(databaseLockSpy.calledBefore(databaseGetStub)).to.be.true;
            expect(databaseLockSpy.calledBefore(databaseStoreSpy)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseGetStub)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseStoreSpy)).to.be.true;
          })
          .finally(() => {
            done();
          });
      });
    });

    describe('- if client already in the list and selection did change', () => {
      it('should update selection of client in the list', (done) => {
        document.updateSelection({ ...storedSelections['socket-a'], selection: { from: 1, to: 2 } }, 'socket-a')
          .then(() => {
            expect(databaseStoreSpy.calledOnceWithExactly('sel', {
              ...storedSelections,
              'socket-a': {
                clientID: 'client-1',
                selection: {
                  from: 1,
                  to: 2,
                },
              },
            })).to.be.true;
          })
          .finally(() => {
            done();
          });
      });

      it('should call onSelectionsUpdatedCallback with updated selections', (done) => {
        const onSelectionsUpdatedCallbackSpy = sinon.spy(document, 'onSelectionsUpdatedCallback');

        document.updateSelection({ ...storedSelections['socket-a'], selection: { from: 1, to: 2 } }, 'socket-a')
          .then(() => {
            expect(onSelectionsUpdatedCallbackSpy.calledOnceWithExactly(Object.values({
              ...storedSelections,
              'socket-a': {
                clientID: 'client-1',
                selection: {
                  from: 1,
                  to: 2,
                },
              },
            }))).to.be.true;
          })
          .finally(() => {
            onSelectionsUpdatedCallbackSpy.restore();
            done();
          });
      });

      it('should lock the database during operation', (done) => {
        document.updateSelection({ ...storedSelections['socket-a'], selection: { from: 1, to: 2 } }, 'socket-a')
          .then(() => {
            expect(databaseLockSpy.calledBefore(databaseGetStub)).to.be.true;
            expect(databaseLockSpy.calledBefore(databaseStoreSpy)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseGetStub)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseStoreSpy)).to.be.true;
          })
          .finally(() => {
            done();
          });
      });
    });

    describe('- if client already in the list but selection did not change', () => {
      it('should not update selection of client in the list', (done) => {
        document.updateSelection(storedSelections['socket-a'], 'socket-a')
          .then(() => {
            expect(databaseStoreSpy.neverCalledWith('sel')).to.be.true;
          })
          .finally(() => {
            done();
          });
      });

      it('should not call onSelectionsUpdatedCallback', (done) => {
        const onSelectionsUpdatedCallbackSpy = sinon.spy(document, 'onSelectionsUpdatedCallback');

        document.updateSelection(storedSelections['socket-a'], 'socket-a')
          .then(() => {
            expect(onSelectionsUpdatedCallbackSpy.notCalled).to.be.true;
          })
          .finally(() => {
            onSelectionsUpdatedCallbackSpy.restore();
            done();
          });
      });

      it('should lock the database during operation', (done) => {
        document.updateSelection(storedSelections['socket-a'], 'socket-a')
          .then(() => {
            expect(databaseLockSpy.calledBefore(databaseGetStub)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseGetStub)).to.be.true;
          })
          .finally(() => {
            done();
          });
      });
    });
  });

  describe('# removeSelection', () => {
    let databaseGetStub;
    let databaseStoreSpy;

    beforeEach(() => {
      databaseGetStub = sinon.stub(document.database, 'get');
      databaseGetStub.withArgs('sel').resolves(storedSelections);
      databaseStoreSpy = sinon.spy(document.database, 'store');
    });

    afterEach(() => {
      databaseStoreSpy.restore();
      databaseGetStub.restore();
    });

    describe('- if client is in the list', () => {
      it('should delete client from the list', (done) => {
        document.removeSelection('socket-a')
          .then(() => {
            const { 'socket-a': deleted, ...newSelections } = storedSelections;
            expect(databaseStoreSpy.calledOnceWithExactly('sel', newSelections)).to.be.true;
          })
          .finally(() => {
            done();
          });
      });

      it('should call onSelectionsUpdatedCallback with updated selections', (done) => {
        const onSelectionsUpdatedCallbackSpy = sinon.spy(document, 'onSelectionsUpdatedCallback');

        document.removeSelection('socket-a')
          .then(() => {
            const { 'socket-a': deleted, ...newSelections } = storedSelections;
            expect(
              onSelectionsUpdatedCallbackSpy.calledOnceWithExactly(Object.values(newSelections)),
            ).to.be.true;
          })
          .finally(() => {
            onSelectionsUpdatedCallbackSpy.restore();
            done();
          });
      });

      it('should lock the database during operation', (done) => {
        document.removeSelection('socket-a')
          .then(() => {
            expect(databaseLockSpy.calledBefore(databaseGetStub)).to.be.true;
            expect(databaseLockSpy.calledBefore(databaseStoreSpy)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseGetStub)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseStoreSpy)).to.be.true;
          })
          .finally(() => {
            done();
          });
      });
    });

    describe('- if client is not in the list', () => {
      it('should not change the list', (done) => {
        document.removeSelection('fakeSocket')
          .then(() => {
            expect(databaseStoreSpy.neverCalledWith('sel')).to.be.true;
          })
          .finally(() => {
            done();
          });
      });

      it('should not call onSelectionsUpdatedCallback', (done) => {
        const onSelectionsUpdatedCallbackSpy = sinon.spy(document, 'onSelectionsUpdatedCallback');

        document.removeSelection('fakeSocket')
          .then(() => {
            expect(onSelectionsUpdatedCallbackSpy.notCalled).to.be.true;
          })
          .finally(() => {
            onSelectionsUpdatedCallbackSpy.restore();
            done();
          });
      });

      it('should lock the database during operation', (done) => {
        document.removeSelection('fakeSocket')
          .then(() => {
            expect(databaseLockSpy.calledBefore(databaseGetStub)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseGetStub)).to.be.true;
          })
          .finally(() => {
            done();
          });
      });
    });
  });

  describe('# getClients', () => {
    it('should return an empty array if no clients exist', (done) => {
      document.getClients()
        .then((data) => {
          expect(data).to.be.eql([]);
        })
        .finally(() => {
          done();
        });
    });

    it('should return clients as an array if some clients exist', (done) => {
      const databaseGetStub = sinon.stub(document.database, 'get');
      databaseGetStub.withArgs('clients').resolves(storedClients);

      document.getClients()
        .then((data) => {
          expect(data).to.be.eql(Object.values(storedClients));
        })
        .finally(() => {
          databaseGetStub.restore();
          done();
        });
    });

    it('should lock the database during operation', (done) => {
      const databaseGetSpy = sinon.spy(document.database, 'get');

      document.getClients()
        .then(() => {
          expect(databaseLockSpy.calledBefore(databaseGetSpy)).to.be.true;
          expect(databaseUnlockSpy.calledAfter(databaseGetSpy)).to.be.true;
        })
        .finally(() => {
          databaseGetSpy.restore();
          done();
        });
    });
  });

  describe('# addClient', () => {
    let databaseGetStub;
    let databaseStoreSpy;

    beforeEach(() => {
      databaseGetStub = sinon.stub(document.database, 'get');
      databaseGetStub.withArgs('clients').resolves(storedClients);
      databaseStoreSpy = sinon.spy(document.database, 'store');
    });

    afterEach(() => {
      databaseStoreSpy.restore();
      databaseGetStub.restore();
    });

    describe('- if client is not already in the list', () => {
      it('should add client to list', (done) => {
        document.addClient('newClient', 'newSocket')
          .then(() => {
            expect(databaseStoreSpy.calledOnceWithExactly('clients', {
              ...storedClients,
              newSocket: 'newClient',
            })).to.be.true;
          })
          .finally(() => {
            done();
          });
      });

      it('should call onClientsUpdatedCallback with all clients', (done) => {
        const onClientsUpdatedCallbackSpy = sinon.spy(document, 'onClientsUpdatedCallback');

        document.addClient('newClient', 'newSocket')
          .then(() => {
            expect(onClientsUpdatedCallbackSpy.calledOnceWithExactly(Object.values({
              ...storedClients,
              newSocket: 'newClient',
            }))).to.be.true;
          })
          .finally(() => {
            onClientsUpdatedCallbackSpy.restore();
            done();
          });
      });

      it('should lock the database during operation', (done) => {
        document.addClient('newClient', 'newSocket')
          .then(() => {
            expect(databaseLockSpy.calledBefore(databaseGetStub)).to.be.true;
            expect(databaseLockSpy.calledBefore(databaseStoreSpy)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseGetStub)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseStoreSpy)).to.be.true;
          })
          .finally(() => {
            done();
          });
      });
    });

    describe('- if client is already in the list', () => {
      it('should not update clients list', (done) => {
        document.addClient('client-1', 'socket-a')
          .then(() => {
            expect(databaseStoreSpy.neverCalledWith('clients')).to.be.true;
          })
          .finally(() => {
            done();
          });
      });

      it('should not call onClientsUpdatedCallback', (done) => {
        const onClientsUpdatedCallbackSpy = sinon.spy(document, 'onClientsUpdatedCallback');

        document.addClient('client-1', 'socket-a')
          .then(() => {
            expect(onClientsUpdatedCallbackSpy.notCalled).to.be.true;
          })
          .finally(() => {
            onClientsUpdatedCallbackSpy.restore();
            done();
          });
      });

      it('should lock the database during operation', (done) => {
        document.addClient('client-1', 'socket-a')
          .then(() => {
            expect(databaseLockSpy.calledBefore(databaseGetStub)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseGetStub)).to.be.true;
          })
          .finally(() => {
            done();
          });
      });
    });
  });

  describe('# removeClient', () => {
    let databaseGetStub;
    let databaseStoreSpy;

    beforeEach(() => {
      databaseGetStub = sinon.stub(document.database, 'get');
      databaseGetStub.withArgs('clients').resolves(storedClients);
      databaseStoreSpy = sinon.spy(document.database, 'store');
    });

    afterEach(() => {
      databaseStoreSpy.restore();
      databaseGetStub.restore();
    });

    describe('- if client is in the list', () => {
      it('should delete client from the list', (done) => {
        document.removeClient('socket-a')
          .then(() => {
            const { 'socket-a': deleted, ...newClients } = storedClients;
            expect(databaseStoreSpy.calledOnceWithExactly('clients', newClients)).to.be.true;
          })
          .finally(() => {
            done();
          });
      });

      it('should call onClientsUpdatedCallback with all clients', (done) => {
        const onClientsUpdatedCallbackSpy = sinon.spy(document, 'onClientsUpdatedCallback');

        document.removeClient('socket-a')
          .then(() => {
            const { 'socket-a': deleted, ...newClients } = storedClients;
            expect(
              onClientsUpdatedCallbackSpy.calledOnceWithExactly(Object.values(newClients)),
            ).to.be.true;
          })
          .finally(() => {
            onClientsUpdatedCallbackSpy.restore();
            done();
          });
      });

      it('should lock the database during operation', (done) => {
        document.removeClient('socket-a')
          .then(() => {
            expect(databaseLockSpy.calledBefore(databaseGetStub)).to.be.true;
            expect(databaseLockSpy.calledBefore(databaseStoreSpy)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseGetStub)).to.be.true;
            expect(databaseUnlockSpy.calledAfter(databaseStoreSpy)).to.be.true;
          })
          .finally(() => {
            done();
          });
      });

      describe('- if client is not in the list', () => {
        it('should not change the list', (done) => {
          document.removeClient('fakeSocket')
            .then(() => {
              expect(databaseStoreSpy.neverCalledWith('clients')).to.be.true;
            })
            .finally(() => {
              done();
            });
        });

        it('should not call onClientsUpdatedCallback', (done) => {
          const onClientsUpdatedCallbackSpy = sinon.spy(document, 'onClientsUpdatedCallback');

          document.removeClient('fakeSocket')
            .then(() => {
              expect(onClientsUpdatedCallbackSpy.notCalled).to.be.true;
            })
            .finally(() => {
              onClientsUpdatedCallbackSpy.restore();
              done();
            });
        });

        it('should lock the database during operation', (done) => {
          document.removeClient('fakeSocket')
            .then(() => {
              expect(databaseLockSpy.calledBefore(databaseGetStub)).to.be.true;
              expect(databaseUnlockSpy.calledAfter(databaseGetStub)).to.be.true;
            })
            .finally(() => {
              done();
            });
        });
      });
    });
  });

  describe('# cleanUpClientsAndSelections', () => {
    let databaseGetStub;
    let databaseStoreSpy;

    beforeEach(() => {
      databaseGetStub = sinon.stub(document.database, 'get');
      databaseGetStub.withArgs('clients').resolves(storedClients);
      databaseGetStub.withArgs('sel').resolves(storedSelections);
      databaseStoreSpy = sinon.spy(document.database, 'store');
    });

    afterEach(() => {
      databaseStoreSpy.restore();
      databaseGetStub.restore();
    });

    it('should not delete any client if they are all linked to a socket in the given list', (done) => {
      const socketIDs = ['socket-a', 'socket-b'];
      document.cleanUpClientsAndSelections(socketIDs)
        .then(() => {
          expect(databaseStoreSpy.neverCalledWith('clients')).to.be.true;
        })
        .finally(() => {
          done();
        });
    });

    it('should delete clients not linked to a socket in the given list', (done) => {
      const socketIDs = ['socket-a'];
      document.cleanUpClientsAndSelections(socketIDs)
        .then(() => {
          const newClients = Object.keys(storedClients)
            .filter((key) => socketIDs.includes(key))
            .reduce((filteredClients, key) => ({
              ...filteredClients,
              [key]: storedClients[key],
            }), {});
          expect(databaseStoreSpy.calledWithExactly('clients', newClients)).to.be.true;
        })
        .finally(() => {
          done();
        });
    });

    it('should not delete any selection if they are all linked to a socket in the given list', (done) => {
      const socketIDs = ['socket-a', 'socket-b'];
      document.cleanUpClientsAndSelections(socketIDs)
        .then(() => {
          expect(databaseStoreSpy.neverCalledWith('sel')).to.be.true;
        })
        .finally(() => {
          done();
        });
    });

    it('should delete selections not linked to a socket in the given list', (done) => {
      const socketIDs = ['socket-a'];
      document.cleanUpClientsAndSelections(socketIDs)
        .then(() => {
          const newSelections = Object.keys(storedSelections)
            .filter((key) => socketIDs.includes(key))
            .reduce((filteredClients, key) => ({
              ...filteredClients,
              [key]: storedSelections[key],
            }), {});
          expect(databaseStoreSpy.calledWithExactly('sel', newSelections)).to.be.true;
        })
        .finally(() => {
          done();
        });
    });

    it('should lock the database during operation', (done) => {
      document.cleanUpClientsAndSelections(['socket-a'])
        .then(() => {
          expect(databaseLockSpy.calledBefore(databaseGetStub)).to.be.true;
          expect(databaseLockSpy.calledBefore(databaseStoreSpy)).to.be.true;
          expect(databaseUnlockSpy.calledAfter(databaseGetStub)).to.be.true;
          expect(databaseUnlockSpy.calledAfter(databaseStoreSpy)).to.be.true;
        })
        .finally(() => {
          done();
        });
    });
  });

  describe('# onVersionMismatch', () => {
    it('should assign argument to onVersionMismatchCallback', () => {
      const callback = () => 'some callback function result';

      document.onVersionMismatch(callback);

      expect(document.onVersionMismatchCallback()).to.equal('some callback function result');
    });
  });

  describe('# onNewVersion', () => {
    it('should assign argument to onNewVersionCallback', () => {
      const callback = () => 'some callback function result';

      document.onNewVersion(callback);

      expect(document.onNewVersionCallback()).to.equal('some callback function result');
    });
  });

  describe('# onSelectionsUpdated', () => {
    it('should assign argument to onSelectionsUpdatedCallback', () => {
      const callback = () => 'some callback function result';

      document.onSelectionsUpdated(callback);

      expect(document.onSelectionsUpdatedCallback()).to.equal('some callback function result');
    });
  });

  describe('# onClientsUpdated', () => {
    it('should assign argument to onClientsUpdatedCallback', () => {
      const callback = () => 'some callback function result';

      document.onClientsUpdated(callback);

      expect(document.onClientsUpdatedCallback()).to.equal('some callback function result');
    });
  });
});
