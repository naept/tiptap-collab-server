import { Step } from 'prosemirror-transform';
import schema from './schema';
import Database from './database';

export default class Document {
  constructor(namespaceDir, roomName, maxStoredSteps = 1000) {
    this.id = `${namespaceDir}/${roomName}`;
    this.selections = {};
    this.clients = {};
    this.database = new Database(namespaceDir, roomName, maxStoredSteps);

    this.onVersionMismatchCallback = () => {};
    this.onNewVersionCallback = () => {};
  }

  getDoc() {
    return this.database.getDoc();
  }

  getStepsAfterVersion(version) {
    return this.database.getSteps().filter((step) => step.version > version);
  }

  update({ version, clientID, steps }) {
    // we need to check if there is another update processed
    // so we store a "locked" state
    const locked = this.database.getLocked();

    // If locked, we will do nothing and wait for another client update
    if (!locked) {
      this.database.storeLocked(true);

      const storedData = this.database.getDoc();

      if (storedData.version !== version) {
        this.onVersionMismatchCallback({
          version,
          steps: this.getStepsAfterVersion(version),
        });
      } else {
        // calculating a new version number is easy
        const newVersion = version + steps.length;

        this.applyStepsToDocument({ version: newVersion, steps });

        this.storeSteps({ version, steps, clientID });

        this.onNewVersionCallback({
          version: newVersion,
          steps: this.getStepsAfterVersion(version),
        });
      }

      this.database.storeLocked(false);
    }
  }

  applyStepsToDocument({ version, steps }) {
    const storedData = this.database.getDoc();
    let doc = schema.nodeFromJSON(storedData.doc);
    // Apply steps to document
    steps.forEach((step) => {
      const result = Step.fromJSON(schema, step).apply(doc);
      doc = result.doc;
    });

    // Store updated document
    this.database.storeDoc({ version, doc });
  }

  storeSteps({ version, steps, clientID }) {
    // Format new steps for storage
    const newSteps = steps
      .map((step, index) => ({
        step: JSON.parse(JSON.stringify(step)),
        version: version + index + 1,
        clientID,
      }));

    // Store new steps
    this.database.storeSteps(newSteps);
  }

  onVersionMismatch(callback) {
    this.onVersionMismatchCallback = callback;
    return this;
  }

  onNewVersion(callback) {
    this.onNewVersionCallback = callback;
    return this;
  }

  updateSelection({ clientID, selection }, socketID) {
    if (!this.selections[socketID]
      || JSON.stringify(this.selections[socketID].selection) !== JSON.stringify(selection)) {
      this.selections = {
        ...this.selections,
        [socketID]: {
          clientID,
          selection,
        },
      };
      return true;
    }
    return false;
  }

  removeSelection(socketID) {
    delete this.selections[socketID];
  }

  getSelections() {
    return Object.values(this.selections);
  }

  addClient(clientID, socketID) {
    this.clients = {
      ...this.clients,
      [socketID]: clientID,
    };
  }

  removeClient(socketID) {
    delete this.clients[socketID];
  }

  getClients() {
    return Object.values(this.clients);
  }
}
