import { Step } from 'prosemirror-transform';
import schema from './schema';
import Database from './database';
import VersionMismatchError from './errors/versionMismatchError';

const defaultData = {
  version: 0,
  doc: { type: 'doc', content: [{ type: 'paragraph' }] },
};

export default class Document {
  constructor(namespaceDir, roomName, maxStoredSteps = 1000) {
    this.namespaceDir = namespaceDir;
    this.roomName = roomName;
    this.maxStoredSteps = maxStoredSteps;
    this.database = new Database(namespaceDir, roomName);

    this.onVersionMismatchCallback = () => {};
    this.onNewVersionCallback = () => {};
    this.onSelectionsUpdatedCallback = () => {};
    this.onClientsUpdatedCallback = () => {};
  }

  initDoc(processingPromise) {
    let returnData;
    return this.database.lock()
      .then(() => this.database.get('doc', defaultData))
      .then((data) => processingPromise(data))
      .then(({ version, doc }) => {
        returnData = { version, doc };
        return this.database.store('doc', {
          version,
          doc,
        });
      })
      .then(() => returnData)
      .finally(() => this.database.unlock());
  }

  getDoc() {
    return this.database.lock()
      .then(() => this.database.get('doc', defaultData))
      .finally(() => this.database.unlock());
  }

  updateDoc({ version, clientID, steps }) {
    let currentDoc;
    let currentSteps;
    let newSteps;
    return this.database.lock()
      .then(() => this.database.get('steps', []))
      .then((data) => {
        currentSteps = data;
        return this.database.get('doc', defaultData);
      })
      .then((data) => {
        if (data.version !== version) {
          throw new VersionMismatchError();
        }
        currentDoc = data;

        let doc = schema.nodeFromJSON(currentDoc.doc);
        // Apply steps to document
        steps.forEach((step) => {
          const result = Step.fromJSON(schema, step).apply(doc);
          doc = result.doc;
        });
        return this.database.store('doc', {
          version: version + steps.length,
          doc: JSON.parse(JSON.stringify(doc)),
        });
      })
      .then(() => {
        newSteps = steps.map((step, index) => ({
          step: JSON.parse(JSON.stringify(step)),
          version: version + index + 1,
          clientID,
        }));
        return this.database.store('steps', [
          ...currentSteps.slice(Math.max(0, currentSteps.length - this.maxStoredSteps)),
          ...newSteps,
        ]);
      })
      .then(() => {
        this.onNewVersionCallback({
          version: version + steps.length,
          steps: newSteps,
        });
      })
      .catch((e) => {
        if (e.name === 'VersionMismatchError') {
          this.onVersionMismatchCallback({
            version,
            steps: currentSteps.filter((step) => step.version > version),
          });
        } else if (e.name !== 'LockError') throw e;
      })
      .finally(() => this.database.unlock());
  }

  getSelections() {
    return this.database.lock()
      .then(() => this.database.get('sel', {}))
      .then((selections) => Object.values(selections))
      .finally(() => this.database.unlock());
  }

  updateSelection({ clientID, selection }, socketID) {
    return this.database.lock()
      .then(() => this.database.get('sel', {}))
      .then((selections) => {
        if (!selections[socketID]
          || JSON.stringify(selections[socketID].selection) !== JSON.stringify(selection)) {
          const newSelections = {
            ...selections,
            [socketID]: {
              clientID,
              selection,
            },
          };
          return this.database.store('sel', newSelections)
            .then(() => {
              this.onSelectionsUpdatedCallback(Object.values(newSelections));
            });
        }
        return new Promise((r) => { r(); });
      })
      .catch((e) => {
        if (e.name !== 'LockError') throw e;
      })
      .finally(() => this.database.unlock());
  }

  removeSelection(socketID) {
    return this.database.lock()
      .then(() => this.database.get('sel', {}))
      .then((selections) => {
        if (selections[socketID]) {
          const { [socketID]: deleted, ...newSelections } = selections;

          return this.database.store('sel', newSelections)
            .then(() => {
              this.onSelectionsUpdatedCallback(Object.values(newSelections));
            });
        }
        return new Promise((r) => { r(); });
      })
      .finally(() => this.database.unlock());
  }

  getClients() {
    return this.database.lock()
      .then(() => this.database.get('clients', {}))
      .then((clients) => Object.values(clients))
      .finally(() => this.database.unlock());
  }

  addClient(clientID, socketID) {
    return this.database.lock()
      .then(() => this.database.get('clients', {}))
      .then((clients) => {
        if (!clients[socketID]) {
          const newClients = {
            ...clients,
            [socketID]: clientID,
          };

          return this.database.store('clients', newClients)
            .then(() => {
              this.onClientsUpdatedCallback(Object.values(newClients));
            });
        }
        return new Promise((r) => { r(); });
      })
      .finally(() => this.database.unlock());
  }

  removeClient(socketID) {
    return this.database.lock()
      .then(() => this.database.get('clients', {}))
      .then((clients) => {
        if (clients[socketID]) {
          const { [socketID]: deleted, ...newClients } = clients;

          return this.database.store('clients', newClients)
            .then(() => {
              this.onClientsUpdatedCallback(Object.values(newClients));
            });
        }
        return new Promise((r) => { r(); });
      })
      .finally(() => this.database.unlock());
  }

  cleanUpClientsAndSelections(socketIDs) {
    return this.database.lock()
      .then(() => this.database.get('clients', {}))
      .then((clients) => {
        const needsCleanUp = Object.keys(clients)
          .filter((key) => socketIDs.includes(key))
          .length !== Object.keys(clients).length;

        if (needsCleanUp) {
          const newClients = Object.keys(clients)
            .filter((key) => socketIDs.includes(key))
            .reduce((filteredClients, key) => ({
              ...filteredClients,
              [key]: clients[key],
            }), {});

          return this.database.store('clients', newClients)
            .then(() => {
              this.onClientsUpdatedCallback(Object.values(newClients));
            });
        }
        return new Promise((r) => { r(); });
      })
      .then(() => this.database.get('sel', {}))
      .then((selections) => {
        const needsCleanUp = Object.keys(selections)
          .filter((key) => socketIDs.includes(key))
          .length !== Object.keys(selections).length;

        if (needsCleanUp) {
          const newSelections = Object.keys(selections)
            .filter((key) => socketIDs.includes(key))
            .reduce((filteredClients, key) => ({
              ...filteredClients,
              [key]: selections[key],
            }), {});

          return this.database.store('sel', newSelections)
            .then(() => {
              this.onClientsUpdatedCallback(Object.values(newSelections));
            });
        }
        return new Promise((r) => { r(); });
      })
      .finally(() => this.database.unlock());
  }

  deleteDatabase() {
    return this.database.lock()
      .then(() => this.database.deleteMany(['doc', 'steps', 'sel', 'clients']))
      .finally(() => this.database.unlock());
  }

  onVersionMismatch(callback) {
    this.onVersionMismatchCallback = callback;
    return this;
  }

  onNewVersion(callback) {
    this.onNewVersionCallback = callback;
    return this;
  }

  onSelectionsUpdated(callback) {
    this.onSelectionsUpdatedCallback = callback;
    return this;
  }

  onClientsUpdated(callback) {
    this.onClientsUpdatedCallback = callback;
    return this;
  }
}
