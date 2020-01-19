"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mainBindings = exports.preloadBindings = exports.writeConfigResponse = exports.readConfigResponse = exports.writeConfigRequest = exports.readConfigRequest = void 0;

const electron = require("electron");

const path = require("path");

const Conf = require("conf");

const readConfigRequest = "ReadConfig-Request";
exports.readConfigRequest = readConfigRequest;
const writeConfigRequest = "WriteConfig-Request";
exports.writeConfigRequest = writeConfigRequest;
const readConfigResponse = "ReadConfig-Response";
exports.readConfigResponse = readConfigResponse;
const writeConfigResponse = "WriteConfig-Response";
exports.writeConfigResponse = writeConfigResponse;

class Store extends Conf {
  constructor(options) {
    const defaultCwd = electron.app.getPath("userData");
    options = { ...options
    }; // override if present

    if (options.cwd) {
      options.cwd = path.isAbsolute(options.cwd) ? options.cwd : path.join(defaultCwd, options.cwd);
    } else {
      options.cwd = defaultCwd;
    }

    super(options);
  }

}

const store = new Store();

const preloadBindings = function (ipcRenderer) {
  return {
    send: (channel, key, value) => {
      let validChannels = [readConfigRequest, writeConfigRequest];

      if (validChannels.includes(channel)) {
        if (channel === readConfigRequest) {
          ipcRenderer.send(channel, {
            key
          });
        } else if (channel === writeConfigRequest) {
          ipcRenderer.send(channel, {
            key,
            value
          });
        }
      }
    },
    onReceive: (channel, func) => {
      let validChannels = [readConfigResponse, writeConfigResponse];

      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes "sender"
        ipcRenderer.on(channel, (event, args) => func(args));
      }
    }
  };
};

exports.preloadBindings = preloadBindings;

const mainBindings = function (ipcMain, browserWindow) {
  ipcMain.on(readConfigRequest, (IpcMainEvent, args) => {
    let value = store.get(args.key);
    browserWindow.webContents.send(readConfigResponse, value);
  });
  ipcMain.on(writeConfigRequest, (IpcMainEvent, args) => {
    store.set(args.key, args.value);
    browserWindow.webContents.send(writeConfigResponse, true);
  });
};

exports.mainBindings = mainBindings;