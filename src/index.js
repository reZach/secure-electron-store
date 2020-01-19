const electron = require("electron");
const path = require("path");
const Conf = require("conf");

export const readConfigRequest = "ReadConfig-Request";
export const writeConfigRequest = "WriteConfig-Request";
export const readConfigResponse = "ReadConfig-Response";
export const writeConfigResponse = "WriteConfig-Response";

class Store extends Conf {
    constructor(options){
        const defaultCwd = electron.app.getPath("userData");
        
        // override if present
        if (options.cwd){
            options.cwd = path.isAbsolute(options.cwd) ? options.cwd : path.join(defaultCwd, options.cwd);
        } else {
            options.cwd = defaultCwd;
        }

        super(options);
    }
}
const store = new Store();

export const preloadBindings = function (ipcRenderer) {
    return {
        send: (channel, key, value) => {
            let validChannels = [readConfigRequest, writeConfigRequest];
            if (validChannels.includes(channel)){
                if (channel === readConfigRequest){
                    ipcRenderer.send(channel, {key});
                } else if (channel === writeConfigRequest){
                    ipcRenderer.send(channel, {key, value});
                }
            }
        },
        onReceive: (channel, func) => {
            let validChannels = [readConfigResponse, writeConfigResponse];
            if (validChannels.includes(channel)){
                
                // Deliberately strip event as it includes "sender"
                ipcRenderer.on(channel, (event, args) => func(args));                
            }
        }
    };
};

export const mainBindings = function(ipcMain, browserWindow) {
    ipcMain.on(readConfigRequest, (IpcMainEvent, args) => {        
        let value = store.get(args.key);
        browserWindow.webContents.send(readConfigResponse, value);
    });

    ipcMain.on(writeConfigRequest, (IpcMainEvent, args) => {
        store.set(args.key, args.value);
        browserWindow.webContents.send(writeConfigResponse, true);
    });
};