const crypto = require('crypto');

const algorithm = 'aes-256-ctr';
const secretKey = process.env.CRYPTO_SECRET;

const getKey = () => {
    return crypto
        .createHash('sha256')
        .update(String(secretKey))
        .digest('base64')
        .substr(0, 32);
};

const encrypt = (text) => {
    const key = getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex'),
    };
};

const decrypt = (hash) => {
    const key = getKey();
    const iv = Buffer.from(hash.iv, 'hex');
    const encryptedContent = Buffer.from(hash.content, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    const decrypted = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);

    return decrypted.toString('utf8');
};

module.exports = {
    encrypt,
    decrypt,
};