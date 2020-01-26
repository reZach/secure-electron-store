"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.savePasskeyResponse = exports.savePasskeyRequest = exports.deleteConfigResponse = exports.deleteConfigRequest = exports.writeConfigResponse = exports.readConfigResponse = exports.writeConfigRequest = exports.readConfigRequest = void 0;

var _msgpack = require("@msgpack/msgpack");

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var crypto = require("crypto");

var path = require("path");

var defaultOptions = {
  debug: false,
  minify: true,
  encrypt: true,
  passkey: "",
  path: "",
  filename: "data",
  extension: ".json",
  reset: false
};
var readConfigRequest = "ReadConfig-Request";
exports.readConfigRequest = readConfigRequest;
var writeConfigRequest = "WriteConfig-Request";
exports.writeConfigRequest = writeConfigRequest;
var readConfigResponse = "ReadConfig-Response";
exports.readConfigResponse = readConfigResponse;
var writeConfigResponse = "WriteConfig-Response";
exports.writeConfigResponse = writeConfigResponse;
var deleteConfigRequest = "DeleteConfig-Request";
exports.deleteConfigRequest = deleteConfigRequest;
var deleteConfigResponse = "DeleteConfig-Response";
exports.deleteConfigResponse = deleteConfigResponse;
var savePasskeyRequest = "SavePasskey-Request";
exports.savePasskeyRequest = savePasskeyRequest;
var savePasskeyResponse = "SavePasskey-Response";
exports.savePasskeyResponse = savePasskeyResponse;

var generateIv = function generateIv() {
  return crypto.randomBytes(32).toString("hex").slice(0, 16);
};

