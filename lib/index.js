"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.writeConfigResponse = exports.readConfigResponse = exports.writeConfigRequest = exports.readConfigRequest = void 0;

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Conf = require("conf");

var readConfigRequest = "ReadConfig-Request";
exports.readConfigRequest = readConfigRequest;
var writeConfigRequest = "WriteConfig-Request";
exports.writeConfigRequest = writeConfigRequest;
var readConfigResponse = "ReadConfig-Response";
exports.readConfigResponse = readConfigResponse;
var writeConfigResponse = "WriteConfig-Response";
exports.writeConfigResponse = writeConfigResponse;

var Inner =
/*#__PURE__*/
function (_Conf) {
  _inherits(Inner, _Conf);

  function Inner(options) {
    _classCallCheck(this, Inner);

    options = _objectSpread({}, options);
    return _possibleConstructorReturn(this, _getPrototypeOf(Inner).call(this, options));
  }

  return Inner;
}(Conf);

var Store =
/*#__PURE__*/
function () {
  function Store(app) {
    _classCallCheck(this, Store);

    var defaultCwd = app.getPath("userData");
    this.store = new Inner({
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