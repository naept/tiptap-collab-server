import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import Database from '../src/database';

describe('Database', () => {
  let database;
  let fsMkdirSyncSpy;

  beforeEach(() => {
    fs.rmdirSync('db', { recursive: true });
    fsMkdirSyncSpy = sinon.spy(fs, 'mkdirSync');

    database = new Database('/Namespace', 'Room', 2);
  });

  afterEach(() => {
    fsMkdirSyncSpy.restore();
  });

  describe('# When created', () => {
    it('should have namespaceDir', () => {
      expect(database).to.have.property('namespaceDir');
    });

    it('should have roomName', () => {
      expect(database).to.have.property('roomName');
    });

    it('should create directory if it does not exist', () => {
      expect(fsMkdirSyncSpy.calledOnceWithExactly('./db/Namespace', { recursive: true })).to.be.true;
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

  describe('# lock', () => {
    it('should lock database only if it is not already locked', (done) => {
      let step = 0;

      step = 1;
      database.lock()
        .then(() => {
          expect(step).to.be.equal(1);
          step = 2;

          setTimeout(() => {
            expect(step).to.be.equal(2);
            step = 3;
            database.unlock()
              .then(() => {
                expect(step).to.be.equal(3);
                step = 4;
              });
          }, 300);

          return database.lock(100, 10);
        })
        .then(() => {
          expect(step).to.be.equal(4);
          done();
        });
    });

    it('should throw LockError if the file is already locked for two long', (done) => {
      database.lock()
        .then(() => database.lock(0, 1))
        .catch((e) => {
          expect(e.name).to.be.equal('LockError');
          done();
        });
    });
  });

  describe('# get', () => {
    it('should get default data from file if it does not exist', (done) => {
      const someData = {
        test1: 'test 1',
        test2: 'test 2',
      };

      database.get('data', someData)
        .then((data) => {
          expect(data).to.be.eql(someData);
          done();
        });
    });

    it('should get data from file if it exists', (done) => {
      const someData = {
        test1: 'test 1',
        test2: 'test 2',
      };
      fs.writeFileSync('./db/Namespace/Room-data.json', JSON.stringify(someData));

      database.get('data')
        .then((data) => {
          expect(data).to.be.eql(someData);
          done();
        });
    });
  });

  describe('# store', () => {
    it('should store data in file', (done) => {
      const someData = {
        test1: 'test 1',
        test2: 'test 2',
      };

      database.store('data', someData)
        .then(() => {
          let fileContent = fs.readFileSync('./db/Namespace/Room-data.json', 'utf8');
          fileContent = JSON.parse(fileContent);
          expect(fileContent).to.be.eql(someData);
          done();
        });
    });
  });

  describe('# deleteMany', () => {
    it('should delete the given files', (done) => {
      fs.writeFileSync('./db/Namespace/Room-data1.json', 'Data 1');
      fs.writeFileSync('./db/Namespace/Room-data2.json', 'Data 2');
      fs.writeFileSync('./db/Namespace/Room-data3.json', 'Data 3');

      const deletedFiles = [];

      database.deleteMany(['data1', 'data3'])
        .then(() => {
          try {
            fs.readFileSync('./db/Namespace/Room-data1.json');
          } catch (error) {
            deletedFiles.push('data1');
          }
          try {
            fs.readFileSync('./db/Namespace/Room-data2.json');
          } catch (error) {
            deletedFiles.push('data2');
          }
          try {
            fs.readFileSync('./db/Namespace/Room-data3.json');
          } catch (error) {
            deletedFiles.push('data3');
          }
          expect(deletedFiles).to.be.eql(['data1', 'data3']);
          done();
        });
    });
  });
});
