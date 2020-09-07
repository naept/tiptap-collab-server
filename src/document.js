import { Step } from 'prosemirror-transform';
import schema from './schema';
import Database from './database';

export default class Document {
  constructor(namespaceDir, roomName) {
    this.database = new Database(namespaceDir, roomName);
  }

  getDoc() {
    return this.database.getDoc();
  }

  update({ version, clientID, steps }) {
    // we need to check if there is another update processed
    // so we store a "locked" state
    const locked = this.database.getLocked();

    if (locked) {
    // we will do nothing and wait for another client update
      return;
    }

    this.database.storeLocked(true);

    const storedData = this.database.getDoc();

    // version mismatch: the stored version is newer
    // so we send all steps of this version back to the user
    if (storedData.version !== version) {
      this.onVersionMismatch({
        version,
        steps: this.database.getSteps(version),
      });
      this.database.storeLocked(false);
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
    this.database.storeSteps({ version, steps: newSteps });
    this.database.storeDoc({ version: newVersion, doc });

    // send update to everyone (me and others)
    this.onNewVersionCallback({
      version: newVersion,
      steps: this.database.getSteps(version),
    });

    this.database.storeLocked(false);
  }

  onVersionMismatch(callback) {
    this.onVersionMismatchCallback = callback;
    return this;
  }

  onNewVersion(callback) {
    this.onNewVersionCallback = callback;
    return this;
  }
}
