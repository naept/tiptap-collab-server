import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import Database from '../src/database';

describe('Database', () => {
  let database;
  let fsExistsSyncStub;
  let fsMkdirSyncSpy;

  afterEach(() => {
    fsMkdirSyncSpy.restore();
    fs.rmdirSync('db', { recursive: true });
  });

  describe('# When creating database', () => {
    beforeEach(() => {
      fsMkdirSyncSpy = sinon.spy(fs, 'mkdirSync');
      fsExistsSyncStub = sinon.stub(fs, 'existsSync');
      fsExistsSyncStub.onFirstCall().returns(false).returns(true);

      database = new Database('/Namespace', 'Room');
    });

    afterEach(() => {
      fsMkdirSyncSpy.restore();
      fsExistsSyncStub.restore();
    });

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
      database = new Database('/Namespace', 'Room');
      const fsWriteFileSyncSpy = sinon.spy(fs, 'writeFileSync');

      const someData = {
        test1: 'test 1',
        test2: 'test 2',
      };
      database.storeDoc(someData);

      expect(fsWriteFileSyncSpy.calledOnceWith('./db/Namespace/Room-db.json', JSON.stringify(someData, null, 2))).to.be.true;

      fsWriteFileSyncSpy.restore();
    });
  });

  describe('# storeSteps', () => {
    it('should store steps in file');
    it('should work if file does not exist');
    it('should slice old data if number of stored steps exceeds maxStoredSteps');
    it('should increment version at each step');
  });

  describe('# storeSteps', () => {
    it('should store lock');
  });

  describe('# getDoc', () => {
    it('should retrieve document data from file');
    it('should return default data if file does not exist');
  });

  describe('# getLocked', () => {
    it('should retrieve lock status from file');
    it('should return false if file does not exist');
  });

  describe('# getSteps', () => {
    it('should retrieve steps from given version from file');
    it('should return empty array if file does not exist');
  });
});
