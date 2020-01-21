"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.writeConfigResponse = exports.readConfigResponse = exports.writeConfigRequest = exports.readConfigRequest = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var msgpack = require("msgpack");

var path = require("path");

var defaultOptions = {
  debug: true,
  msgpack: true,
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

var Store =
/*#__PURE__*/
function () {
  function Store(options) {
    _classCallCheck(this, Store);

    this.options = defaultOptions;

    if (typeof options !== "undefined") {
      this.options = Object.assign(this.options, options);
    }

    this.options.path = path.join(this.options.path, this.options.filename);
    this.validSendChannels = [readConfigRequest, writeConfigRequest];
    this.validReceiveChannels = [readConfigResponse, writeConfigResponse];
  }

  _createClass(Store, [{
    key: "preloadBindings",
    value: function preloadBindings(ipcRenderer) {
      var _this = this;

      var debug = this.options.debug;
      return {
        send: function send(channel, key, value) {
          if (_this.validSendChannels.includes(channel)) {
            if (channel === readConfigRequest) {
              debug ? console.log("[secure-electron-store]: renderer received ".concat(channel, ".")) : null;
              ipcRenderer.send(channel, {
                key: key
              });
            } else if (channel === writeConfigRequest) {
              debug ? console.log("[secure-electron-store]: renderer received ".concat(channel, ".")) : null;
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
              debug ? console.log("[secure-electron-store]: renderer received ".concat(channel, ".")) : null;
              func(args);
            });
          }
        }
      };
    }
  }, {
    key: "mainBindings",
    value: function mainBindings(ipcMain, browserWindow, fs) {
      var _this$options = this.options,
          debug = _this$options.debug,
          path = _this$options.path,
          msgpack = _this$options.msgpack;
      ipcMain.on(readConfigRequest, function (IpcMainEvent, args) {
        debug ? console.log("[secure-electron-store]: main received ".concat(readConfigRequest, ".")) : null;
        fs.readFile(path, function (error, data) {
          var dataToRead = msgpack ? msgpack.unpack(args) : JSON.parse(args);
          browserWindow.webContents.send(readConfigResponse, dataToRead[args.key]);
        });
      });
      ipcMain.on(writeConfigRequest, function (IpcMainEvent, args) {
        debug ? console.log("[secure-electron-store]: main received ".concat(writeConfigRequest, ".")) : null;
        var dataToWrite = msgpack ? msgpack.pack(args) : JSON.stringify(args);
        fs.writeFile(path, dataToWrite, function (error) {
          console.log("".concat(writeConfigRequest, " write file"));
          browserWindow.webContents.send(writeConfigResponse, true);
        });
      });
    }
  }]);

  return Store;
}();

exports["default"] = Store;