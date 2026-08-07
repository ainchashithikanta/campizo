// Stub for argon2 (native addon). The API runtime never hashes passwords
// (all repositories are in-memory), so a stub keeps the lambda fully self-contained.
module.exports = {
  argon2id: 'argon2id',
  argon2i: 'argon2i',
  argon2d: 'argon2d',
  hash: async () => {
    throw new Error('argon2 stub: password hashing is not available in the serverless runtime');
  },
  verify: async () => {
    throw new Error('argon2 stub: password verification is not available in the serverless runtime');
  },
  needsRehash: () => false
};
