"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mainBindings = exports.preloadBindings = exports.writeConfigResponse = exports.readConfigResponse = exports.writeConfigRequest = exports.readConfigRequest = void 0;

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var electron = require("electron");

var path = require("path");

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
function (_Conf) {
  _inherits(Store, _Conf);

  function Store(options) {
    _classCallCheck(this, Store);

    var defaultCwd = electron.app.getPath("userData"); // override if present

    if (options.cwd) {
      options.cwd = path.isAbsolute(options.cwd) ? options.cwd : path.join(defaultCwd, options.cwd);
    } else {
      options.cwd = defaultCwd;
    }

    return _possibleConstructorReturn(this, _getPrototypeOf(Store).call(this, options));
  }

  return Store;
}(Conf);

var store = new Store();

var preloadBindings = function preloadBindings(ipcRenderer) {
  return {
    send: function send(channel, key, value) {
      var validChannels = [readConfigRequest, writeConfigRequest];

      if (validChannels.includes(channel)) {
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
      var validChannels = [readConfigResponse, writeConfigResponse];

      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes "sender"
        ipcRenderer.on(channel, function (event, args) {
          return func(args);
        });
      }
    }
  };
};

exports.preloadBindings = preloadBindings;

var mainBindings = function mainBindings(ipcMain, browserWindow) {
  ipcMain.on(readConfigRequest, function (IpcMainEvent, args) {
    var value = store.get(args.key);
    browserWindow.webContents.send(readConfigResponse, value);
  });
  ipcMain.on(writeConfigRequest, function (IpcMainEvent, args) {
    store.set(args.key, args.value);
    browserWindow.webContents.send(writeConfigResponse, true);
  });
};

exports.mainBindings = mainBindings;