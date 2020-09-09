import { expect } from 'chai';
import sinon from 'sinon';
import Document from '../src/document';
import Database from '../src/database';

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

describe('Document', () => {
  let document;

  it('can be created with maxStoredSteps argument', () => {
    document = new Document('/Namespace', 'Room', 50);
    expect(document.database.maxStoredSteps).to.be.equal(50);
  });

  beforeEach(() => {
    document = new Document('/Namespace', 'Room');
  });

  describe('# When created', () => {
    it('should create database', () => {
      expect(document).to.have.property('database');
      expect(document.database).to.be.instanceOf(Database);
      expect(document.database.maxStoredSteps).to.be.equal(1000);
    });

    it('should have onVersionMismatchCallback empty function', () => {
      expect(document).to.have.property('onVersionMismatchCallback');
      expect(document.onVersionMismatchCallback()).to.equal(undefined);
    });

    it('should have onNewVersionCallback empty function', () => {
      expect(document).to.have.property('onNewVersionCallback');
      expect(document.onNewVersionCallback()).to.equal(undefined);
    });
  });

  describe('# getDoc', () => {
    it('should return database.getDoc() result', () => {
      const databaseGetDocStub = sinon.stub(document.database, 'getDoc');
      databaseGetDocStub.returns({ test: 'Document' });

      const doc = document.getDoc();

      expect(doc).to.be.eql({ test: 'Document' });

      databaseGetDocStub.restore();
    });
  });

  describe('# getStepsAfterVersion', () => {
    it('should return only steps with version superior to argument', () => {
      const databaseGetStepsStub = sinon.stub(document.database, 'getSteps');
      databaseGetStepsStub.returns([
        {
          version: 1,
          data: 'step 1',
        },
        {
          version: 2,
          data: 'step 2',
        },
        {
          version: 3,
          data: 'step 3',
        },
        {
          version: 4,
          data: 'step 4',
        },
        {
          version: 5,
          data: 'step 5',
        },
      ]);

      const stepsAfterVersion2 = document.getStepsAfterVersion(2);

      expect(stepsAfterVersion2).to.be.eql([{
        version: 3,
        data: 'step 3',
      },
      {
        version: 4,
        data: 'step 4',
      },
      {
        version: 5,
        data: 'step 5',
      },
      ]);

      databaseGetStepsStub.restore();
    });
  });

  describe('# update', () => {
    let databaseGetLockedStub;
    let databaseGetDocStub;
    let databaseStoreLockedSpy;
    let databaseStoreStepsSpy;
    let databaseStoreDocSpy;

    beforeEach(() => {
      databaseGetLockedStub = sinon.stub(document.database, 'getLocked');
      databaseGetDocStub = sinon.stub(document.database, 'getDoc');
      databaseStoreLockedSpy = sinon.spy(document.database, 'storeLocked');
      databaseStoreStepsSpy = sinon.spy(document.database, 'storeSteps');
      databaseStoreDocSpy = sinon.spy(document.database, 'storeDoc');

      databaseGetLockedStub.returns(false);
      databaseGetDocStub.returns(storedData);
    });

    afterEach(() => {
      databaseGetLockedStub.restore();
      databaseGetDocStub.restore();
      databaseStoreLockedSpy.restore();
      databaseStoreStepsSpy.restore();
      databaseStoreDocSpy.restore();
    });

    it('should do nothing if database is locked', () => {
      databaseGetLockedStub.returns(true);

      document.update(updateData);

      expect(databaseStoreLockedSpy.notCalled).to.be.true;
      expect(databaseStoreStepsSpy.notCalled).to.be.true;
      expect(databaseStoreDocSpy.notCalled).to.be.true;
    });

    it('should lock database', () => {
      document.update(updateData);

      expect(databaseStoreLockedSpy.firstCall.calledWith(true)).to.be.true;
      expect(databaseStoreLockedSpy.calledBefore(databaseStoreStepsSpy)).to.be.true;
      expect(databaseStoreLockedSpy.calledBefore(databaseStoreDocSpy)).to.be.true;
    });

    describe('if version is superior to stored version', () => {
      let documentOnVersionMismatchCallbackSpy;

      beforeEach(() => {
        databaseGetDocStub.returns({ version: 50 });
        documentOnVersionMismatchCallbackSpy = sinon.spy(document, 'onVersionMismatchCallback');

        document.update(updateData);
      });

      afterEach(() => {
        documentOnVersionMismatchCallbackSpy.restore();
      });

      it('should do nothing', () => {
        expect(databaseStoreStepsSpy.notCalled).to.be.true;
        expect(databaseStoreDocSpy.notCalled).to.be.true;
      });

      it('should call onVersionMismatchCallback callback', () => {
        expect(documentOnVersionMismatchCallbackSpy.calledOnce).to.be.true;
      });

      it('should unlock database', () => {
        expect(databaseStoreLockedSpy.secondCall.calledWith(false)).to.be.true;
      });
    });

    it('should apply new steps to document', () => {
      const documentApplyStepsToDocumentSpy = sinon.spy(document, 'applyStepsToDocument');

      document.update(updateData);

      expect(documentApplyStepsToDocumentSpy.calledOnceWithExactly({
        version: 21,
        steps: updateData.steps,
      })).to.be.true;

      documentApplyStepsToDocumentSpy.restore();
    });

    it('should store new steps', () => {
      const documentStoreStepsSpy = sinon.spy(document, 'storeSteps');

      document.update(updateData);

      expect(documentStoreStepsSpy.calledOnceWithExactly({
        version: 20,
        steps: updateData.steps,
        clientID: updateData.clientID,
      })).to.be.true;

      documentStoreStepsSpy.restore();
    });

    it('should call onNewVersionCallback callback', () => {
      const documentOnNewVersionSpy = sinon.spy(document, 'onNewVersionCallback');

      document.update(updateData);

      expect(documentOnNewVersionSpy.calledOnce).to.be.true;

      documentOnNewVersionSpy.restore();
    });

    it('should unlock database', () => {
      document.update(updateData);

      expect(databaseStoreLockedSpy.secondCall.calledWith(false)).to.be.true;
      expect(databaseStoreLockedSpy.calledAfter(databaseStoreStepsSpy)).to.be.true;
      expect(databaseStoreLockedSpy.calledAfter(databaseStoreDocSpy)).to.be.true;
    });
  });

  describe('# applyStepsToDocument', () => {
    it('should store updated doc and version in database', () => {
      const databaseStoreDocSpy = sinon.spy(document.database, 'storeDoc');
      const databaseGetDocStub = sinon.stub(document.database, 'getDoc');
      databaseGetDocStub.returns(storedData);

      document.applyStepsToDocument({
        version: 21,
        steps: updateData.steps,
      });

      expect(databaseStoreDocSpy.calledOnce).to.be.true;

      databaseStoreDocSpy.restore();
      databaseGetDocStub.restore();
    });
  });

  describe('# storeSteps', () => {
    it('should store formated new steps', () => {
      const databaseStoreStepsSpy = sinon.spy(document.database, 'storeSteps');

      document.storeSteps({
        version: 20,
        steps: updateData.steps,
        clientID: 820185065,
      });

      expect(databaseStoreStepsSpy.calledOnceWithExactly(
        updateData.steps.map((step, index) => ({
          step: JSON.parse(JSON.stringify(step)),
          version: 20 + index + 1,
          clientID: 820185065,
        })),
      )).to.be.true;

      databaseStoreStepsSpy.restore();
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
});
