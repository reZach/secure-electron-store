"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.writeConfigResponse = exports.readConfigResponse = exports.writeConfigRequest = exports.readConfigRequest = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Conf = require("conf");

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
  function Store(app) {
    _classCallCheck(this, Store);

    var defaultCwd = app.getPath("userData");
    this.store = new Conf({
      cwd: defaultCwd
    });
    this.validSendChannels = [readConfigRequest, writeConfigRequest];
    this.validReceiveChannels = [readConfigResponse, writeConfigResponse];
  }

  _createClass(Store, [{
    key: "preloadBindings",
    value: function preloadBindings(ipcRenderer) {
      var _this = this;

      return {
        send: function send(channel, key, value) {
          if (_this.validSendChannels.includes(channel)) {
            if (channel === readConfigRequest) {
              ipcRenderer.send(channel, {
                key: key
              });
            } else if (channel === writeConfigRequest) {
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
              return func(args);
            });
          }
        }
      };
    }
  }, {
    key: "mainBindings",
    value: function mainBindings(ipcMain, browserWindow) {
      var _this2 = this;

      ipcMain.on(readConfigRequest, function (IpcMainEvent, args) {
        var value = _this2.store.get(args.key);

        browserWindow.webContents.send(readConfigResponse, value);
      });
      ipcMain.on(writeConfigRequest, function (IpcMainEvent, args) {
        _this2.store.set(args.key, args.value);

        browserWindow.webContents.send(writeConfigResponse, true);
      });
    }
  }]);

  return Store;
}();

exports["default"] = Store;