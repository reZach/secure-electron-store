import { encode, decode } from "@msgpack/msgpack";
const crypto = require("crypto");
const path = require("path");

const defaultOptions = {
    debug: true,
    minify: true,
    encrypt: true,
    passkey: "",
    path: "",
    filename: "data",
    extension: ".json"
};

// Electron-specific; must match mainIpc
export const readConfigRequest = "ReadConfig-Request";
export const writeConfigRequest = "WriteConfig-Request";
export const readConfigResponse = "ReadConfig-Response";
export const writeConfigResponse = "WriteConfig-Response";
export const deleteConfigRequest = "DeleteConfig-Request";
export const deleteConfigResponse = "DeleteConfig-Response";
const savePasskeyRequest = "SavePasskey-Request";
const savePasskeyResponse = "SavePasskey-Response";

// Useful
const generateIv = function(){
    return crypto.randomBytes(32).toString("hex").slice(0, 16);
}

export default class Store {
    constructor(options) {
        this.options = defaultOptions;
        this.fileData = undefined;
        this.initialFileData = undefined;
        this.initialFileDataParsed = false;
        
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
        this.validSendChannels = [readConfigRequest, writeConfigRequest, savePasskeyRequest, deleteConfigRequest];
        this.validReceiveChannels = [readConfigResponse, writeConfigResponse, savePasskeyResponse, deleteConfigResponse];

        // Log that we finished initialization
        if (this.options.debug) {
            if (typeof process === "object"){
                console.log(`${this.rendererLog} initialized store. Data file: '${this.options.path}'.`);
            } else {
                console.log(`${this.mainLog} initialized store. Data file: '${this.options.path}'.`);
            }
        }
    }

    // Gets the IV value; or optionally creates
    // a new one if it does not already exist
    getIv(fs){
        if (typeof this.iv !== "undefined"){
            return true;
        }
    
        let rawIv;
        try {
    
            // Does file exist? Throws exception if does not exist
            fs.accessSync(this.ivFile);
            rawIv = fs.readFileSync(this.ivFile);
        } catch (error) {
            
            // File does not exist, create file
            let randomBytes = generateIv();
            rawIv = randomBytes;
    
            fs.writeFileSync(this.ivFile, randomBytes);
        }
    
        this.iv = rawIv;
    }

    preloadBindings(ipcRenderer, fs) {
        const {
            minify,
            debug,
            encrypt,
            path
        } = this.options;
        
        // Initially read the file contents,
        // but do not decrypt/unminify until we
        // try to access it. This gives the user
        // the chance to enter a passkey if they've
        // chosen to protect their configs with a passkey
        try {
            this.initialFileData = fs.readFileSync(path);
        } catch (error) {
            console.error(`${this.rendererLog} encountered error '${error}' when trying to read file '${path}'. This file is probably corrupted, does not exist or is empty; defaulting file value to '{}'.`);
        }

        return {
            path,
            setPasskey: (passkey) => {
                this.options.passkey = passkey;

                ipcRenderer.send(savePasskeyRequest, {
                    passkey
                });
            },
            initial: () => {
                if (this.initialFileDataParsed){
                    return this.initialFileData;
                }

                if (typeof this.initialFileData !== "undefined"){
                    debug ? console.log(`${this.rendererLog} reading data from file '${path}' into the 'initial' property.`) : null;

                    try {
                        if (encrypt){
                            this.getIv(fs);
    
                            const decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest
                            ("base64").substr(0, 32), this.iv);
                            this.initialFileData = Buffer.concat([decipher.update(this.initialFileData), decipher.final()]);
                        }
        
                        if (minify){
                            this.initialFileData = decode(this.initialFileData);
                        } else {
                            this.initialFileData = JSON.parse(this.initialFileData);
                        }
                    } catch (error) {
                        console.error(`${this.rendererLog} encountered error '${error}' when trying to read file '${path}'. This file is probably corrupted, does not exist or is empty; defaulting file value to '{}'.`);

                        this.initialFileData = {};
                    }
                } else {
                    
                    // If we get into this block, we must have had an error reading
                    // the data file
                    this.initialFileData = {};
                }
                this.initialFileDataParsed = true;

                return this.initialFileData;
            },
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

        // WARNING - HARD RESET IV & DATA FILES
        ipcMain.on(deleteConfigRequest, (IpcMainEvent, args) => {
            debug ? console.log(`${this.mainLog} received a request to delete data files.`) : null;

            let success = true;
            try {
                fs.writeFileSync(path, "{}");
                fs.writeFileSync(this.ivFile, generateIv());
            } catch (error) {                
                console.error(`${this.mainLog} failed to reset data due to error: '${error}'.`);
                success = false;
            }

            browserWindow.webContents.send(deleteConfigResponse, {
                success
            });
        });

        // When the renderer processes has updated the passkey.
        // The main process has no access to the passkey, since
        // it's intended that the passkey be passed in via the renderer
        // process
        ipcMain.on(savePasskeyRequest, (IpcMainEvent, args) => {
            debug ? console.log(`${this.mainLog} received a request to update the passkey to '${args.passkey}'.`) : null;

            this.options.passkey = args.passkey;

            // Redundant, but may be helpful?
            browserWindow.webContents.send(savePasskeyResponse, {
                success: true
            });
        });

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
                    this.getIv(fs);

                    const decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest("base64").substr(0, 32), this.iv);
                    dataToRead = Buffer.concat([decipher.update(dataToRead), decipher.final()]);
                }

                if (minify){
                    dataToRead = decode(dataToRead);
                } else {
                    dataToRead = JSON.parse(dataToRead);
                }                
                this.fileData = dataToRead;

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
                this.fileData[args.key] = args.value;
                let dataToWrite = this.fileData;

                if (minify){
                    dataToWrite = encode(dataToWrite);
                } else {
                    dataToWrite = JSON.stringify(dataToWrite);
                }

                if (encrypt){
                    this.getIv();

                    const cipher = crypto.createCipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest("base64").substr(0, 32), this.iv);
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
            if (typeof this.fileData === "undefined") {
                fs.readFile(path, (error, data) => {
                    if (error){
                        console.error(`${this.mainLog} encountered error '${error}' when trying to read file '${path}'. This file is probably corrupted, does not exist or is empty; defaulting file value to '{}'.`);

                        this.fileData = {};
                        writeToFile();
                        return;
                    }

                    // Retrieve file contents
                    let dataInFile = data;
                    try {
                        if (typeof data !== "undefined") {
                            if (encrypt){
                                this.getIv(fs);
            
                                const decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest("base64").substr(0, 32), this.iv);
                                dataInFile = Buffer.concat([decipher.update(dataInFile), decipher.final()]);
                            }

                            if (minify){
                                dataInFile = decode(dataInFile);
                            } else {
                                dataInFile = JSON.parse(dataInFile);
                            }                            
                        }
                    } catch (error) {
                        console.error(`${this.mainLog} encountered error '${error}' when trying to read file '${path}'. This file is probably corrupted, does not exist or is empty; defaulting file value to '{}'.`);
                        
                        this.fileData = {};
                        writeToFile();
                        return;
                    }

                    this.fileData = dataInFile;
                    writeToFile();
                });
            } else {
                writeToFile();
            }
        });
    };
}