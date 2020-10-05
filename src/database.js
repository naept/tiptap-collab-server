import fs from 'fs';
import LockError from './errors/lockError';

const dbPath = './db';

export default class Database {
  constructor(namespaceDir, roomName, lockDelay = 50, lockRetries = 10) {
    this.namespaceDir = namespaceDir;
    this.roomName = roomName;
    this.lockDelay = lockDelay;
    this.lockRetries = lockRetries;

    // Create directory if it does not exist
    if (!fs.existsSync(dbPath + this.namespaceDir)) {
      fs.mkdirSync(dbPath + this.namespaceDir, { recursive: true });
    }
  }

  makePath(trailer) {
    return `${dbPath + this.namespaceDir}/${this.roomName}${trailer}`;
  }

  lock(delay = this.lockDelay, retries = this.lockRetries) {
    const lockLoop = (r) => new Promise((resolve, reject) => {
      fs.promises.writeFile(this.makePath('_lock.json'), '', { flag: 'wx+' })
        .then(resolve)
        // eslint-disable-next-line consistent-return
        .catch(() => {
          if (r === 1) return reject(new LockError());
          setTimeout(() => {
            resolve(lockLoop(r - 1));
          }, delay);
        });
    });
    return lockLoop(retries);
  }

  unlock() {
    return fs.promises.unlink(this.makePath('_lock.json')).catch(() => {});
  }

  get(docName, defaultValue = null) {
    return fs.promises.readFile(this.makePath(`-${docName}.json`), 'utf8')
      .then((data) => JSON.parse(data))
      .catch(() => defaultValue);
  }

  store(docName, value) {
    return fs.promises.writeFile(this.makePath(`-${docName}.json`), JSON.stringify(value), 'utf8');
  }

  deleteMany(docNames) {
    return Promise.all(docNames.map((docName) => fs.promises.unlink(this.makePath(`-${docName}.json`)).catch(() => {})));
  }
}
