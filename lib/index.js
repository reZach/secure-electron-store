"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.writeConfigResponse = exports.readConfigResponse = exports.writeConfigRequest = exports.readConfigRequest = void 0;

var _msgpack = require("@msgpack/msgpack");

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var crypto = require("crypto");

var path = require("path");

var defaultOptions = {
  debug: true,
  minify: true,
  encrypt: true,
  passcode: "",
  path: "",
  filename: "data",
  extension: ".json"
};
var readConfigRequest = "ReadConfig-Request";
exports.readConfigRequest = readConfigRequest;
var writeConfigRequest = "WriteConfig-Request";
exports.writeConfigRequest = writeConfigRequest;
var readConfigResponse = "ReadConfig-Response";
exports.readConfigResponse = readConfigResponse;
var writeConfigResponse = "WriteConfig-Response";
exports.writeConfigResponse = writeConfigResponse;

var Store = function () {
  function Store(options) {
    _classCallCheck(this, Store);

    this.options = defaultOptions;
    this.filedata = undefined;
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
    this.validSendChannels = [readConfigRequest, writeConfigRequest];
    this.validReceiveChannels = [readConfigResponse, writeConfigResponse];

    if (this.options.debug) {
      if ((typeof process === "undefined" ? "undefined" : _typeof(process)) === "object") {
        console.log("".concat(this.rendererLog, " initialized store. Data file: '").concat(this.options.path, "'."));
      } else {
        console.log("".concat(this.mainLog, " initialized store. Data file: '").concat(this.options.path, "'."));
      }
    }
  }

  _createClass(Store, [{
    key: "preloadBindings",
    value: function preloadBindings(ipcRenderer, fs) {
      var _this = this;

      var _this$options = this.options,
          minify = _this$options.minify,
          debug = _this$options.debug,
          path = _this$options.path;
      var initial;
      var dataInFile = {};

      try {
        initial = fs.readFileSync(path);

        if (typeof initial !== "undefined") {
          if (minify) {
            dataInFile = (0, _msgpack.decode)(initial);
          } else {
            dataInFile = JSON.parse(initial);
          }
        }
      } catch (error) {
        console.error("".concat(this.rendererLog, " encountered error '").concat(error, "' when trying to read file '").concat(path, "'. This file is probably corrupted, does not exist or is empty; defaulting file value to '{}'."));
        dataInFile = {};
      }

      return {
        initial: dataInFile,
        path: path,
        send: function send(channel, key, value) {
          if (_this.validSendChannels.includes(channel)) {
            if (channel === readConfigRequest) {
              debug ? console.log("".concat(_this.rendererLog, " requesting to read key '").concat(key, "' from file.")) : null;
              ipcRenderer.send(channel, {
                key: key
              });
            } else if (channel === writeConfigRequest) {
              debug ? console.log("".concat(_this.rendererLog, " requesting to write key:value to file => \"'").concat(key, "':'").concat(value, "'\".")) : null;
              ipcRenderer.send(channel, {
                key: key,
                value: value
              });
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
          path = _this$options2.path;

      var getIv = function () {
        console.warn("getIv");
        console.warn(this.iv);

        if (typeof this.iv !== "undefined") {
          return this.iv;
        }

        var rawIv;

        try {
          fs.accessSync(this.ivFile);
          rawIv = fs.readFileSync(this.ivFile);
        } catch (error) {
          console.warn("file doesn't exist");
          var randomBytes = crypto.randomBytes(32).toString("hex").slice(0, 16);
          rawIv = randomBytes;
          fs.writeFileSync(this.ivFile, randomBytes);
        }

        console.warn(rawIv);
        console.warn(_typeof(rawIv));
        this.iv = rawIv;
      }.bind(this);

      ipcMain.on(readConfigRequest, function (IpcMainEvent, args) {
        debug ? console.log("".concat(_this2.mainLog, " received a request to read from the key '").concat(args.key, "' from the given file '").concat(path, "'.")) : null;
        fs.readFile(path, function (error, data) {
          if (error) {
            console.error("".concat(_this2.mainLog, " encountered error '").concat(error, "' when trying to read key '").concat(args.key, "' from file '").concat(path, "'. This file is probably corrupted or the key does not exist."));
            browserWindow.webContents.send(readConfigResponse, {
              success: false,
              key: key,
              value: undefined
            });
            return;
          }

          var dataToRead = data;

          if (encrypt) {
            getIv();
            var decipher = crypto.createDecipheriv("aes-256-cbc", "abc", _this2.iv);
            dataToRead = Buffer.concat([decipher.update(dataToRead), decipher["final"]()]);
          }

          if (minify) {
            dataToRead = (0, _msgpack.decode)(dataToRead);
          } else {
            dataToRead = JSON.parse(dataToRead);
          }

          _this2.filedata = dataToRead;
          debug ? console.log("".concat(_this2.mainLog, " read the key '").concat(args.key, "' from file => '").concat(dataToRead[args.key], "'.")) : null;
          browserWindow.webContents.send(readConfigResponse, {
            success: true,
            key: key,
            value: dataToRead[args.key]
          });
        });
      });
      ipcMain.on(writeConfigRequest, function (IpcMainEvent, args) {
        var writeToFile = function () {
          var _this3 = this;

          this.filedata[args.key] = args.value;
          var dataToWrite = this.filedata;

          if (minify) {
            dataToWrite = (0, _msgpack.encode)(dataToWrite);
          } else {
            dataToWrite = JSON.stringify(dataToWrite);
          }

          if (encrypt) {
            getIv();
            var cipher = crypto.createCipheriv("aes-256-cbc", "abc", this.iv);
            dataToWrite = Buffer.concat([cipher.update(dataToWrite), cipher["final"]()]);
          }

          fs.writeFile(path, dataToWrite, function (error) {
            debug ? console.log("".concat(_this3.mainLog, " wrote \"'").concat(args.key, "':'").concat(args.value, "'\" to file '").concat(path, "'.")) : null;
            browserWindow.webContents.send(writeConfigResponse, {
              success: !error,
              key: args.key
            });
          });
        }.bind(_this2);

        if (typeof _this2.filedata === "undefined") {
          fs.readFile(path, function (error, data) {
            if (error) {
              console.error("".concat(_this2.mainLog, " encountered error '").concat(error, "' when trying to read file '").concat(path, "'. This file is probably corrupted, does not exist or is empty; defaulting file value to '{}'."));
              _this2.filedata = {};
              writeToFile();
              return;
            }

            var dataInFile = {};

            try {
              if (typeof data !== "undefined") {
                if (minify) {
                  dataInFile = (0, _msgpack.decode)(data);
                } else {
                  dataInFile = JSON.parse(data);
                }
              }
            } catch (error) {
              console.error("".concat(_this2.mainLog, " encountered error '").concat(error, "' when trying to read file '").concat(path, "'. This file is probably corrupted, does not exist or is empty; defaulting file value to '{}'."));
              _this2.filedata = {};
              writeToFile();
              return;
            }

            _this2.filedata = dataInFile;
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