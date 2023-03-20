const { promisify } = require('util');
const crypto = require('crypto');

const len = 512;
const iterations = 4096;
const digest = 'sha512';
  
async function computeHash(password, salt) {
  if (!salt) {
    salt = await promisify(crypto.randomBytes)(len);
    salt = salt.toString('base64');
  }

  const derivedKey = await promisify(crypto.pbkdf2)(password, salt, iterations, len, digest);
  const hashedPassword = derivedKey.toString('base64');

  return { salt, hashedPassword };
}

async function verifyPassword(password, salt, hashedPassword) {
  const derivedKey = await promisify(crypto.pbkdf2)(password, salt, iterations, len, digest);
  return crypto.timingSafeEqual(derivedKey, Buffer.from(hashedPassword, 'base64'));
}

module.exports = {
  computeHash,
  verifyPassword,
};
