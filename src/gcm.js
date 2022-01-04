/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
// https://gist.github.com/AndiDittrich/4629e7db04819244e843

const _crypto = require("crypto");

module.exports = {

    /**
     * Encrypts text by given key
     * @param String text to encrypt
     * @param Buffer passkey
     * @returns String encrypted text, base64 encoded
     */
    encrypt: function (text, passkey) {

        // random initialization vector
        const iv = _crypto.randomBytes(16);

        // random salt
        const salt = _crypto.randomBytes(64);

        // derive encryption key: 32 byte key length
        // in assumption the passkey is a cryptographic and NOT a password there is no need for
        // a large number of iterations. It may can replaced by HKDF
        // the value of 2145 is randomly chosen!
        const key = _crypto.pbkdf2Sync(passkey, salt, 2145, 32, "sha512");

        // AES 256 GCM Mode
        const cipher = _crypto.createCipheriv("aes-256-gcm", key, iv);

        // encrypt the given text
        const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);

        // extract the auth tag
        const tag = cipher.getAuthTag();

        // generate output
        return Buffer.concat([salt, iv, tag, encrypted]).toString("base64");
    },

    /**
     * Decrypts text by given key
     * @param String base64 encoded input data
     * @param Buffer passkey
     * @returns String decrypted (original) text
     */
    decrypt: function (encdata, passkey) {

        // base64 decoding
        const bData = Buffer.from(encdata, "base64");

        // convert data to buffers
        const salt = bData.slice(0, 64);
        const iv = bData.slice(64, 80);
        const tag = bData.slice(80, 96);
        const text = bData.slice(96);

        // derive key using; 32 byte key length
        const key = _crypto.pbkdf2Sync(passkey, salt, 2145, 32, "sha512");

        // AES 256 GCM Mode
        const decipher = _crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(tag);

        // encrypt the given text
        const decrypted = decipher.update(text, "binary", "utf8") + decipher.final("utf8");

        return decrypted;
    }
};