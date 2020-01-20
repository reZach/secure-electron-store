"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.writeConfigResponse = exports.readConfigResponse = exports.writeConfigRequest = exports.readConfigRequest = void 0;

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var path = require("path");

var defaultOptions = {
  path: ""
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

    console.log(_typeof(options));

    if (typeof options === "undefined") {
      this.options = _objectSpread({}, defaultOptions);
    } else if (_typeof(options) !== "object") {
      throw "options must be of type 'object'!";
    } else {
      this.options = options;
    }

    console.log(this.options);
    this.options.path = path.join(this.options.path, "data.json");
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
    value: function mainBindings(ipcMain, browserWindow, fs) {
      var path = this.options.path;
      console.log("mainBindings");
      ipcMain.on(readConfigRequest, function (IpcMainEvent, args) {
        console.log(readConfigRequest);
        fs.readFile(path, function (error, data) {
          console.log("".concat(readConfigRequest, " read file"));
          browserWindow.webContents.send(readConfigResponse, data);
        });
      });
      ipcMain.on(writeConfigRequest, function (IpcMainEvent, args) {
        console.log("".concat(writeConfigRequest, " - path: ").concat(path));
        fs.writeFile(path, JSON.stringify(args), function (error) {
          console.log("".concat(writeConfigRequest, " write file"));
          browserWindow.webContents.send(writeConfigResponse, true);
        });
      });
    }
  }]);

  return Store;
}();

exports["default"] = Store;