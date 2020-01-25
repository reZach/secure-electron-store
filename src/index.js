import { encode, decode } from "@msgpack/msgpack";
const crypto = require("crypto");
const path = require("path");

const defaultOptions = {
    debug: true,
    minify: true,
    encrypt: true,
    passcode: "",
    path: "",
    filename: "data",
    extension: ".json"
};

// Electron-specific; must match mainIpc
export const readConfigRequest = "ReadConfig-Request";
export const writeConfigRequest = "WriteConfig-Request";
export const readConfigResponse = "ReadConfig-Response";
export const writeConfigResponse = "WriteConfig-Response";

export default class Store {
    constructor(options) {
        this.options = defaultOptions;
        this.filedata = undefined;
        
        // encrypted-related variables
        this.iv = undefined;
        this.ivFile;
        
        // log-related variables
        const logPrepend = "[secure-electron-store:";
        this.mainLog = `${logPrepend}main]=>`;
        this.rendererLog = `${logPrepend}renderer]=>`;

        // Merge any options the user passed in
        if (typeof options !== "undefined") {
            this.options = Object.assign(this.options, options);
        }        

        // Only run the following code in the renderer
        // process; we can determine if this is the renderer
        // process if we haven't set a new path from our options
        if(typeof options === "undefined" || options.path !== defaultOptions.path){
            try {
                let arg = process.argv.filter(p => p.indexOf("storePath:") >= 0)[0];
                this.options.path = arg.substr(arg.indexOf(":") + 1);

                if (this.options.debug) console.log(`${this.rendererLog} initializing. Parsed 'storePath' value: '${this.options.path}'.`);
            } catch (error) {
                throw `Could not find property 'additionalArguments' value beginning with 'storePath:' in your BrowserWindow. Please ensure this is set! Error: ${error}`;
            }
        }
        
        this.ivFile = path.join(this.options.path, "iv.txt");
        this.options.path = path.join(this.options.path, `${this.options.filename}${this.options.extension}`);
        this.validSendChannels = [readConfigRequest, writeConfigRequest];
        this.validReceiveChannels = [readConfigResponse, writeConfigResponse];

        // Log that we finished initialization
        if (this.options.debug) {
            if (typeof process === "object"){
                console.log(`${this.rendererLog} initialized store. Data file: '${this.options.path}'.`);
            } else {
                console.log(`${this.mainLog} initialized store. Data file: '${this.options.path}'.`);
            }
        }
    }

