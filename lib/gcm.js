"use strict";

var _crypto = require("crypto");

module.exports = {
  encrypt: function encrypt(text, passkey) {
    var iv = _crypto.randomBytes(16);

    var salt = _crypto.randomBytes(64);

    var key = _crypto.pbkdf2Sync(passkey, salt, 2145, 32, "sha512");

    var cipher = _crypto.createCipheriv("aes-256-gcm", key, iv);

    var encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher["final"]()]);
    var tag = cipher.getAuthTag();
    return Buffer.concat([salt, iv, tag, encrypted]).toString("base64");
  },
  decrypt: function decrypt(encdata, passkey) {
    var bData = Buffer.from(encdata, "base64");
    var salt = bData.slice(0, 64);
    var iv = bData.slice(64, 80);
    var tag = bData.slice(80, 96);
    var text = bData.slice(96);

    var key = _crypto.pbkdf2Sync(passkey, salt, 2145, 32, "sha512");

    var decipher = _crypto.createDecipheriv("aes-256-gcm", key, iv);

    decipher.setAuthTag(tag);
    var decrypted = decipher.update(text, "binary", "utf8") + decipher["final"]("utf8");
    return decrypted;
  }
};