const path = require("path");

const defaultOptions = {
    path: ""
};

// Electron-specific; must match mainIpc
export const readConfigRequest = "ReadConfig-Request";
export const writeConfigRequest = "WriteConfig-Request";
export const readConfigResponse = "ReadConfig-Response";
export const writeConfigResponse = "WriteConfig-Response";

export default class Store {
    constructor(options){
        if (typeof options === "undefined"){
            this.options = {...defaultOptions};
        } else if (typeof options !== "object"){
            throw "options must be of type 'object'!";
        } else {
            this.options = options;
        }
        console.log(this.options);
        this.options.path = path.join(this.options.path, "data.json");

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

    mainBindings(ipcMain, browserWindow, fs) {
        const { path } = this.options;

        console.log("mainBindings");
        ipcMain.on(readConfigRequest, (IpcMainEvent, args) => {
            console.log(readConfigRequest);
            fs.readFile(path, (error, data) => {
                console.log(`${readConfigRequest} read file`);
                browserWindow.webContents.send(readConfigResponse, data);
            });
        });
    
        ipcMain.on(writeConfigRequest, (IpcMainEvent, args) => {
            console.log(`${writeConfigRequest} - path: ${path}`);
            fs.writeFile(path, JSON.stringify(args), (error) => {
                console.log(`${writeConfigRequest} write file`);
                browserWindow.webContents.send(writeConfigResponse, true);
            });
        });
    };
}