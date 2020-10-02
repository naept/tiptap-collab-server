class LockError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LockError';
  }
}

export default LockError;