    preloadBindings(ipcRenderer, fs) {
        const {
            minify,
            debug,
            path
        } = this.options;
        
        // Read the file synchronously so we have access
        // to it's contents right away 
        let initial;
        let dataInFile = {};
        try {
            initial = fs.readFileSync(path);

            if (typeof initial !== "undefined"){
                if (minify){
                    dataInFile = decode(initial);
                } else {
                    dataInFile = JSON.parse(initial);
                }
            }
        } catch (error) {
            console.error(`${this.rendererLog} encountered error '${error}' when trying to read file '${path}'. This file is probably corrupted, does not exist or is empty; defaulting file value to '{}'.`);

            dataInFile = {};
        }

        return {
            initial: dataInFile,
            path,
            send: (channel, key, value) => {
                if (this.validSendChannels.includes(channel)) {
                    if (channel === readConfigRequest) {
                        debug ? console.log(`${this.rendererLog} requesting to read key '${key}' from file.`) : null;

                        ipcRenderer.send(channel, {
                            key
                        });
                    } else if (channel === writeConfigRequest) {
                        debug ? console.log(`${this.rendererLog} requesting to write key:value to file => "'${key}':'${value}'".`) : null;

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
                                    console.log(`${this.rendererLog} received value for key '${args.key}' => '${args.value}'.`);
                                    break;
                                case writeConfigResponse:
                                    console.log(`${this.rendererLog} ${!args.success ? "un-" : ""}successfully wrote key '${args.key}' to file.`);
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
            minify,
            debug,
            encrypt,
            path
        } = this.options;

        const getIv = function(){
            console.warn("getIv");
            console.warn(this.iv);
            if (typeof this.iv !== "undefined"){
                return this.iv;
            }

            let rawIv;
            try {

                // Does file exist? Throws exception if does not exist
                fs.accessSync(this.ivFile);
                rawIv = fs.readFileSync(this.ivFile);
            } catch (error) {
                
                console.warn("file doesn't exist");
                // File does not exist, create file
                let randomBytes = crypto.randomBytes(32).toString("hex").slice(0, 16);
                rawIv = randomBytes;

                fs.writeFileSync(this.ivFile, randomBytes);
            }
            console.warn(rawIv);
            console.warn(typeof rawIv);

            this.iv = rawIv;
        }.bind(this);

        // Anytime the renderer process requests for a file read
        ipcMain.on(readConfigRequest, (IpcMainEvent, args) => {
            debug ? console.log(`${this.mainLog} received a request to read from the key '${args.key}' from the given file '${path}'.`) : null;

            fs.readFile(path, (error, data) => {
                if (error){
                    console.error(`${this.mainLog} encountered error '${error}' when trying to read key '${args.key}' from file '${path}'. This file is probably corrupted or the key does not exist.`);

                    browserWindow.webContents.send(readConfigResponse, {
                        success: false,
                        key,
                        value: undefined
                    });
                    return;
                }

                let dataToRead = data;

                if (encrypt){
                    getIv();
                    const decipher = crypto.createDecipheriv("aes-256-cbc", "abc", this.iv);
                    dataToRead = Buffer.concat([decipher.update(dataToRead), decipher.final()]);
                }

                if (minify){
                    dataToRead = decode(dataToRead);
                } else {
                    dataToRead = JSON.parse(dataToRead);
                }                
                this.filedata = dataToRead;

                debug ? console.log(`${this.mainLog} read the key '${args.key}' from file => '${dataToRead[args.key]}'.`) : null;
                browserWindow.webContents.send(readConfigResponse, {
                    success: true,
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
                let dataToWrite = this.filedata;

                if (minify){
                    dataToWrite = encode(dataToWrite);
                } else {
                    dataToWrite = JSON.stringify(dataToWrite);
                }

                if (encrypt){
                    getIv();
                    const cipher = crypto.createCipheriv("aes-256-cbc", "abc", this.iv);
                    dataToWrite = Buffer.concat([cipher.update(dataToWrite), cipher.final()]);
                }

                fs.writeFile(path, dataToWrite, (error) => {
                    debug ? console.log(`${this.mainLog} wrote "'${args.key}':'${args.value}'" to file '${path}'.`) : null;
                    browserWindow.webContents.send(writeConfigResponse, {
                        success: !error,
                        key: args.key
                    });
                });
            }.bind(this);


            // If we don't have any filedata saved yet,
            // let's pull out the latest data from file
            if (typeof this.filedata === "undefined") {
                fs.readFile(path, (error, data) => {
                    if (error){
                        console.error(`${this.mainLog} encountered error '${error}' when trying to read file '${path}'. This file is probably corrupted, does not exist or is empty; defaulting file value to '{}'.`);

                        this.filedata = {};
                        writeToFile();
                        return;
                    }

                    // Retreive file contents
                    let dataInFile = {};
                    try {
                        if (typeof data !== "undefined") {
                            if (minify){
                                dataInFile = decode(data);
                            } else {
                                dataInFile = JSON.parse(data);
                            }                            
                        }
                    } catch (error) {
                        console.error(`${this.mainLog} encountered error '${error}' when trying to read file '${path}'. This file is probably corrupted, does not exist or is empty; defaulting file value to '{}'.`);
                        
                        this.filedata = {};
                        writeToFile();
                        return;
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