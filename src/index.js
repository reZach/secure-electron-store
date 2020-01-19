const Conf = require("conf");

export const readConfigRequest = "ReadConfig-Request";
export const writeConfigRequest = "WriteConfig-Request";
export const readConfigResponse = "ReadConfig-Response";
export const writeConfigResponse = "WriteConfig-Response";

export default class Store {
    constructor(app){
        const defaultCwd = app.getPath("userData");
        this.store = new Conf({
            cwd: defaultCwd
        });

        this.validSendChannels = [readConfigRequest, writeConfigRequest];
        this.validReceiveChannels = [readConfigResponse, writeConfigResponse];
    }

    preloadBindings(ipcRenderer) {
        return {
            send: (channel, key, value) => {                
                if (this.validSendChannels.includes(channel)){
                    if (channel === readConfigRequest){
                        ipcRenderer.send(channel, {key});
                    } else if (channel === writeConfigRequest){
                        ipcRenderer.send(channel, {key, value});
                    }
                }
            },
            onReceive: (channel, func) => {                
                if (this.validReceiveChannels.includes(channel)){
                    
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
    };
}