import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import Database from '../src/database';

describe('Database', () => {
  let database;
  let fsExistsSyncStub;
  let fsMkdirSyncSpy;

  beforeEach(() => {
    fsMkdirSyncSpy = sinon.spy(fs, 'mkdirSync');
    fsExistsSyncStub = sinon.stub(fs, 'existsSync');
    fsExistsSyncStub.onFirstCall().returns(false).returns(true);

    database = new Database('/Namespace', 'Room', 2);
  });

  afterEach(() => {
    fsMkdirSyncSpy.restore();
    fsExistsSyncStub.restore();
    fs.rmdirSync('db', { recursive: true });
  });

  describe('# When created', () => {
    it('should have namespaceDir', () => {
      expect(database).to.have.property('namespaceDir');
    });

    it('should have roomName', () => {
      expect(database).to.have.property('roomName');
    });

    it('should have maxStoredSteps', () => {
      expect(database).to.have.property('maxStoredSteps');
    });

    it('should create directory if it does not exist', () => {
      expect(fsMkdirSyncSpy.calledOnce).to.be.true;
    });

    it('should not create directory if it does already exist', () => {
      // eslint-disable-next-line no-unused-vars
      const database2 = new Database('/Namespace', 'Room2');
      expect(fsMkdirSyncSpy.calledOnce).to.be.true;
    });
  });

  describe('# makePath', () => {
    it('should make correct path', () => {
      database = new Database('/Namespace', 'Room');
      expect(database.makePath('-trailer')).to.be.equal('./db/Namespace/Room-trailer');
    });
  });

  describe('# storeDoc', () => {
    it('should store data in doc', () => {
      const fsWriteFileSyncSpy = sinon.spy(fs, 'writeFileSync');

      const someData = {
        test1: 'test 1',
        test2: 'test 2',
      };
      database.storeDoc(someData);

      expect(fsWriteFileSyncSpy.calledOnceWithExactly('./db/Namespace/Room-db.json', JSON.stringify(someData, null, 2))).to.be.true;

      fsWriteFileSyncSpy.restore();
    });
  });

  describe('# storeSteps', () => {
    it('should store steps in file', () => {
      const fsWriteFileSyncSpy = sinon.spy(fs, 'writeFileSync');

      const steps = [
        {
          step: 1,
          data: {
            text: 'Step 1',
          },
        },
        {
          step: 2,
          data: {
            text: 'Step 2',
          },
        },
        {
          step: 3,
          data: {
            text: 'Step 3',
          },
        },
      ];
      database.storeSteps(steps);

      expect(fsWriteFileSyncSpy.calledOnceWithExactly('./db/Namespace/Room-db_steps.json', JSON.stringify(steps))).to.be.true;

      fsWriteFileSyncSpy.restore();
    });

    it('should slice old data if number of stored steps exceeds maxStoredSteps', () => {
      const fsWriteFileSyncSpy = sinon.spy(fs, 'writeFileSync');
      const fsReadFileSyncStub = sinon.stub(fs, 'readFileSync');

      const steps = [
        {
          step: 1,
          data: {
            text: 'Step 1',
          },
        },
        {
          step: 2,
          data: {
            text: 'Step 2',
          },
        },
        {
          step: 3,
          data: {
            text: 'Step 3',
          },
        },
      ];
      fsReadFileSyncStub.returns(JSON.stringify(steps));

      database.storeSteps(steps);

      const concatSteps = [
        {
          step: 2,
          data: {
            text: 'Step 2',
          },
        },
        {
          step: 3,
          data: {
            text: 'Step 3',
          },
        },
        {
          step: 1,
          data: {
            text: 'Step 1',
          },
        },
        {
          step: 2,
          data: {
            text: 'Step 2',
          },
        },
        {
          step: 3,
          data: {
            text: 'Step 3',
          },
        },
      ];

      expect(fsWriteFileSyncSpy.calledOnceWithExactly('./db/Namespace/Room-db_steps.json', JSON.stringify(concatSteps))).to.be.true;

      fsWriteFileSyncSpy.restore();
      fsReadFileSyncStub.restore();
    });
  });

  describe('# storeSteps', () => {
    it('should store lock', () => {
      const fsWriteFileSyncSpy = sinon.spy(fs, 'writeFileSync');

      database.storeLocked(true);
      database.storeLocked(false);

      expect(fsWriteFileSyncSpy.firstCall.calledWith('./db/Namespace/Room-db_locked.json', true.toString())).to.be.true;
      expect(fsWriteFileSyncSpy.secondCall.calledWith('./db/Namespace/Room-db_locked.json', false.toString())).to.be.true;

      fsWriteFileSyncSpy.restore();
    });
  });

  describe('# deleteFiles', () => {
    it('should delete all the room related files', () => {
      const fsUnlinkSyncSpy = sinon.spy(fs, 'unlinkSync');

      database.storeDoc({});
      database.storeSteps([]);
      database.storeLocked(true);

      expect(database.deleteFiles()).to.be.true;

      expect(fsUnlinkSyncSpy.calledThrice).to.be.true;
      expect(fsUnlinkSyncSpy.calledWithExactly('./db/Namespace/Room-db.json')).to.be.true;
      expect(fsUnlinkSyncSpy.calledWithExactly('./db/Namespace/Room-db_steps.json')).to.be.true;
      expect(fsUnlinkSyncSpy.calledWithExactly('./db/Namespace/Room-db_locked.json')).to.be.true;

      fsUnlinkSyncSpy.restore();
    });

    it('should return false if Doc file does not exist', () => {
      database.storeSteps([]);
      database.storeLocked(true);

      expect(database.deleteFiles()).to.be.false;
    });

    it('should return false if Steps file does not exist', () => {
      database.storeDoc({});
      database.storeLocked(true);

      expect(database.deleteFiles()).to.be.false;
    });

    it('should return false if Lock file does not exist', () => {
      database.storeDoc({});
      database.storeSteps([]);

      expect(database.deleteFiles()).to.be.false;
    });
  });

  describe('# getDoc', () => {
    it('should retrieve document data from file', () => {
      fs.writeFileSync('./db/Namespace/Room-db.json', JSON.stringify(
        {
          version: 0,
          doc: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'This is a test',
                  },
                ],
              },
            ],
          },
        },
        null,
        2,
      ));

      const doc = database.getDoc();

      expect(doc).to.be.eql({
        version: 0,
        doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'This is a test',
                },
              ],
            },
          ],
        },
      });
    });

    it('should return default data if file does not exist', () => {
      const doc = database.getDoc();

      expect(doc).to.be.eql({
        version: 0,
        doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
            },
          ],
        },
      });
    });
  });

  describe('# getSteps', () => {
    it('should retrieve steps from given version from file', () => {
      fs.writeFileSync('./db/Namespace/Room-db_steps.json', JSON.stringify([
        {
          step: 1,
          data: {
            text: 'Step 1',
          },
        },
        {
          step: 2,
          data: {
            text: 'Step 2',
          },
        },
        {
          step: 3,
          data: {
            text: 'Step 3',
          },
        },
      ]));

      const steps = database.getSteps();

      expect(steps).to.be.eql([
        {
          step: 1,
          data: {
            text: 'Step 1',
          },
        },
        {
          step: 2,
          data: {
            text: 'Step 2',
          },
        },
        {
          step: 3,
          data: {
            text: 'Step 3',
          },
        },
      ]);
    });

    it('should return empty array if file does not exist', () => {
      const steps = database.getSteps();
      expect(steps).to.be.eql([]);
    });
  });

  describe('# getLocked', () => {
    it('should retrieve lock status from file', () => {
      fs.writeFileSync('./db/Namespace/Room-db_locked.json', true.toString());

      const locked = database.getLocked();

      expect(locked).to.be.true;
    });

    it('should return false if file does not exist', () => {
      const locked = database.getLocked();

      expect(locked).to.be.false;
    });
  });
});
