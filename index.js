"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.WRITEFILEREPLY = exports.REQUESTFILEREPLY = exports.WRITEFILE = exports.REQUESTFILE = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

// https://dev.to/therealdanvega/creating-your-first-npm-package-2ehf
var fs = require("fs");

var path = require("path");

var electron = require("electron");

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
  function Bindings(ipcMain, options) {
    _classCallCheck(this, Bindings);

    this.ipcMain = ipcMain;
    var appPath = electron.app.getPath("userData");
    var filename = typeof options.filename === "undefined" ? "config.json" : options.filename;
    this.filepath = path.join(appPath, filename);
    this.bindEvents();
  }

  _createClass(Bindings, [{
    key: "bindEvents",
    value: function bindEvents() {
      var _this = this;

      ipcMain.on(REQUESTFILE, function (IpcMainEvent, args) {
        fs.access(_this.filepath, fs.constants.F_OK, function (error) {
          if (!error) {
            fs.readFile(_this.filepath, {
              encoding: "utf-8"
            }, function (error, data) {
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
        fs.writeFile(_this.filepath, args.data, {
          encoding: "utf-8"
        }, function (error) {
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

var _default = Bindings;
exports["default"] = _default;