var Store = function () {
  function Store(options) {
    _classCallCheck(this, Store);

    this.options = defaultOptions;
    this.fileData = undefined;
    this.initialFileData = undefined;
    this.initialFileDataParsed = false;
    this.iv = undefined;
    this.ivFile;
    var logPrepend = "[secure-electron-store:";
    this.mainLog = "".concat(logPrepend, "main]=>");
    this.rendererLog = "".concat(logPrepend, "renderer]=>");

    if (typeof options !== "undefined") {
      this.options = Object.assign(this.options, options);
    }

    if (typeof options === "undefined" || options.path !== defaultOptions.path) {
      try {
        var arg = process.argv.filter(function (p) {
          return p.indexOf("storePath:") >= 0;
        })[0];
        this.options.path = arg.substr(arg.indexOf(":") + 1);
        if (this.options.debug) console.log("".concat(this.rendererLog, " initializing. Parsed 'storePath' value: '").concat(this.options.path, "'."));
      } catch (error) {
        throw "Could not find property 'additionalArguments' value beginning with 'storePath:' in your BrowserWindow. Please ensure this is set! Error: ".concat(error);
      }
    }

    this.ivFile = path.join(this.options.path, "iv.txt");
    this.options.path = path.join(this.options.path, "".concat(this.options.filename).concat(this.options.extension));
    this.validSendChannels = [readConfigRequest, writeConfigRequest, savePasskeyRequest, deleteConfigRequest];
    this.validReceiveChannels = [readConfigResponse, writeConfigResponse, savePasskeyResponse, deleteConfigResponse];

    if (this.options.debug) {
      if ((typeof process === "undefined" ? "undefined" : _typeof(process)) === "object" && process.argv.filter(function (p) {
        return p.indexOf("electron") >= 0;
      }).length === 0) {
        console.log("".concat(this.rendererLog, " initialized store. Data file: '").concat(this.options.path, "'."));
      } else {
        console.log("".concat(this.mainLog, " initialized store. Data file: '").concat(this.options.path, "'."));
      }
    }
  }

  _createClass(Store, [{
    key: "getIv",
    value: function getIv(fs) {
      if (typeof this.iv !== "undefined") {
        return true;
      }

      var rawIv;

      try {
        rawIv = fs.readFileSync(this.ivFile);
      } catch (error) {
        if (error.code === "ENOENT") {
          var randomBytes = generateIv();
          rawIv = randomBytes;
          fs.writeFileSync(this.ivFile, randomBytes);
        }
      }

      this.iv = rawIv;
    }
  }, {
    key: "preloadBindings",
    value: function preloadBindings(ipcRenderer, fs) {
      var _this = this;

      var _this$options = this.options,
          minify = _this$options.minify,
          debug = _this$options.debug,
          encrypt = _this$options.encrypt,
          path = _this$options.path;

      try {
        this.initialFileData = fs.readFileSync(path);
      } catch (error) {
        if (error.code === "ENOENT") {
          var defaultData = {};

          if (minify) {
            defaultData = (0, _msgpack.encode)(defaultData);
          } else {
            defaultData = JSON.stringify(defaultData);
          }

          if (encrypt) {
            this.getIv(fs);
            var cipher = crypto.createCipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest("base64").substr(0, 32), this.iv);
            defaultData = Buffer.concat([cipher.update(defaultData), cipher["final"]()]);
          }

          this.initialFileData = {};
          this.initialFileDataParsed = true;
          fs.writeFileSync(path, defaultData);
        } else {
          throw "".concat(this.rendererLog, " encountered error '").concat(error, "' when trying to read file '").concat(path, "'. This file is probably corrupted. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.");
        }
      }

      return {
        path: path,
        setPasskey: function setPasskey(passkey) {
          _this.options.passkey = passkey;
          ipcRenderer.send(savePasskeyRequest, {
            passkey: passkey
          });
        },
        initial: function initial() {
          if (_this.initialFileDataParsed) {
            return _this.initialFileData;
          }

          debug ? console.log("".concat(_this.rendererLog, " reading data from file '").concat(path, "' into the 'initial' property.")) : null;

          try {
            if (encrypt) {
              _this.getIv(fs);

              var decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha512").update(_this.options.passkey).digest("base64").substr(0, 32), _this.iv);
              _this.initialFileData = Buffer.concat([decipher.update(_this.initialFileData), decipher["final"]()]);
            }

            if (minify) {
              _this.initialFileData = (0, _msgpack.decode)(_this.initialFileData);
            } else {
              _this.initialFileData = JSON.parse(_this.initialFileData);
            }
          } catch (error) {
            throw "".concat(_this.rendererLog, " encountered error '").concat(error, "' when trying to read file '").concat(path, "'. This file is probably corrupted or has been tampered with. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.");
          }

          _this.initialFileDataParsed = true;
          return _this.initialFileData;
        },
        send: function send(channel, key, value) {
          if (_this.validSendChannels.includes(channel)) {
            switch (channel) {
              case readConfigRequest:
                debug ? console.log("".concat(_this.rendererLog, " requesting to read key '").concat(key, "' from file.")) : null;
                ipcRenderer.send(channel, {
                  key: key
                });
                break;

              case writeConfigRequest:
                debug ? console.log("".concat(_this.rendererLog, " requesting to write key:value to file => \"'").concat(key, "':'").concat(value, "'\".")) : null;
                ipcRenderer.send(channel, {
                  key: key,
                  value: value
                });
                break;

              case savePasskeyRequest:
                debug ? console.log("".concat(_this.rendererLog, " requesting to save passkey '").concat(key, "' to file.")) : null;
                ipcRenderer.send(channel, {
                  key: key
                });
                break;

              default:
                break;
            }
          }
        },
        onReceive: function onReceive(channel, func) {
          if (_this.validReceiveChannels.includes(channel)) {
            ipcRenderer.on(channel, function (event, args) {
              if (debug) {
                switch (channel) {
                  case readConfigResponse:
                    console.log("".concat(_this.rendererLog, " received value for key '").concat(args.key, "' => '").concat(args.value, "'."));
                    break;

                  case writeConfigResponse:
                    console.log("".concat(_this.rendererLog, " ").concat(!args.success ? "un-" : "", "successfully wrote key '").concat(args.key, "' to file."));
                    break;

                  case savePasskeyResponse:
                    console.log("".concat(_this.rendererLog, " ").concat(!args.success ? "un-" : "", "successfully saved passkey."));
                    break;

                  default:
                    break;
                }
              }

              func(args);
            });
          }
        }
      };
    }
  }, {
    key: "mainBindings",
    value: function mainBindings(ipcMain, browserWindow, fs) {
      var _this2 = this;

      var _this$options2 = this.options,
          minify = _this$options2.minify,
          debug = _this$options2.debug,
          encrypt = _this$options2.encrypt,
          path = _this$options2.path,
          reset = _this$options2.reset;

      var resetFiles = function () {
        fs.writeFileSync(path, "");
        fs.writeFileSync(this.ivFile, "");
        fs.unlinkSync(path);
        fs.unlinkSync(this.ivFile);
        this.fileData = undefined;
      }.bind(this);

      if (reset) {
        debug ? console.log("".concat(this.mainLog, " resetting all files because property \"reset\" was set to true when configuring the store.")) : null;

        try {
          resetFiles();
        } catch (error) {
          throw "".concat(this.mainLog, " could not reset files, please resolve error '").concat(error, "' and try again.");
        }
      }

      ipcMain.on(deleteConfigRequest, function (IpcMainEvent, args) {
        debug ? console.log("".concat(_this2.mainLog, " received a request to delete data files.")) : null;
        var success = true;

        try {
          resetFiles();
        } catch (error) {
          console.error("".concat(_this2.mainLog, " failed to reset data due to error: '").concat(error, "'. Please resolve this error and try again."));
          success = false;
        }

        browserWindow.webContents.send(deleteConfigResponse, {
          success: success
        });
      });
      ipcMain.on(savePasskeyRequest, function (IpcMainEvent, args) {
        debug ? console.log("".concat(_this2.mainLog, " received a request to update the passkey to '").concat(args.passkey, "'.")) : null;
        _this2.options.passkey = args.passkey;
        browserWindow.webContents.send(savePasskeyResponse, {
          success: true
        });
      });
      ipcMain.on(readConfigRequest, function (IpcMainEvent, args) {
        debug ? console.log("".concat(_this2.mainLog, " received a request to read from the key '").concat(args.key, "' from the given file '").concat(path, "'.")) : null;
        fs.readFile(path, function (error, data) {
          if (error) {
            if (error.code === "ENOENT") {
              debug ? console.log("".concat(_this2.mainLog, " did not find data file when trying read the key '").concat(args.key, "'. Creating an empty data file.")) : null;
              var defaultData = {};

              if (minify) {
                defaultData = (0, _msgpack.decode)(defaultData);
              } else {
                defaultData = JSON.parse(defaultData);
              }

              if (encrypt) {
                _this2.getIv(fs);

                var cipher = crypto.createCipheriv("aes-256-cbc", crypto.createHash("sha512").update(_this2.options.passkey).digest("base64").substr(0, 32), _this2.iv);
                defaultData = Buffer.concat([cipher.update(defaultData), cipher["final"]()]);
              }

              fs.writeFileSync(path, defaultData);
              browserWindow.webContents.send(readConfigResponse, {
                success: false,
                key: args.key,
                value: undefined
              });
              return;
            } else {
              throw "".concat(_this2.mainLog, " encountered error '").concat(error, "' when trying to read file '").concat(path, "'. This file is probably corrupted. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.");
            }
          }

          var dataToRead = data;

          try {
            if (encrypt) {
              _this2.getIv(fs);

              var decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha512").update(_this2.options.passkey).digest("base64").substr(0, 32), _this2.iv);
              dataToRead = Buffer.concat([decipher.update(dataToRead), decipher["final"]()]);
            }

            if (minify) {
              dataToRead = (0, _msgpack.decode)(dataToRead);
            } else {
              dataToRead = JSON.parse(dataToRead);
            }
          } catch (error) {
            throw "".concat(_this2.mainLog, " encountered error '").concat(error, "' when trying to read file '").concat(path, "'. This file is probably corrupted or has been tampered with. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.");
          }

          _this2.fileData = dataToRead;
          debug ? console.log("".concat(_this2.mainLog, " read the key '").concat(args.key, "' from file => '").concat(dataToRead[args.key], "'.")) : null;
          browserWindow.webContents.send(readConfigResponse, {
            success: true,
            key: args.key,
            value: dataToRead[args.key]
          });
        });
      });
      ipcMain.on(writeConfigRequest, function (IpcMainEvent, args) {
        var writeToFile = function () {
          var _this3 = this;

          if (typeof args.key !== "undefined" && typeof args.value !== "undefined") {
            this.fileData[args.key] = args.value;
          }

          var dataToWrite = this.fileData;

          try {
            if (minify) {
              dataToWrite = (0, _msgpack.encode)(dataToWrite);
            } else {
              dataToWrite = JSON.stringify(dataToWrite);
            }

            if (encrypt) {
              this.getIv();
              var cipher = crypto.createCipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest("base64").substr(0, 32), this.iv);
              dataToWrite = Buffer.concat([cipher.update(dataToWrite), cipher["final"]()]);
            }
          } catch (error) {
            throw "".concat(this.mainLog, " encountered error '").concat(error, "' when trying to write file '").concat(path, "'.");
          }

          fs.writeFile(path, dataToWrite, function (error) {
            debug ? console.log("".concat(_this3.mainLog, " wrote \"'").concat(args.key, "':'").concat(args.value, "'\" to file '").concat(path, "'.")) : null;
            browserWindow.webContents.send(writeConfigResponse, {
              success: !error,
              key: args.key
            });
          });
        }.bind(_this2);

        if (typeof _this2.fileData === "undefined") {
          fs.readFile(path, function (error, data) {
            if (error) {
              if (error.code === "ENOENT") {
                _this2.fileData = {};
                writeToFile();
                return;
              } else {
                throw "".concat(_this2.mainLog, " encountered error '").concat(error, "' when trying to read file '").concat(path, "'. This file is probably corrupted. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.");
              }
            }

            var dataInFile = data;

            try {
              if (typeof data !== "undefined") {
                if (encrypt) {
                  _this2.getIv(fs);

                  var decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha512").update(_this2.options.passkey).digest("base64").substr(0, 32), _this2.iv);
                  dataInFile = Buffer.concat([decipher.update(dataInFile), decipher["final"]()]);
                }

                if (minify) {
                  dataInFile = (0, _msgpack.decode)(dataInFile);
                } else {
                  dataInFile = JSON.parse(dataInFile);
                }
              }
            } catch (error) {
              throw "".concat(_this2.mainLog, " encountered error '").concat(error, "' when trying to read file '").concat(path, "'. This file is probably corrupted. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.");
            }

            _this2.fileData = dataInFile;
            writeToFile();
          });
        } else {
          writeToFile();
        }
      });
    }
  }]);

  return Store;
}();

exports["default"] = Store;