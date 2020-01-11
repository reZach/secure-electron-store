"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.WRITEFILEREPLY = exports.REQUESTFILEREPLY = exports.WRITEFILE = exports.REQUESTFILE = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

// https://dev.to/therealdanvega/creating-your-first-npm-package-2ehf
var path = require("path");

var REQUESTFILE = "SES-RequestFile";
exports.REQUESTFILE = REQUESTFILE;
var WRITEFILE = "SES-WriteFile";
exports.WRITEFILE = WRITEFILE;
var REQUESTFILEREPLY = "SES-RequestFileReply";
exports.REQUESTFILEREPLY = REQUESTFILEREPLY;
var WRITEFILEREPLY = "SES-WriteFileReply";
exports.WRITEFILEREPLY = WRITEFILEREPLY;

var Bindings =
/*#__PURE__*/
function () {
  function Bindings(ipcMain, fs, basePath, options) {
    _classCallCheck(this, Bindings);

    this.ipcMain = ipcMain;
    this.fs = fs;
    var filename = typeof options.filename === "undefined" ? "config.json" : options.filename;
    this.filepath = path.join(basePath, filename);
    this.bindEvents();
  }

  _createClass(Bindings, [{
    key: "bindEvents",
    value: function bindEvents() {
      var _this = this;

      ipcMain.on(REQUESTFILE, function (IpcMainEvent, args) {
        _this.fs.access(_this.filepath, _this.fs.constants.F_OK, function (error) {
          if (!error) {
            _this.fs.readFile(_this.filepath, function (error, data) {
              IpcMainEvent.reply(REQUESTFILEREPLY, {
                error: error,
                data: data
              });
            });
          } else {
            IpcMainEvent.reply(REQUESTFILEREPLY, {
              error: "No file found!",
              data: {}
            });
          }
        });
      });
      ipcMain.on(WRITEFILE, function (IpcMainEvent, args) {
        _this.fs.writeFile(_this.filepath, args.data, function (error) {
          if (error) {
            IpcMainEvent.reply(WRITEFILEREPLY, {
              error: error
            });
          } else {
            IpcMainEvent.reply(WRITEFILEREPLY, {});
          }
        });
      });
    }
  }]);

  return Bindings;
}();

exports["default"] = Bindings;
