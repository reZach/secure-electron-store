const msgpack = require("msgpack");
const path = require("path");

const defaultOptions = {
    debug: true,
    msgpack: true,
    path: "",
    filename: "data.json"
};

// Electron-specific; must match mainIpc
export const readConfigRequest = "ReadConfig-Request";
export const writeConfigRequest = "WriteConfig-Request";
export const readConfigResponse = "ReadConfig-Response";
export const writeConfigResponse = "WriteConfig-Response";

export default class Store {
    constructor(options){
        this.options = defaultOptions;

        if (typeof options !== "undefined"){
            this.options = Object.assign(this.options, options);
        }
        this.options.path = path.join(this.options.path, this.options.filename);

        this.validSendChannels = [readConfigRequest, writeConfigRequest];
        this.validReceiveChannels = [readConfigResponse, writeConfigResponse];
    }

    preloadBindings(ipcRenderer) {
        const { debug } = this.options;

        return {
            send: (channel, key, value) => {                
                if (this.validSendChannels.includes(channel)){
                    if (channel === readConfigRequest){
                        debug ? console.log(`[secure-electron-store]: renderer received ${channel}.`) : null;

                        ipcRenderer.send(channel, {key});
                    } else if (channel === writeConfigRequest){
                        debug ? console.log(`[secure-electron-store]: renderer received ${channel}.`) : null;

                        ipcRenderer.send(channel, {key, value});
                    }
                }
            },
            onReceive: (channel, func) => {                
                if (this.validReceiveChannels.includes(channel)){
                    
                    // Deliberately strip event as it includes "sender"
                    ipcRenderer.on(channel, (event, args) => {
                        debug ? console.log(`[secure-electron-store]: renderer received ${channel}.`) : null;
                        func(args);
                    });
                }
            }
        };
    }

    mainBindings(ipcMain, browserWindow, fs) {
        const { debug, path, msgpack } = this.options;

        ipcMain.on(readConfigRequest, (IpcMainEvent, args) => {
            debug ? console.log(`[secure-electron-store]: main received ${readConfigRequest}.`) : null;
            
            fs.readFile(path, (error, data) => {
                let dataToRead = msgpack ? msgpack.unpack(args) : JSON.parse(args);                
                browserWindow.webContents.send(readConfigResponse, dataToRead[args.key]);
            });
        });
    
        ipcMain.on(writeConfigRequest, (IpcMainEvent, args) => {
            debug ? console.log(`[secure-electron-store]: main received ${writeConfigRequest}.`) : null;

            let dataToWrite = msgpack ? msgpack.pack(args) : JSON.stringify(args);
            fs.writeFile(path, dataToWrite, (error) => {
                console.log(`${writeConfigRequest} write file`);
                browserWindow.webContents.send(writeConfigResponse, true);
            });
        });
    };
}