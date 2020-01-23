const path = require("path");

const defaultOptions = {
    debug: true,
    path: "",
    filename: "data.json"
};

// Electron-specific; must match mainIpc
export const readConfigRequest = "ReadConfig-Request";
export const writeConfigRequest = "WriteConfig-Request";
export const readConfigResponse = "ReadConfig-Response";
export const writeConfigResponse = "WriteConfig-Response";
const initialFileRequest = "ReadConfigInitial-Request";
const initialFileResponse = "ReadConfigInitial-Response";

export default class Store {
    constructor(options) {
        this.options = defaultOptions;
        this.filedata = undefined;
        this.logPrepend = "[secure-electron-store]: ";

        if (typeof options !== "undefined") {
            this.options = Object.assign(this.options, options);
        } else {
            // We are likely in the renderer process if
            // process is defined; if so, set the path based
            // on the process variable
            if (typeof process === "object"){
                try {
                    let arg = process.argv.filter(p => p.indexOf("storePath:") >= 0)[0];
                    this.options.path = arg.substr(arg.indexOf(":") + 1);

                    if (this.options.debug) console.log(`${this.logPrepend}renderer initializing. Parsed 'storePath' value: '${this.options.path}'.`);
                } catch (error) {
                    throw "Could not find 'additionalArguments' value beginning with 'storePath:' in your BrowserWindow. Please ensure this is set!";
                }
            }
        }
        this.options.path = path.join(this.options.path, this.options.filename);
        this.validSendChannels = [readConfigRequest, writeConfigRequest];
        this.validReceiveChannels = [readConfigResponse, writeConfigResponse];

        if (this.options.debug) console.log(`${this.logPrepend}Initialized store. Data file: '${this.options.path}'.`);
    }

    preloadBindings(ipcRenderer, fs) {
        const {
            debug,
            path
        } = this.options;

        const initial = fs.readFileSync(path);
        let dataInFile = {};
        try {
            if (typeof initial !== "undefined") {
                dataInFile = JSON.parse(initial);
            }
        } catch (error) {
            console.log(`${this.logPrepend}renderer encountered error '${error}' when trying to read file '${path}'.`);
        }
        
        return {
            initial: dataInFile,
            path,
            send: (channel, key, value) => {
                if (this.validSendChannels.includes(channel)) {
                    if (channel === readConfigRequest) {
                        debug ? console.log(`${this.logPrepend}renderer requesting to read key '${key}' from file.`) : null;

                        ipcRenderer.send(channel, {
                            key
                        });
                    } else if (channel === writeConfigRequest) {
                        debug ? console.log(`${this.logPrepend}renderer requesting to write key:value to file => '${key}:${value}'.`) : null;

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
                    ipcRenderer.on(channel, (event, args) => {
                        if (debug) {
                            switch (channel) {
                                case readConfigResponse:
                                    console.log(`${this.logPrepend}renderer received value for key '${args.key}' => '${args.value}'.`);
                                    break;
                                case writeConfigResponse:
                                    console.log(`${this.logPrepend}renderer ${!args.success ? "un-" : ""}successfully wrote key '${args.key}' to file.`);
                                    break;
                                default:
                                    break;
                            }
                        }
                        func(args);
                    });
                }
            }
        };
    }

    mainBindings(ipcMain, browserWindow, fs) {
        const {
            debug,
            path
        } = this.options;

        // Read initial 
        ipcMain.on(initialFileRequest, (IpcMainEvent, args) => {

            if (typeof this.filedata === "undefined") {
                fs.readFile(path, (error, data) => {
                    let dataInFile = {};
                    if (!error) {
                        dataInFile = JSON.parse(data);
                    } else {
                        console.log(`${this.logPrepend}main encountered error '${error}' when trying to read file '${path}'.`);
                    }
                    this.filedata = dataInFile;

                    browserWindow.webContents.send(initialFileResponse, {
                        filedata: this.filedata
                    });
                });
            }
        });

        // Anytime the renderer process requests for a file read
        ipcMain.on(readConfigRequest, (IpcMainEvent, args) => {
            debug ? console.log(`${this.logPrepend}main received a request to read from the key '${args.key}' from the given file '${path}'.`) : null;

            fs.readFile(path, (error, data) => {
                let dataToRead = JSON.parse(args);
                this.filedata = dataToRead;

                debug ? console.log(`${this.logPrepend}main read the key '${args.key}' from file => '${dataToRead[args.key]}'.`) : null;
                browserWindow.webContents.send(readConfigResponse, {
                    key,
                    value: dataToRead[args.key]
                });
            });
        });

        // Anytime the renderer process requests for a file write
        ipcMain.on(writeConfigRequest, (IpcMainEvent, args) => {

            // Wrapper function; since we call
            // this twice below
            let writeToFile = function () {
                this.filedata[args.key] = args.value;
                let dataToWrite = JSON.stringify(this.filedata);
                fs.writeFile(path, dataToWrite, (error) => {
                    debug ? console.log(`${this.logPrepend}wrote to file '${path}' => '${dataToWrite}'.`) : null;
                    browserWindow.webContents.send(writeConfigResponse, {
                        success: !error,
                        key: args.key
                    });
                });
            }.bind(this);
            if (typeof this.filedata === "undefined") {
                fs.readFile(path, (error, data) => {
                    let dataInFile = {};
                    try {
                        if (typeof data !== "undefined") {
                            dataInFile = JSON.parse(data);
                        }
                    } catch (error) {
                        console.log(`${this.logPrepend}main encountered error '${error}' when trying to read file '${path}'.`);
                    }
                    this.filedata = dataInFile;

                    writeToFile();
                });
            } else {
                writeToFile();
            }
        });
    };
}