"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.writeConfigResponse = exports.readConfigResponse = exports.writeConfigRequest = exports.readConfigRequest = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var path = require("path");

var defaultOptions = {
  debug: true,
  path: "",
  filename: "data.json"
}; // Electron-specific; must match mainIpc

var readConfigRequest = "ReadConfig-Request";
exports.readConfigRequest = readConfigRequest;
var writeConfigRequest = "WriteConfig-Request";
exports.writeConfigRequest = writeConfigRequest;
var readConfigResponse = "ReadConfig-Response";
exports.readConfigResponse = readConfigResponse;
var writeConfigResponse = "WriteConfig-Response";
exports.writeConfigResponse = writeConfigResponse;
var initialFileRequest = "ReadConfigInitial-Request";
var initialFileResponse = "ReadConfigInitial-Response";

var Store =
/*#__PURE__*/
function () {
  function Store(options) {
    _classCallCheck(this, Store);

    this.options = defaultOptions;
    this.filedata = undefined;
    this.logPrepend = "[secure-electron-store]: ";

    if (typeof options !== "undefined") {
      this.options = Object.assign(this.options, options);
    }

    this.options.path = path.join(this.options.path, this.options.filename);
    this.validSendChannels = [readConfigRequest, writeConfigRequest];
    this.validReceiveChannels = [readConfigResponse, writeConfigResponse];
    if (this.options.debug) console.log("".concat(this.logPrepend, "Intialized. Data file: '").concat(this.options.path, "'."));
  }

  _createClass(Store, [{
    key: "preloadBindings",
    value: function preloadBindings(ipcRenderer, fs) {
      var _this = this;

      var _this$options = this.options,
          debug = _this$options.debug,
          path = _this$options.path;
      var initial = fs.readFileSync(path);
      var dataInFile = {};

      try {
        if (typeof initial !== "undefined") {
          dataInFile = JSON.parse(initial);
        }
      } catch (error) {
        console.log("".concat(this.logPrepend, "renderer encountered error '").concat(error, "' when trying to read file '").concat(path, "'."));
      }

      return {
        initial: dataInFile,
        send: function send(channel, key, value) {
          if (_this.validSendChannels.includes(channel)) {
            if (channel === readConfigRequest) {
              debug ? console.log("".concat(_this.logPrepend, "renderer requesting to read key '").concat(key, "' from file.")) : null;
              ipcRenderer.send(channel, {
                key: key
              });
            } else if (channel === writeConfigRequest) {
              debug ? console.log("".concat(_this.logPrepend, "renderer requesting to write key:value to file => '").concat(key, ":").concat(value, "'.")) : null;
              ipcRenderer.send(channel, {
                key: key,
                value: value
              });
            }
          }
        },
        onReceive: function onReceive(channel, func) {
          if (_this.validReceiveChannels.includes(channel)) {
            // Deliberately strip event as it includes "sender"
            ipcRenderer.on(channel, function (event, args) {
              if (debug) {
                switch (channel) {
                  case readConfigResponse:
                    console.log("".concat(_this.logPrepend, "renderer received value for key '").concat(args.key, "' => '").concat(args.value, "'."));
                    break;

                  case writeConfigResponse:
                    console.log("".concat(_this.logPrepend, "renderer ").concat(!args.success ? "un-" : "", "successfully wrote key '").concat(args.key, "' to file."));
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
          debug = _this$options2.debug,
          path = _this$options2.path; // Read initial 

      ipcMain.on(initialFileRequest, function (IpcMainEvent, args) {
        if (typeof _this2.filedata === "undefined") {
          fs.readFile(path, function (error, data) {
            var dataInFile = {};

            if (!error) {
              dataInFile = JSON.parse(data);
            } else {
              console.log("".concat(_this2.logPrepend, "main encountered error '").concat(error, "' when trying to read file '").concat(path, "'."));
            }

            _this2.filedata = dataInFile;
            browserWindow.webContents.send(initialFileResponse, {
              filedata: _this2.filedata
            });
          });
        }
      }); // Anytime the renderer process requests for a file read

      ipcMain.on(readConfigRequest, function (IpcMainEvent, args) {
        debug ? console.log("".concat(_this2.logPrepend, "main received a request to read from the key '").concat(args.key, "' from the given file '").concat(path, "'.")) : null;
        fs.readFile(path, function (error, data) {
          var dataToRead = JSON.parse(args);
          _this2.filedata = dataToRead;
          debug ? console.log("".concat(_this2.logPrepend, "main read the key '").concat(args.key, "' from file => '").concat(dataToRead[args.key], "'.")) : null;
          browserWindow.webContents.send(readConfigResponse, {
            key: key,
            value: dataToRead[args.key]
          });
        });
      }); // Anytime the renderer process requests for a file write

      ipcMain.on(writeConfigRequest, function (IpcMainEvent, args) {
        // Wrapper function; since we call
        // this twice below
        var writeToFile = function () {
          var _this3 = this;

          this.filedata[args.key] = args.value;
          var dataToWrite = JSON.stringify(this.filedata);
          fs.writeFile(path, dataToWrite, function (error) {
            debug ? console.log("".concat(_this3.logPrepend, "wrote to file '").concat(path, "' => '").concat(dataToWrite, "'.")) : null;
            browserWindow.webContents.send(writeConfigResponse, {
              success: !error,
              key: args.key
            });
          });
        }.bind(_this2);

        if (typeof _this2.filedata === "undefined") {
          fs.readFile(path, function (error, data) {
            var dataInFile = {};

            try {
              if (typeof data !== "undefined") {
                dataInFile = JSON.parse(data);
              }
            } catch (error) {
              console.log("".concat(_this2.logPrepend, "main encountered error '").concat(error, "' when trying to read file '").concat(path, "'."));
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