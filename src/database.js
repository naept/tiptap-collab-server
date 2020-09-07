import fs from 'fs';

const dbPath = './db';
const docTrailer = '-db.json';
const lockedTrailer = '-db_locked.json';
const stepsTrailer = '-db_steps.json';
const maxStoredSteps = 1000;
const defaultData = {
  version: 0,
  doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Empty document' }] }] },
};

class Database {
  constructor(namespaceDir, roomName) {
    this.namespaceDir = namespaceDir;
    this.roomName = roomName;

    // Create directory if it does not exist
    if (!fs.existsSync(dbPath + this.namespaceDir)) {
      fs.mkdirSync(dbPath + this.namespaceDir, { recursive: true });
    }
  }

  makePath(trailer) {
    return `${dbPath + this.namespaceDir}/${this.roomName}${trailer}`;
  }

  storeDoc(data) {
    fs.writeFileSync(this.makePath(docTrailer), JSON.stringify(data, null, 2));
  }

  storeSteps({ steps, version }) {
    let limitedOldData = [];
    try {
      const oldData = JSON.parse(fs.readFileSync(this.makePath(stepsTrailer), 'utf8'));
      limitedOldData = oldData.slice(Math.max(oldData.length - maxStoredSteps));
    } catch (e) {
      limitedOldData = [];
    }

    const newData = [
      ...limitedOldData,
      ...steps.map((step, index) => ({
        step: JSON.parse(JSON.stringify(step)),
        version: version + index + 1,
        clientID: step.clientID,
      })),
    ];

    fs.writeFileSync(this.makePath(stepsTrailer), JSON.stringify(newData));
  }

  storeLocked(locked) {
    fs.writeFileSync(this.makePath(lockedTrailer), locked.toString());
  }

  getDoc() {
    try {
      return JSON.parse(fs.readFileSync(this.makePath(docTrailer), 'utf8'));
    } catch (e) {
      return defaultData;
    }
  }

  getLocked() {
    try {
      return JSON.parse(fs.readFileSync(this.makePath(lockedTrailer), 'utf8'));
    } catch (e) {
      return false;
    }
  }

  getSteps(version) {
    try {
      const steps = JSON.parse(fs.readFileSync(this.makePath(stepsTrailer), 'utf8'));
      return steps.filter((step) => step.version > version);
    } catch (e) {
      return [];
    }
  }
}

export default Database;
