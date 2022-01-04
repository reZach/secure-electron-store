"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.useUnprotectedConfigInMainResponse = exports.useUnprotectedConfigInMainRequest = exports.useConfigInMainResponse = exports.useConfigInMainRequest = exports.savePasskeyResponse = exports.savePasskeyRequest = exports.deleteUnprotectedConfigResponse = exports.deleteUnprotectedConfigRequest = exports.deleteConfigResponse = exports.deleteConfigRequest = exports.writeUnprotectedConfigResponse = exports.writeUnprotectedConfigRequest = exports.writeConfigResponse = exports.writeConfigRequest = exports.readUnprotectedConfigResponse = exports.readUnprotectedConfigRequest = exports.readConfigResponse = exports.readConfigRequest = void 0;

var _msgpack = require("@msgpack/msgpack");

var _gcm = require("./gcm.js");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var crypto = require("crypto");

var pathModule = require("path");

var encoder = new _msgpack.Encoder();
var decoder = new _msgpack.Decoder();
var defaultOptions = {
  debug: false,
  minify: true,
  encrypt: true,
  passkey: "",
  path: "",
  unprotectedPath: "",
  filename: "data",
  unprotectedFilename: "unprotected",
  extension: ".json",
  reset: false,
  gcm: true
};
var readConfigRequest = "ReadConfig-Request";
exports.readConfigRequest = readConfigRequest;
var readConfigResponse = "ReadConfig-Response";
exports.readConfigResponse = readConfigResponse;
var readUnprotectedConfigRequest = "ReadUnprotectedConfig-Request";
exports.readUnprotectedConfigRequest = readUnprotectedConfigRequest;
var readUnprotectedConfigResponse = "ReadUnprotectedConfig-Response";
exports.readUnprotectedConfigResponse = readUnprotectedConfigResponse;
var writeConfigRequest = "WriteConfig-Request";
exports.writeConfigRequest = writeConfigRequest;
var writeConfigResponse = "WriteConfig-Response";
exports.writeConfigResponse = writeConfigResponse;
var writeUnprotectedConfigRequest = "WriteUnprotectedConfig-Request";
exports.writeUnprotectedConfigRequest = writeUnprotectedConfigRequest;
var writeUnprotectedConfigResponse = "WriteUnprotectedConfig-Response";
exports.writeUnprotectedConfigResponse = writeUnprotectedConfigResponse;
var deleteConfigRequest = "DeleteConfig-Request";
exports.deleteConfigRequest = deleteConfigRequest;
var deleteConfigResponse = "DeleteConfig-Response";
exports.deleteConfigResponse = deleteConfigResponse;
var deleteUnprotectedConfigRequest = "DeleteUnprotectedConfig-Request";
exports.deleteUnprotectedConfigRequest = deleteUnprotectedConfigRequest;
var deleteUnprotectedConfigResponse = "DeleteUnprotectedConfig-Response";
exports.deleteUnprotectedConfigResponse = deleteUnprotectedConfigResponse;
var savePasskeyRequest = "SavePasskey-Request";
exports.savePasskeyRequest = savePasskeyRequest;
var savePasskeyResponse = "SavePasskey-Response";
exports.savePasskeyResponse = savePasskeyResponse;
var useConfigInMainRequest = "UseConfigInMain-Request";
exports.useConfigInMainRequest = useConfigInMainRequest;
var useConfigInMainResponse = "UseConfigInMain-Response";
exports.useConfigInMainResponse = useConfigInMainResponse;
var useUnprotectedConfigInMainRequest = "UseUnprotectedConfigInMain-Request";
exports.useUnprotectedConfigInMainRequest = useUnprotectedConfigInMainRequest;
var useUnprotectedConfigInMainResponse = "UseUnprotectedConfigInMain-Response";
exports.useUnprotectedConfigInMainResponse = useUnprotectedConfigInMainResponse;

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
    this.unprotectedFileData = undefined;
    this.initialUnprotectedFileData = undefined;
    this.initialUnprotectedFileDataParsed = false;
    this.iv = undefined;
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
        throw new Error("Could not find property 'additionalArguments' value beginning with 'storePath:' in your BrowserWindow. Please ensure this is set! Error: ".concat(error));
      }
    }

    var rootPath = this.options.path;
    this.ivFile = pathModule.join(rootPath, "iv.txt");
    this.options.path = pathModule.join(rootPath, "".concat(this.options.filename).concat(this.options.extension));
    this.options.unprotectedPath = pathModule.join(this.options.unprotectedPath.length === 0 ? rootPath : this.options.unprotectedPath, "".concat(this.options.unprotectedFilename).concat(this.options.extension));
    this.validSendChannels = [readConfigRequest, readUnprotectedConfigRequest, writeConfigRequest, writeUnprotectedConfigRequest, savePasskeyRequest, deleteConfigRequest, deleteUnprotectedConfigRequest, useConfigInMainRequest, useUnprotectedConfigInMainRequest];
    this.validReceiveChannels = [readConfigResponse, readUnprotectedConfigResponse, writeConfigResponse, writeUnprotectedConfigResponse, savePasskeyResponse, deleteConfigResponse, deleteUnprotectedConfigResponse, useConfigInMainResponse, useUnprotectedConfigInMainResponse];

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
        var randomBytes = generateIv();
        rawIv = randomBytes;

        if (error.code !== "ENOENT") {
          if (debug) {
            console.warn(error);
          }
        }

        fs.writeFileSync(this.ivFile, randomBytes);
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
          path = _this$options.path,
          unprotectedPath = _this$options.unprotectedPath,
          gcm = _this$options.gcm;

      try {
        this.initialFileData = fs.readFileSync(path);
      } catch (error) {
        if (error.code === "ENOENT") {
          var defaultData = {};

          if (minify) {
            defaultData = encoder.encode(defaultData);
          } else {
            defaultData = JSON.stringify(defaultData);
          }

          if (encrypt) {
            if (!gcm) {
              this.getIv(fs);
              var cipher = crypto.createCipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest("base64").substr(0, 32), this.iv);
              defaultData = Buffer.concat([cipher.update(defaultData), cipher["final"]()]);
            } else {
              defaultData = (0, _gcm.encrypt)(defaultData, this.options.passkey);
            }
          }

          this.initialFileData = {};
          this.initialFileDataParsed = true;
          fs.writeFileSync(path, defaultData);
        } else {
          throw new Error("".concat(this.rendererLog, " encountered error '").concat(error, "' when trying to read file '").concat(path, "'. This file is probably corrupted. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
        }
      }

      try {
        this.initialUnprotectedFileData = fs.readFileSync(unprotectedPath);
      } catch (error) {
        if (error.code === "ENOENT") {
          var _defaultData = {};

          if (minify) {
            _defaultData = encoder.encode(_defaultData);
          } else {
            _defaultData = JSON.stringify(_defaultData);
          }

          this.initialUnprotectedFileData = {};
          this.initialUnprotectedFileDataParsed = true;
          fs.writeFileSync(unprotectedPath, _defaultData);
        } else {
          throw new Error("".concat(this.rendererLog, " encountered error '").concat(error, "' when trying to read file '").concat(unprotectedPath, "'. This file is probably corrupted. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
        }
      }

      return {
        path: path,
        unprotectedPath: unprotectedPath,
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

          if (debug) {
            console.log("".concat(_this.rendererLog, " reading data from file '").concat(path, "' into the 'initial' property."));
          }

          try {
            if (encrypt) {
              if (!gcm) {
                _this.getIv(fs);

                var decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha512").update(_this.options.passkey).digest("base64").substr(0, 32), _this.iv);
                _this.initialFileData = Buffer.concat([decipher.update(_this.initialFileData), decipher["final"]()]);
              } else {
                _this.initialFileData = (0, _gcm.decrypt)(_this.initialFileData, _this.options.passkey);
              }
            }

            if (minify) {
              _this.initialFileData = decoder.decode(_this.initialFileData);
            } else {
              _this.initialFileData = JSON.parse(_this.initialFileData);
            }
          } catch (error) {
            throw new Error("".concat(_this.rendererLog, " encountered error '").concat(error, "' when trying to read file '").concat(path, "'. This file is probably corrupted or has been tampered with. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
          }

          _this.initialFileDataParsed = true;
          return _this.initialFileData;
        },
        initialUnprotected: function initialUnprotected() {
          if (sandboxMode) {
            return undefined;
          }

          if (_this.initialUnprotectedFileDataParsed) {
            return _this.initialUnprotectedFileData;
          }

          if (debug) {
            console.log("".concat(_this.rendererLog, " reading data from file '").concat(unprotectedPath, "' into the 'initial' property."));
          }

          try {
            if (minify) {
              _this.initialUnprotectedFileData = decoder.decode(_this.initialUnprotectedFileData);
            } else {
              _this.initialUnprotectedFileData = JSON.parse(_this.initialUnprotectedFileData);
            }
          } catch (error) {
            throw new Error("".concat(_this.rendererLog, " encountered error '").concat(error, "' when trying to read file '").concat(unprotectedPath, "'. This file is probably corrupted or has been tampered with. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
          }

          _this.initialUnprotectedFileDataParsed = true;
          return _this.initialUnprotectedFileData;
        },
        send: function send(channel, key, value) {
          if (_this.validSendChannels.includes(channel)) {
            switch (channel) {
              case readConfigRequest:
                if (debug) {
                  console.log("".concat(_this.rendererLog, " requesting to read key '").concat(key, "' from file."));
                }

                ipcRenderer.send(channel, {
                  key: key
                });
                break;

              case writeConfigRequest:
                if (debug) {
                  console.log("".concat(_this.rendererLog, " requesting to write key:value to file => \"'").concat(key, "':'").concat(value, "'\"."));
                }

                ipcRenderer.send(channel, {
                  key: key,
                  value: value
                });
                break;

              case savePasskeyRequest:
                if (debug) {
                  console.log("".concat(_this.rendererLog, " requesting to save passkey '").concat(key, "' to file."));
                }

                ipcRenderer.send(channel, {
                  key: key
                });
                break;

              case deleteConfigRequest:
                if (debug) {
                  console.log("".concat(_this.rendererLog, " requesting to delete file."));
                }

                ipcRenderer.send(channel, {});
                break;

              case useConfigInMainRequest:
                if (debug) {
                  console.log("".concat(_this.rendererLog, " requesting to use store in electron main process."));
                }

                ipcRenderer.send(channel, {});
                break;

              case readUnprotectedConfigRequest:
                if (debug) {
                  console.log("".concat(_this.rendererLog, " requesting to read key '").concat(key, "' from unprotected file."));
                }

                ipcRenderer.send(channel, {
                  key: key
                });
                break;

              case writeUnprotectedConfigRequest:
                if (debug) {
                  console.log("".concat(_this.rendererLog, " requesting to write key:value to unprotected file => \"'").concat(key, "':'").concat(value, "'\"."));
                }

                ipcRenderer.send(channel, {
                  key: key,
                  value: value
                });
                break;

              case deleteUnprotectedConfigRequest:
                if (debug) {
                  console.log("".concat(_this.rendererLog, " requesting to delete unprotected file."));
                }

                ipcRenderer.send(channel, {});
                break;

              case useUnprotectedConfigInMainRequest:
                if (debug) {
                  console.log("".concat(_this.rendererLog, " requesting to use unprotected store in electron main process."));
                }

                ipcRenderer.send(channel, {});
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

                  case deleteConfigResponse:
                    console.log("".concat(_this.rendererLog, " ").concat(!args.success ? "un-" : "", "successfully deleted file."));
                    break;

                  case useConfigInMainResponse:
                    console.log("".concat(_this.rendererLog, " ").concat(!args.success ? "un-" : "", "successfully read store in electron main process."));
                    break;

                  case readUnprotectedConfigResponse:
                    console.log("".concat(_this.rendererLog, " received unprotected value for key '").concat(args.key, "' => '").concat(args.value, "'."));
                    break;

                  case writeUnprotectedConfigResponse:
                    console.log("".concat(_this.rendererLog, " ").concat(!args.success ? "un-" : "", "successfully wrote unprotected key '").concat(args.key, "' to file."));
                    break;

                  case deleteUnprotectedConfigResponse:
                    console.log("".concat(_this.rendererLog, " ").concat(!args.success ? "un-" : "", "successfully deleted unprotected file."));
                    break;

                  case useUnprotectedConfigInMainResponse:
                    console.log("".concat(_this.rendererLog, " ").concat(!args.success ? "un-" : "", "successfully read unprotected store in electron main process."));
                    break;

                  default:
                    break;
                }
              }

              if (channel === deleteConfigResponse && args.success) {
                _this.iv = undefined;
              }

              func(args);
            });
          }
        },
        clearRendererBindings: function clearRendererBindings() {
          if (debug) {
            console.log("".concat(_this.rendererLog, " clearing all ipcRenderer listeners."));
          }

          var _iterator = _createForOfIteratorHelper(_this.validReceiveChannels),
              _step;

          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var validChannel = _step.value;
              ipcRenderer.removeAllListeners(validChannel);
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
        }
      };
    }
  }, {
    key: "mainBindings",
    value: function mainBindings(ipcMain, browserWindow, fs) {
      var _this2 = this;

      var mainProcessCallback = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : undefined;
      var unprotectedMainProcessCallback = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : undefined;
      var _this$options2 = this.options,
          minify = _this$options2.minify,
          debug = _this$options2.debug,
          encrypt = _this$options2.encrypt,
          path = _this$options2.path,
          unprotectedPath = _this$options2.unprotectedPath,
          reset = _this$options2.reset,
          gcm = _this$options2.gcm;

      var resetFiles = function () {
        if (debug) {
          console.log("".concat(this.mainLog, " clearing data files."));
        }

        fs.writeFileSync(path, "");
        fs.writeFileSync(this.ivFile, "");

        if (debug) {
          console.log("".concat(this.mainLog, " unlinking data files."));
        }

        fs.unlinkSync(path);
        fs.unlinkSync(this.ivFile);

        if (debug) {
          console.log("".concat(this.mainLog, " clearing local variables."));
        }

        this.iv = undefined;
        this.fileData = undefined;
      }.bind(this);

      var resetUnprotectedFiles = function () {
        if (debug) {
          console.log("".concat(this.mainLog, " clearing unprotected data files."));
        }

        fs.writeFileSync(unprotectedPath, "");

        if (debug) {
          console.log("".concat(this.mainLog, " unlinking unprotected data files."));
        }

        fs.unlinkSync(unprotectedPath);

        if (debug) {
          console.log("".concat(this.mainLog, " clearing local variables."));
        }

        this.unprotectedFileData = undefined;
      }.bind(this);

      if (reset) {
        if (debug) {
          console.log("".concat(this.mainLog, " resetting all files because property \"reset\" was set to true when configuring the store."));
        }

        try {
          resetFiles();
        } catch (error) {
          throw new Error("".concat(this.mainLog, " could not reset files, please resolve error '").concat(error, "' and try again."));
        }
      }

      ipcMain.on(deleteConfigRequest, function (IpcMainEvent, args) {
        if (debug) {
          console.log("".concat(_this2.mainLog, " received a request to delete data files."));
        }

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
        if (debug) {
          console.log("".concat(_this2.mainLog, " received a request to update the passkey to '").concat(args.passkey, "'."));
        }

        _this2.options.passkey = args.passkey;
        browserWindow.webContents.send(savePasskeyResponse, {
          success: true
        });
      });
      ipcMain.on(readConfigRequest, function (IpcMainEvent, args) {
        if (debug) {
          console.log("".concat(_this2.mainLog, " received a request to read from the key '").concat(args.key, "' from the given file '").concat(path, "'."));
        }

        fs.readFile(path, function (error, data) {
          if (error) {
            if (error.code === "ENOENT") {
              if (debug) {
                console.log("".concat(_this2.mainLog, " did not find data file when trying read the key '").concat(args.key, "'. Creating an empty data file."));
              }

              var defaultData = {};

              if (minify) {
                defaultData = decoder.decode(defaultData);
              } else {
                defaultData = JSON.parse(defaultData);
              }

              if (encrypt) {
                if (!gcm) {
                  _this2.getIv(fs);

                  var cipher = crypto.createCipheriv("aes-256-cbc", crypto.createHash("sha512").update(_this2.options.passkey).digest("base64").substr(0, 32), _this2.iv);
                  defaultData = Buffer.concat([cipher.update(defaultData), cipher["final"]()]);
                } else {
                  defaultData = (0, _gcm.encrypt)(defaultData, _this2.options.passkey);
                }
              }

              fs.writeFileSync(path, defaultData);
              browserWindow.webContents.send(readConfigResponse, {
                success: false,
                key: args.key,
                value: undefined
              });
              return;
            } else {
              throw new Error("".concat(_this2.mainLog, " encountered error '").concat(error, "' when trying to read file '").concat(path, "'. This file is probably corrupted. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
            }
          }

          var dataToRead = data;

          try {
            if (encrypt) {
              if (!gcm) {
                _this2.getIv(fs);

                var decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha512").update(_this2.options.passkey).digest("base64").substr(0, 32), _this2.iv);
                dataToRead = Buffer.concat([decipher.update(dataToRead), decipher["final"]()]);
              } else {
                dataToRead = (0, _gcm.decrypt)(dataToRead, _this2.options.passkey);
              }
            }

            if (minify) {
              dataToRead = decoder.decode(dataToRead);
            } else {
              dataToRead = JSON.parse(dataToRead);
            }
          } catch (error2) {
            throw new Error("".concat(_this2.mainLog, " encountered error '").concat(error2, "' when trying to read file '").concat(path, "'. This file is probably corrupted or has been tampered with. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
          }

          _this2.fileData = dataToRead;

          if (debug) {
            console.log("".concat(_this2.mainLog, " read the key '").concat(args.key, "' from file => '").concat(dataToRead[args.key], "'."));
          }

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
              dataToWrite = encoder.encode(dataToWrite);
            } else {
              dataToWrite = JSON.stringify(dataToWrite);
            }

            if (encrypt) {
              if (!gcm) {
                this.getIv(fs);
                var cipher = crypto.createCipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest("base64").substr(0, 32), this.iv);
                dataToWrite = Buffer.concat([cipher.update(dataToWrite), cipher["final"]()]);
              } else {
                dataToWrite = (0, _gcm.encrypt)(dataToWrite, this.options.passkey);
              }
            }
          } catch (error) {
            throw new Error("".concat(this.mainLog, " encountered error '").concat(error, "' when trying to write file '").concat(path, "'."));
          }

          fs.writeFile(path, dataToWrite, function (error) {
            if (debug) {
              console.log("".concat(_this3.mainLog, " wrote \"'").concat(args.key, "':'").concat(args.value, "'\" to file '").concat(path, "'."));
            }

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
                throw new Error("".concat(_this2.mainLog, " encountered error '").concat(error, "' when trying to read file '").concat(path, "'. This file is probably corrupted. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
              }
            }

            var dataInFile = data;

            try {
              if (typeof data !== "undefined") {
                if (encrypt) {
                  if (!gcm) {
                    _this2.getIv(fs);

                    var decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha512").update(_this2.options.passkey).digest("base64").substr(0, 32), _this2.iv);
                    dataInFile = Buffer.concat([decipher.update(dataInFile), decipher["final"]()]);
                  } else {
                    dataInFile = (0, _gcm.decrypt)(dataInFile, _this2.options.passkey);
                  }
                }

                if (minify) {
                  dataInFile = decoder.decode(dataInFile);
                } else {
                  dataInFile = JSON.parse(dataInFile);
                }
              }
            } catch (error2) {
              throw new Error("".concat(_this2.mainLog, " encountered error '").concat(error2, "' when trying to read file '").concat(path, "'. This file is probably corrupted. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
            }

            _this2.fileData = dataInFile;
            writeToFile();
          });
        } else {
          writeToFile();
        }
      });
      ipcMain.on(useConfigInMainRequest, function (IpcMainEvent, args) {
        if (debug) {
          console.log("".concat(_this2.mainLog, " received a request to read store in electron main process."));
        }

        if (typeof mainProcessCallback !== "undefined") {
          var dataInFile = {};
          fs.readFile(path, function (error, data) {
            if (error) {
              if (error.code === "ENOENT") {
                if (debug) {
                  console.log("".concat(_this2.mainLog, " did not find data file when trying read the data file from the main electron process."));
                }

                mainProcessCallback(false, dataInFile);
                browserWindow.webContents.send(useConfigInMainResponse, {
                  success: false
                });
                return;
              }
            }

            dataInFile = data;

            try {
              console.log("ABC");

              if (encrypt) {
                if (!gcm) {
                  _this2.getIv(fs);

                  var decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha512").update(_this2.options.passkey).digest("base64").substr(0, 32), _this2.iv);
                  dataInFile = Buffer.concat([decipher.update(dataInFile), decipher["final"]()]);
                } else {
                  console.log("ABC1");
                  console.log(dataInFile);
                  dataInFile = (0, _gcm.decrypt)(dataInFile, _this2.options.passkey);
                }
              }

              if (minify) {
                console.log("ABC2");
                dataInFile = decoder.decode(dataInFile);
              } else {
                console.log("ABC3");
                dataInFile = JSON.parse(dataInFile);
              }
            } catch (error2) {
              throw new Error("".concat(_this2.mainLog, " encountered error '").concat(error2, "' when trying to read file '").concat(path, "'. This file is probably corrupted or has been tampered with. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
            }

            if (debug) {
              console.log("".concat(_this2.mainLog, " read the store from the electron main process successfully."));
            }

            mainProcessCallback(true, dataInFile);
            browserWindow.webContents.send(useConfigInMainResponse, {
              success: true
            });
          });
        } else {
          throw new Error("".concat(_this2.mainLog, " failed to take action when receiving a request to use the store in the main electron process. This has occurred because your mainProcessCallback callback is undefined, please ensure your callback is \"const\" so it is not garbage collected - this is the most likely reason for your error"));
        }
      });
      ipcMain.on(deleteUnprotectedConfigRequest, function (IpcMainEvent, args) {
        if (debug) {
          console.log("".concat(_this2.mainLog, " received a request to delete unprotected data files."));
        }

        var success = true;

        try {
          resetUnprotectedFiles();
        } catch (error) {
          console.error("".concat(_this2.mainLog, " failed to reset unprotected data due to error: '").concat(error, "'. Please resolve this error and try again."));
          success = false;
        }

        browserWindow.webContents.send(deleteUnprotectedConfigResponse, {
          success: success
        });
      });
      ipcMain.on(readUnprotectedConfigRequest, function (IpcMainEvent, args) {
        if (debug) {
          console.log("".concat(_this2.mainLog, " received a request to read from the key '").concat(args.key, "' from the given unprotected file '").concat(unprotectedPath, "'."));
        }

        fs.readFile(unprotectedPath, function (error, data) {
          if (error) {
            if (error.code === "ENOENT") {
              if (debug) {
                console.log("".concat(_this2.mainLog, " did not find unprotected data file when trying read the key '").concat(args.key, "'. Creating an empty unprotected data file."));
              }

              var defaultData = JSON.stringify({});
              fs.writeFileSync(unprotectedPath, defaultData);
              browserWindow.webContents.send(readUnprotectedConfigResponse, {
                success: false,
                key: args.key,
                value: undefined
              });
              return;
            } else {
              throw new Error("".concat(_this2.mainLog, " encountered error '").concat(error, "' when trying to read unprotected file '").concat(unprotectedPath, "'. This file is probably corrupted. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
            }
          }

          var dataToRead = data;

          try {
            dataToRead = JSON.parse(dataToRead);
          } catch (error2) {
            throw new Error("".concat(_this2.mainLog, " encountered error '").concat(error2, "' when trying to read unprotected file '").concat(unprotectedPath, "'. This file is probably corrupted or has been tampered with. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
          }

          _this2.unprotectedFileData = dataToRead;

          if (debug) {
            console.log("".concat(_this2.mainLog, " read the key '").concat(args.key, "' from unprotected file => '").concat(dataToRead[args.key], "'."));
          }

          browserWindow.webContents.send(readUnprotectedConfigResponse, {
            success: true,
            key: args.key,
            value: dataToRead[args.key]
          });
        });
      });
      ipcMain.on(writeUnprotectedConfigRequest, function (IpcMainEvent, args) {
        var writeToFile = function () {
          var _this4 = this;

          if (typeof args.key !== "undefined" && typeof args.value !== "undefined") {
            this.unprotectedFileData[args.key] = args.value;
          }

          var dataToWrite = this.unprotectedFileData;

          try {
            dataToWrite = JSON.stringify(dataToWrite);
          } catch (error) {
            throw new Error("".concat(this.mainLog, " encountered error '").concat(error, "' when trying to write unprotected file '").concat(unprotectedPath, "'."));
          }

          fs.writeFile(unprotectedPath, dataToWrite, function (error) {
            if (debug) {
              console.log("".concat(_this4.mainLog, " wrote \"'").concat(args.key, "':'").concat(args.value, "'\" to file '").concat(unprotectedPath, "'."));
            }

            browserWindow.webContents.send(writeUnprotectedConfigResponse, {
              success: !error,
              key: args.key
            });
          });
        }.bind(_this2);

        if (typeof _this2.unprotectedFileData === "undefined") {
          fs.readFile(unprotectedPath, function (error, data) {
            if (error) {
              if (error.code === "ENOENT") {
                _this2.unprotectedFileData = {};
                writeToFile();
                return;
              } else {
                throw new Error("".concat(_this2.mainLog, " encountered error '").concat(error, "' when trying to read unprotected file '").concat(unprotectedPath, "'. This file is probably corrupted. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
              }
            }

            var dataInFile = data;

            try {
              if (typeof data !== "undefined") {
                dataInFile = JSON.parse(dataInFile);
              }
            } catch (error2) {
              throw new Error("".concat(_this2.mainLog, " encountered error '").concat(error2, "' when trying to read unprotected file '").concat(path, "'. This file is probably corrupted. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
            }

            _this2.unprotectedFileData = dataInFile;
            writeToFile();
          });
        } else {
          writeToFile();
        }
      });
      ipcMain.on(useUnprotectedConfigInMainRequest, function (IpcMainEvent, args) {
        if (debug) {
          console.log("".concat(_this2.mainLog, " received a request to read unprotected store in electron main process."));
        }

        if (typeof unprotectedMainProcessCallback !== "undefined") {
          var dataInFile = {};
          fs.readFile(unprotectedPath, function (error, data) {
            if (error) {
              if (error.code === "ENOENT") {
                if (debug) {
                  console.log("".concat(_this2.mainLog, " did not find unprotected data file when trying read the unprotected data file from the main electron process."));
                }

                unprotectedMainProcessCallback(false, dataInFile);
                browserWindow.webContents.send(useUnprotectedConfigInMainResponse, {
                  success: false
                });
                return;
              }
            }

            dataInFile = data;

            try {
              dataInFile = JSON.parse(dataInFile);
            } catch (error2) {
              throw new Error("".concat(_this2.mainLog, " encountered error '").concat(error2, "' when trying to read unprotected file '").concat(path, "'. This file is probably corrupted or has been tampered with. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
            }

            if (debug) {
              console.log("".concat(_this2.mainLog, " read the unprotected store from the electron main process successfully."));
            }

            unprotectedMainProcessCallback(true, dataInFile);
            browserWindow.webContents.send(useUnprotectedConfigInMainResponse, {
              success: true
            });
          });
        } else {
          throw new Error("".concat(_this2.mainLog, " failed to take action when receiving a request to use the unprotected store in the main electron process. This has occurred because your unprotectedMainProcessCallback callback is undefined, please ensure your callback is \"const\" so it is not garbage collected - this is the most likely reason for your error"));
        }
      });
    }
  }, {
    key: "mainInitialStore",
    value: function mainInitialStore(fs) {
      var _this$options3 = this.options,
          debug = _this$options3.debug,
          unprotectedPath = _this$options3.unprotectedPath;
      var data;

      try {
        data = fs.readFileSync(unprotectedPath);
      } catch (error) {
        if (error.code === "ENOENT") {
          if (debug) {
            console.log("".concat(this.mainLog, " did not find unprotected data file when trying read '").concat(unprotectedPath, "'. Creating an empty data file."));
          }

          var defaultData = JSON.stringify({});
          fs.writeFileSync(unprotectedPath, defaultData);
          return {};
        } else {
          throw new Error("".concat(this.mainLog, " encountered error '").concat(error, "' when trying to read unprotected file '").concat(unprotectedPath, "'. This file is probably corrupted. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
        }
      }

      var dataToRead = data;

      try {
        dataToRead = JSON.parse(dataToRead);
      } catch (error2) {
        throw new Error("".concat(this.mainLog, " encountered error '").concat(error2, "' when trying to read unprotected file '").concat(unprotectedPath, "'. This file is probably corrupted or has been tampered with. To fix this error, you may set \"reset\" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue."));
      }

      return dataToRead;
    }
  }, {
    key: "clearMainBindings",
    value: function clearMainBindings(ipcMain) {
      ipcMain.removeAllListeners(readConfigRequest);
      ipcMain.removeAllListeners(writeConfigRequest);
      ipcMain.removeAllListeners(deleteConfigRequest);
      ipcMain.removeAllListeners(savePasskeyRequest);
      ipcMain.removeAllListeners(useConfigInMainRequest);
      ipcMain.removeAllListeners(readUnprotectedConfigRequest);
      ipcMain.removeAllListeners(writeUnprotectedConfigRequest);
      ipcMain.removeAllListeners(deleteUnprotectedConfigRequest);
      ipcMain.removeAllListeners(useUnprotectedConfigInMainRequest);
    }
  }]);

  return Store;
}();

exports["default"] = Store;