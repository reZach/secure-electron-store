"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.writeConfigResponse = exports.readConfigResponse = exports.writeConfigRequest = exports.readConfigRequest = void 0;

const Conf = require("conf");

const readConfigRequest = "ReadConfig-Request";
exports.readConfigRequest = readConfigRequest;
const writeConfigRequest = "WriteConfig-Request";
exports.writeConfigRequest = writeConfigRequest;
const readConfigResponse = "ReadConfig-Response";
exports.readConfigResponse = readConfigResponse;
const writeConfigResponse = "WriteConfig-Response";
exports.writeConfigResponse = writeConfigResponse;

class Inner extends Conf {
  constructor(options) {
    options = { ...options
    };
    super(options);
  }

}

class Store {
  constructor(electron) {
    const defaultCwd = electron.app.getPath("userData");
    this.store = new Inner({
      cwd: defaultCwd
    });
    this.validSendChannels = [readConfigRequest, writeConfigRequest];
    this.validReceiveChannels = [readConfigResponse, writeConfigResponse];
  }

  preloadBindings(ipcRenderer) {
    return {
      send: (channel, key, value) => {
        if (this.validSendChannels.includes(channel)) {
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
        if (this.validReceiveChannels.includes(channel)) {
          // Deliberately strip event as it includes "sender"
          ipcRenderer.on(channel, (event, args) => func(args));
        }
      }
    };
  }

  mainBindings(ipcMain, browserWindow) {
    ipcMain.on(readConfigRequest, (IpcMainEvent, args) => {
      let value = this.store.get(args.key);
      browserWindow.webContents.send(readConfigResponse, value);
    });
    ipcMain.on(writeConfigRequest, (IpcMainEvent, args) => {
      this.store.set(args.key, args.value);
      browserWindow.webContents.send(writeConfigResponse, true);
    });
  }

}

var _default = Store;
exports.default = _default;