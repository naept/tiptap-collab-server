class VersionMismatchError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VersionMismatchError';
  }
}

export default VersionMismatchError;
