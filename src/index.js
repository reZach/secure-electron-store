import {
    Encoder,
    Decoder
} from "@msgpack/msgpack";
const crypto = require("crypto");
const pathModule = require("path");

// Faster than using 'encode' or 'decode' from @msgpack/msgpack
const encoder = new Encoder();
const decoder = new Decoder();

const defaultOptions = {
    debug: false,
    minify: true,
    encrypt: true,
    passkey: "",
    path: "",
    unprotectedPath: "",
    filename: "data",
    unprotectedFilename: "unprotected",
    extension: ".json",
    reset: false
};

// Electron-specific; must match mainIpc
export const readConfigRequest = "ReadConfig-Request";
export const readConfigResponse = "ReadConfig-Response";
export const readUnprotectedConfigRequest = "ReadUnprotectedConfig-Request";
export const readUnprotectedConfigResponse = "ReadUnprotectedConfig-Response";
export const writeConfigRequest = "WriteConfig-Request";
export const writeConfigResponse = "WriteConfig-Response";
export const writeUnprotectedConfigRequest = "WriteUnprotectedConfig-Request";
export const writeUnprotectedConfigResponse = "WriteUnprotectedConfig-Response";
export const deleteConfigRequest = "DeleteConfig-Request";
export const deleteConfigResponse = "DeleteConfig-Response";
export const deleteUnprotectedConfigRequest = "DeleteUnprotectedConfig-Request";
export const deleteUnprotectedConfigResponse = "DeleteUnprotectedConfig-Response";
export const savePasskeyRequest = "SavePasskey-Request";
export const savePasskeyResponse = "SavePasskey-Response";
export const useConfigInMainRequest = "UseConfigInMain-Request";
export const useConfigInMainResponse = "UseConfigInMain-Response";
export const useUnprotectedConfigInMainRequest = "UseUnprotectedConfigInMain-Request";
export const useUnprotectedConfigInMainResponse = "UseUnprotectedConfigInMain-Response";

// Useful
const generateIv = function () {
    return crypto.randomBytes(32).toString("hex").slice(0, 16);
}

export default class Store {
    constructor(options) {
        this.options = defaultOptions;
        this.fileData = undefined;
        this.initialFileData = undefined;
        this.initialFileDataParsed = false;
        this.unprotectedFileData = undefined;
        this.initialUnprotectedFileData = undefined;
        this.initialUnprotectedFileDataParsed = false;

        // encrypted-related variables
        this.iv = undefined;

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
        if (typeof options === "undefined" || options.path !== defaultOptions.path) {
            try {
                const arg = process.argv.filter(p => p.indexOf("--storePath=") >= 0)[0];
                this.options.path = arg.substr(arg.indexOf("=") + 1);
                this.options.path = this.options.path.replaceAll("||", "\\"); // As of Electron v14, passing "\" doesn't work in additionalArguments. We have to replace our token "||" with "\" to maintain functionality                

                if (this.options.debug) console.log(`${this.rendererLog} initializing. Parsed 'storePath' value: '${this.options.path}'.`);
            } catch (error) {
                throw new Error(`Could not find property 'additionalArguments' value beginning with 'storePath:' in your BrowserWindow. Please ensure this is set! Error: ${error}`);
            }
        }

        const rootPath = this.options.path;
        this.ivFile = pathModule.join(rootPath, "iv.txt");
        this.options.path = pathModule.join(rootPath, `${this.options.filename}${this.options.extension}`);
        this.options.unprotectedPath = pathModule.join(this.options.unprotectedPath.length === 0 ? rootPath : this.options.unprotectedPath, `${this.options.unprotectedFilename}${this.options.extension}`);
        this.validSendChannels = [readConfigRequest, readUnprotectedConfigRequest, writeConfigRequest, writeUnprotectedConfigRequest, savePasskeyRequest, deleteConfigRequest, deleteUnprotectedConfigRequest, useConfigInMainRequest, useUnprotectedConfigInMainRequest];
        this.validReceiveChannels = [readConfigResponse, readUnprotectedConfigResponse, writeConfigResponse, writeUnprotectedConfigResponse, savePasskeyResponse, deleteConfigResponse, deleteUnprotectedConfigResponse, useConfigInMainResponse, useUnprotectedConfigInMainResponse];

        // Log that we finished initialization
        if (this.options.debug) {
            if (typeof process === "object" && process.argv.filter(p => p.indexOf("electron") >= 0).length === 0) {
                console.log(`${this.rendererLog} initialized store. Data file: '${this.options.path}'.`);
            } else {
                console.log(`${this.mainLog} initialized store. Data file: '${this.options.path}'.`);
            }
        }
    }

    // Gets the IV value; or optionally creates
    // a new one if it does not already exist
    getIv(fs) {
        if (typeof this.iv !== "undefined") {
            return true;
        }

        let rawIv;
        try {
            rawIv = fs.readFileSync(this.ivFile);
        } catch (error) {

            const randomBytes = generateIv();
            rawIv = randomBytes;
            // File does not exist; create it
            if (error.code !== "ENOENT") {

                // Handle better!
                if (debug) {
                    console.warn(error);
                }
            }

            fs.writeFileSync(this.ivFile, randomBytes);
        }

        this.iv = rawIv;
    }

    preloadBindings(ipcRenderer, fs) {
        const {
            minify,
            debug,
            encrypt,
            path,
            unprotectedPath
        } = this.options;

        // Initially read the file contents,
        // but do not decrypt/unminify until we
        // try to access it. This gives the user
        // the chance to enter a passkey if they've
        // chosen to protect their configs with a passkey
        try {
            this.initialFileData = fs.readFileSync(path);
        } catch (error) {

            // File does not exist, so let's create a file
            // and give it an empty/default value
            if (error.code === "ENOENT") {
                let defaultData = {};

                // We minify/ optional encrypt this default object here
                // so that when we read the data later, everything works as expected
                if (minify) {
                    defaultData = encoder.encode(defaultData);
                } else {
                    defaultData = JSON.stringify(defaultData);
                }

                if (encrypt) {
                    this.getIv(fs);

                    const cipher = crypto.createCipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest("base64").substr(0, 32), this.iv);
                    defaultData = Buffer.concat([cipher.update(defaultData), cipher.final()]);
                }

                this.initialFileData = {};
                this.initialFileDataParsed = true;
                fs.writeFileSync(path, defaultData);
            } else {
                throw new Error(`${this.rendererLog} encountered error '${error}' when trying to read file '${path}'. This file is probably corrupted. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
            }
        }

        // Do the same for the unprotected file, sans
        // any unencryption
        try {
            this.initialUnprotectedFileData = fs.readFileSync(unprotectedPath);
        } catch (error) {

            // File does not exist, so let's create a file
            // and give it an empty/default value
            if (error.code === "ENOENT") {
                let defaultData = {};

                // We minify/ optional encrypt this default object here
                // so that when we read the data later, everything works as expected
                if (minify) {
                    defaultData = encoder.encode(defaultData);
                } else {
                    defaultData = JSON.stringify(defaultData);
                }

                this.initialUnprotectedFileData = {};
                this.initialUnprotectedFileDataParsed = true;
                fs.writeFileSync(unprotectedPath, defaultData);
            } else {
                throw new Error(`${this.rendererLog} encountered error '${error}' when trying to read file '${unprotectedPath}'. This file is probably corrupted. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
            }
        }

        return {
            path,
            unprotectedPath,
            setPasskey: (passkey) => {
                this.options.passkey = passkey;

                ipcRenderer.send(savePasskeyRequest, {
                    passkey
                });
            },
            initial: () => {
                if (this.initialFileDataParsed) {
                    return this.initialFileData;
                }

                if (debug) {
                    console.log(`${this.rendererLog} reading data from file '${path}' into the 'initial' property.`);
                }

                try {
                    if (encrypt) {
                        this.getIv(fs);

                        const decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest("base64").substr(0, 32), this.iv);
                        this.initialFileData = Buffer.concat([decipher.update(this.initialFileData), decipher.final()]);
                    }

                    if (minify) {
                        this.initialFileData = decoder.decode(this.initialFileData);
                    } else {
                        this.initialFileData = JSON.parse(this.initialFileData);
                    }
                } catch (error) {
                    throw new Error(`${this.rendererLog} encountered error '${error}' when trying to read file '${path}'. This file is probably corrupted or has been tampered with. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
                }
                this.initialFileDataParsed = true;

                return this.initialFileData;
            },
            initialUnprotected: () => {
                if (this.initialUnprotectedFileDataParsed) {
                    return this.initialUnprotectedFileData;
                }

                if (debug) {
                    console.log(`${this.rendererLog} reading data from file '${unprotectedPath}' into the 'initial' property.`);
                }

                try {
                    if (minify) {
                        this.initialUnprotectedFileData = decoder.decode(this.initialUnprotectedFileData);
                    } else {
                        this.initialUnprotectedFileData = JSON.parse(this.initialUnprotectedFileData);
                    }
                } catch (error) {
                    throw new Error(`${this.rendererLog} encountered error '${error}' when trying to read file '${unprotectedPath}'. This file is probably corrupted or has been tampered with. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
                }
                this.initialUnprotectedFileDataParsed = true;

                return this.initialUnprotectedFileData;
            },
            send: (channel, key, value) => {
                if (this.validSendChannels.includes(channel)) {
                    switch (channel) {
                        case readConfigRequest:
                            if (debug) {
                                console.log(`${this.rendererLog} requesting to read key '${key}' from file.`);
                            }

                            ipcRenderer.send(channel, {
                                key
                            });
                            break;
                        case writeConfigRequest:
                            if (debug) {
                                console.log(`${this.rendererLog} requesting to write key:value to file => "'${key}':'${value}'".`);
                            }

                            ipcRenderer.send(channel, {
                                key,
                                value
                            });
                            break;
                        case savePasskeyRequest:
                            if (debug) {
                                console.log(`${this.rendererLog} requesting to save passkey '${key}' to file.`);
                            }

                            ipcRenderer.send(channel, {
                                key,
                            });
                            break;
                        case deleteConfigRequest:
                            if (debug) {
                                console.log(`${this.rendererLog} requesting to delete file.`);
                            }

                            ipcRenderer.send(channel, {});
                            break;
                        case useConfigInMainRequest:
                            if (debug) {
                                console.log(`${this.rendererLog} requesting to use store in electron main process.`);
                            }

                            ipcRenderer.send(channel, {});
                            break;
                        case readUnprotectedConfigRequest:
                            if (debug) {
                                console.log(`${this.rendererLog} requesting to read key '${key}' from unprotected file.`);
                            }

                            ipcRenderer.send(channel, {
                                key
                            });
                            break;
                        case writeUnprotectedConfigRequest:
                            if (debug) {
                                console.log(`${this.rendererLog} requesting to write key:value to unprotected file => "'${key}':'${value}'".`);
                            }

                            ipcRenderer.send(channel, {
                                key,
                                value
                            });
                            break;
                        case deleteUnprotectedConfigRequest:
                            if (debug) {
                                console.log(`${this.rendererLog} requesting to delete unprotected file.`);
                            }

                            ipcRenderer.send(channel, {});
                            break;
                        case useUnprotectedConfigInMainRequest:
                            if (debug) {
                                console.log(`${this.rendererLog} requesting to use unprotected store in electron main process.`);
                            }

                            ipcRenderer.send(channel, {});
                            break;
                        default:
                            break;
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
                                case savePasskeyResponse:
                                    console.log(`${this.rendererLog} ${!args.success ? "un-" : ""}successfully saved passkey.`);
                                    break;
                                case deleteConfigResponse:
                                    console.log(`${this.rendererLog} ${!args.success ? "un-" : ""}successfully deleted file.`);
                                    break;
                                case useConfigInMainResponse:
                                    console.log(`${this.rendererLog} ${!args.success ? "un-" : ""}successfully read store in electron main process.`);
                                    break;
                                case readUnprotectedConfigResponse:
                                    console.log(`${this.rendererLog} received unprotected value for key '${args.key}' => '${args.value}'.`);
                                    break;
                                case writeUnprotectedConfigResponse:
                                    console.log(`${this.rendererLog} ${!args.success ? "un-" : ""}successfully wrote unprotected key '${args.key}' to file.`);
                                    break;
                                case deleteUnprotectedConfigResponse:
                                    console.log(`${this.rendererLog} ${!args.success ? "un-" : ""}successfully deleted unprotected file.`);
                                    break;
                                case useUnprotectedConfigInMainResponse:
                                    console.log(`${this.rendererLog} ${!args.success ? "un-" : ""}successfully read unprotected store in electron main process.`);
                                    break;
                                default:
                                    break;
                            }
                        }

                        // Need to reset iv if we successfully delete files
                        if (channel === deleteConfigResponse && args.success) {
                            this.iv = undefined;
                        }

                        func(args);
                    });
                }
            },
            clearRendererBindings: () => {
                // Clears all listeners
                if (debug) {
                    console.log(`${this.rendererLog} clearing all ipcRenderer listeners.`);
                }

                for (let validChannel of this.validReceiveChannels){
                    ipcRenderer.removeAllListeners(validChannel);
                }
            }
        };
    }

    mainBindings(ipcMain, browserWindow, fs, mainProcessCallback = undefined, unprotectedMainProcessCallback = undefined) {
        const {
            minify,
            debug,
            encrypt,
            path,
            unprotectedPath,
            reset
        } = this.options;

        // Clears and deletes each file; useful if the files have been tampered
        // with or if the electron app wants a fresh config file
        const resetFiles = function () {

            // Possibly more secure(?), deleting contents in file before removal
            if (debug) {
                console.log(`${this.mainLog} clearing data files.`);
            }
            fs.writeFileSync(path, "");
            fs.writeFileSync(this.ivFile, "");

            // Delete file
            if (debug) {
                console.log(`${this.mainLog} unlinking data files.`);
            }
            fs.unlinkSync(path);
            fs.unlinkSync(this.ivFile);

            // Reset cached file data
            if (debug) {
                console.log(`${this.mainLog} clearing local variables.`);
            }
            this.iv = undefined;
            this.fileData = undefined;
        }.bind(this);

        const resetUnprotectedFiles = function () {

            // Possibly more secure(?), deleting contents in file before removal
            if (debug) {
                console.log(`${this.mainLog} clearing unprotected data files.`);
            }
            fs.writeFileSync(unprotectedPath, "");

            // Delete file
            if (debug) {
                console.log(`${this.mainLog} unlinking unprotected data files.`);
            }
            fs.unlinkSync(unprotectedPath);

            // Reset cached file data
            if (debug) {
                console.log(`${this.mainLog} clearing local variables.`);
            }
            this.unprotectedFileData = undefined;
        }.bind(this);

        if (reset) {
            if (debug) {
                console.log(`${this.mainLog} resetting all files because property "reset" was set to true when configuring the store.`);
            }

            try {
                resetFiles();
            } catch (error) {
                throw new Error(`${this.mainLog} could not reset files, please resolve error '${error}' and try again.`);
            }
        }

        // Deletes IV/data files if requested
        ipcMain.on(deleteConfigRequest, (IpcMainEvent, args) => {
            if (debug) {
                console.log(`${this.mainLog} received a request to delete data files.`);
            }

            let success = true;
            try {
                resetFiles();
            } catch (error) {
                console.error(`${this.mainLog} failed to reset data due to error: '${error}'. Please resolve this error and try again.`);
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
        ipcMain.on(savePasskeyRequest, (_IpcMainEvent, args) => {
            if (debug) {
                console.log(`${this.mainLog} received a request to update the passkey to '${args.key}'.`);
            }

            this.options.passkey = args.key;

            // Redundant, but may be helpful?
            browserWindow.webContents.send(savePasskeyResponse, {
                success: true
            });
        });

        // Anytime the renderer process requests for a file read
        ipcMain.on(readConfigRequest, (_IpcMainEvent, args) => {
            if (debug) {
                console.log(`${this.mainLog} received a request to read from the key '${args.key}' from the given file '${path}'.`);
            }

            fs.readFile(path, (error, data) => {

                if (error) {

                    // File does not exist, so let's create a file
                    // and give it an empty/default value
                    if (error.code === "ENOENT") {
                        if (debug) {
                            console.log(`${this.mainLog} did not find data file when trying read the key '${args.key}'. Creating an empty data file.`);
                        }

                        let defaultData = {};

                        // We minify/ optional encrypt this default object here
                        // so that when we read the data later, everything works as expected
                        if (minify) {
                            defaultData = decoder.decode(defaultData);
                        } else {
                            defaultData = JSON.parse(defaultData);
                        }

                        if (encrypt) {
                            this.getIv(fs);

                            const cipher = crypto.createCipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest("base64").substr(0, 32), this.iv);
                            defaultData = Buffer.concat([cipher.update(defaultData), cipher.final()]);
                        }

                        fs.writeFileSync(path, defaultData);
                        browserWindow.webContents.send(readConfigResponse, {
                            success: false,
                            key: args.key,
                            value: undefined
                        });
                        return;
                    } else {
                        throw new Error(`${this.mainLog} encountered error '${error}' when trying to read file '${path}'. This file is probably corrupted. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
                    }
                }

                let dataToRead = data;

                try {
                    if (encrypt) {
                        this.getIv(fs);

                        const decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest("base64").substr(0, 32), this.iv);
                        dataToRead = Buffer.concat([decipher.update(dataToRead), decipher.final()]);
                    }

                    if (minify) {
                        dataToRead = decoder.decode(dataToRead);
                    } else {
                        dataToRead = JSON.parse(dataToRead);
                    }
                } catch (error2) {
                    throw new Error(`${this.mainLog} encountered error '${error2}' when trying to read file '${path}'. This file is probably corrupted or has been tampered with. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
                }

                this.fileData = dataToRead;

                if (debug) {
                    console.log(`${this.mainLog} read the key '${args.key}' from file => '${dataToRead[args.key]}'.`);
                }
                browserWindow.webContents.send(readConfigResponse, {
                    success: true,
                    key: args.key,
                    value: dataToRead[args.key]
                });
            });
        });

        // Anytime the renderer process requests for a file write
        ipcMain.on(writeConfigRequest, (_IpcMainEvent, args) => {

            // Wrapper function; since we call
            // this twice below
            const writeToFile = function () {
                if (typeof args.key !== "undefined" && typeof args.value !== "undefined") {
                    this.fileData[args.key] = args.value;
                }

                let dataToWrite = this.fileData;

                try {
                    if (minify) {
                        dataToWrite = encoder.encode(dataToWrite);
                    } else {
                        dataToWrite = JSON.stringify(dataToWrite);
                    }

                    if (encrypt) {
                        this.getIv(fs);

                        const cipher = crypto.createCipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest("base64").substr(0, 32), this.iv);
                        dataToWrite = Buffer.concat([cipher.update(dataToWrite), cipher.final()]);
                    }
                } catch (error) {
                    throw new Error(`${this.mainLog} encountered error '${error}' when trying to write file '${path}'.`);
                }

                fs.writeFile(path, dataToWrite, (error) => {
                    if (debug) {
                        console.log(`${this.mainLog} wrote "'${args.key}':'${args.value}'" to file '${path}'.`);
                    }
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

                    if (error) {

                        // File does not exist, so let's create a file
                        // and give it an empty/default value
                        if (error.code === "ENOENT") {
                            this.fileData = {};

                            writeToFile();
                            return;
                        } else {
                            throw new Error(`${this.mainLog} encountered error '${error}' when trying to read file '${path}'. This file is probably corrupted. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
                        }
                    }

                    // Retrieve file contents
                    let dataInFile = data;
                    try {
                        if (typeof data !== "undefined") {
                            if (encrypt) {
                                this.getIv(fs);

                                const decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest("base64").substr(0, 32), this.iv);
                                dataInFile = Buffer.concat([decipher.update(dataInFile), decipher.final()]);
                            }

                            if (minify) {
                                dataInFile = decoder.decode(dataInFile);
                            } else {
                                dataInFile = JSON.parse(dataInFile);
                            }
                        }
                    } catch (error2) {
                        throw new Error(`${this.mainLog} encountered error '${error2}' when trying to read file '${path}'. This file is probably corrupted. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
                    }

                    this.fileData = dataInFile;
                    writeToFile();
                });
            } else {
                writeToFile();
            }
        });

        // Anytime the main process needs to use the store        
        ipcMain.on(useConfigInMainRequest, (_IpcMainEvent, _args) => {
            if (debug) {
                console.log(`${this.mainLog} received a request to read store in electron main process.`);
            }

            // If user would like to use store values in main electron process,
            // the user can request that a callback be ran in the main electron process
            // when the "useConfigInMainRequest" request is received

            // Be sure your "mainProcessCallback" function is defined as "const"
            // in your main process, otherwise the reference will be GC'd and
            // this callback will never happen
            if (typeof mainProcessCallback !== "undefined") {

                let dataInFile = {};
                fs.readFile(path, (error, data) => {

                    if (error) {

                        // File does not exist, so let's create a file
                        // and give it an empty/default value
                        if (error.code === "ENOENT") {
                            if (debug) {
                                console.log(`${this.mainLog} did not find data file when trying read the data file from the main electron process.`);
                            }

                            mainProcessCallback(false, dataInFile);

                            browserWindow.webContents.send(useConfigInMainResponse, {
                                success: false
                            });
                            return;
                        }
                    }

                    dataInFile = data;

                    try {
                        if (encrypt) {
                            this.getIv(fs);

                            const decipher = crypto.createDecipheriv("aes-256-cbc", crypto.createHash("sha512").update(this.options.passkey).digest("base64").substr(0, 32), this.iv);
                            dataInFile = Buffer.concat([decipher.update(dataInFile), decipher.final()]);
                        }

                        if (minify) {
                            dataInFile = decoder.decode(dataInFile);
                        } else {
                            dataInFile = JSON.parse(dataInFile);
                        }
                    } catch (error2) {
                        throw new Error(`${this.mainLog} encountered error '${error2}' when trying to read file '${path}'. This file is probably corrupted or has been tampered with. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
                    }

                    if (debug) {
                        console.log(`${this.mainLog} read the store from the electron main process successfully.`);
                    }

                    mainProcessCallback(true, dataInFile);
                    browserWindow.webContents.send(useConfigInMainResponse, {
                        success: true
                    });
                });
            } else {
                throw new Error(`${this.mainLog} failed to take action when receiving a request to use the store in the main electron process. This has occurred because your mainProcessCallback callback is undefined, please ensure your callback is "const" so it is not garbage collected - this is the most likely reason for your error`);
            }
        });

        // Deletes [unprotected] data files if requested
        ipcMain.on(deleteUnprotectedConfigRequest, (_IpcMainEvent, _args) => {
            if (debug) {
                console.log(`${this.mainLog} received a request to delete unprotected data files.`);
            }

            let success = true;
            try {
                resetUnprotectedFiles();
            } catch (error) {
                console.error(`${this.mainLog} failed to reset unprotected data due to error: '${error}'. Please resolve this error and try again.`);
                success = false;
            }

            browserWindow.webContents.send(deleteUnprotectedConfigResponse, {
                success
            });
        });

        // Anytime the renderer process requests for an unprotected file read
        ipcMain.on(readUnprotectedConfigRequest, (_IpcMainEvent, args) => {
            if (debug) {
                console.log(`${this.mainLog} received a request to read from the key '${args.key}' from the given unprotected file '${unprotectedPath}'.`);
            }

            fs.readFile(unprotectedPath, (error, data) => {

                if (error) {

                    // File does not exist, so let's create a file
                    // and give it an empty/default value
                    if (error.code === "ENOENT") {
                        if (debug) {
                            console.log(`${this.mainLog} did not find unprotected data file when trying read the key '${args.key}'. Creating an empty unprotected data file.`);
                        }

                        const defaultData = JSON.stringify({});

                        fs.writeFileSync(unprotectedPath, defaultData);
                        browserWindow.webContents.send(readUnprotectedConfigResponse, {
                            success: false,
                            key: args.key,
                            value: undefined
                        });
                        return;
                    } else {
                        throw new Error(`${this.mainLog} encountered error '${error}' when trying to read unprotected file '${unprotectedPath}'. This file is probably corrupted. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
                    }
                }

                let dataToRead = data;

                try {
                    dataToRead = JSON.parse(dataToRead);
                } catch (error2) {
                    throw new Error(`${this.mainLog} encountered error '${error2}' when trying to read unprotected file '${unprotectedPath}'. This file is probably corrupted or has been tampered with. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
                }

                this.unprotectedFileData = dataToRead;

                if (debug) {
                    console.log(`${this.mainLog} read the key '${args.key}' from unprotected file => '${dataToRead[args.key]}'.`);
                }
                browserWindow.webContents.send(readUnprotectedConfigResponse, {
                    success: true,
                    key: args.key,
                    value: dataToRead[args.key]
                });
            });
        });

        // Anytime the renderer process requests for an unprotected file write
        ipcMain.on(writeUnprotectedConfigRequest, (_IpcMainEvent, args) => {

            // Wrapper function; since we call
            // this twice below
            const writeToFile = function () {
                if (typeof args.key !== "undefined" && typeof args.value !== "undefined") {
                    this.unprotectedFileData[args.key] = args.value;
                }

                let dataToWrite = this.unprotectedFileData;

                try {
                    dataToWrite = JSON.stringify(dataToWrite);
                } catch (error) {
                    throw new Error(`${this.mainLog} encountered error '${error}' when trying to write unprotected file '${unprotectedPath}'.`);
                }

                fs.writeFile(unprotectedPath, dataToWrite, (error) => {
                    if (debug) {
                        console.log(`${this.mainLog} wrote "'${args.key}':'${args.value}'" to file '${unprotectedPath}'.`);
                    }
                    browserWindow.webContents.send(writeUnprotectedConfigResponse, {
                        success: !error,
                        key: args.key
                    });
                });
            }.bind(this);


            // If we don't have any filedata saved yet,
            // let's pull out the latest data from file
            if (typeof this.unprotectedFileData === "undefined") {
                fs.readFile(unprotectedPath, (error, data) => {

                    if (error) {

                        // File does not exist, so let's create a file
                        // and give it an empty/default value
                        if (error.code === "ENOENT") {
                            this.unprotectedFileData = {};

                            writeToFile();
                            return;
                        } else {
                            throw new Error(`${this.mainLog} encountered error '${error}' when trying to read unprotected file '${unprotectedPath}'. This file is probably corrupted. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
                        }
                    }

                    // Retrieve file contents
                    let dataInFile = data;
                    try {
                        if (typeof data !== "undefined") {
                            dataInFile = JSON.parse(dataInFile);
                        }
                    } catch (error2) {
                        throw new Error(`${this.mainLog} encountered error '${error2}' when trying to read unprotected file '${path}'. This file is probably corrupted. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
                    }

                    this.unprotectedFileData = dataInFile;
                    writeToFile();
                });
            } else {
                writeToFile();
            }
        });

        // Anytime the main process needs to use the store        
        ipcMain.on(useUnprotectedConfigInMainRequest, (_IpcMainEvent, _args) => {
            if (debug) {
                console.log(`${this.mainLog} received a request to read unprotected store in electron main process.`);
            }

            // If user would like to use unprotected store values in main electron process,
            // the user can request that a callback be ran in the main electron process
            // when the "useUnprotectedConfigInMainRequest" request is received

            // Be sure your "unprotectedMainProcessCallback" function is defined as "const"
            // in your main process, otherwise the reference will be GC'd and
            // this callback will never happen
            if (typeof unprotectedMainProcessCallback !== "undefined") {

                let dataInFile = {};
                fs.readFile(unprotectedPath, (error, data) => {

                    if (error) {

                        // File does not exist, so let's create a file
                        // and give it an empty/default value
                        if (error.code === "ENOENT") {
                            if (debug) {
                                console.log(`${this.mainLog} did not find unprotected data file when trying read the unprotected data file from the main electron process.`);
                            }

                            unprotectedMainProcessCallback(false, dataInFile);

                            browserWindow.webContents.send(useUnprotectedConfigInMainResponse, {
                                success: false
                            });
                            return;
                        }
                    }

                    dataInFile = data;

                    try {
                        dataInFile = JSON.parse(dataInFile);
                    } catch (error2) {
                        throw new Error(`${this.mainLog} encountered error '${error2}' when trying to read unprotected file '${path}'. This file is probably corrupted or has been tampered with. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
                    }

                    if (debug) {
                        console.log(`${this.mainLog} read the unprotected store from the electron main process successfully.`);
                    }

                    unprotectedMainProcessCallback(true, dataInFile);
                    browserWindow.webContents.send(useUnprotectedConfigInMainResponse, {
                        success: true
                    });
                });
            } else {
                throw new Error(`${this.mainLog} failed to take action when receiving a request to use the unprotected store in the main electron process. This has occurred because your unprotectedMainProcessCallback callback is undefined, please ensure your callback is "const" so it is not garbage collected - this is the most likely reason for your error`);
            }
        });
    }

    mainInitialStore(fs) {
        const {
            debug,
            unprotectedPath
        } = this.options;

        let data;
        try {
            data = fs.readFileSync(unprotectedPath);
        } catch (error) {

            // Unprotected file does not exist, so let's create a file
            // and give it an empty/default value
            if (error.code === "ENOENT") {
                if (debug) {
                    console.log(`${this.mainLog} did not find unprotected data file when trying read '${unprotectedPath}'. Creating an empty data file.`);
                }

                const defaultData = JSON.stringify({});

                fs.writeFileSync(unprotectedPath, defaultData);
                return {};
            } else {
                throw new Error(`${this.mainLog} encountered error '${error}' when trying to read unprotected file '${unprotectedPath}'. This file is probably corrupted. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
            }
        }

        let dataToRead = data;

        try {
            dataToRead = JSON.parse(dataToRead);
        } catch (error2) {
            throw new Error(`${this.mainLog} encountered error '${error2}' when trying to read unprotected file '${unprotectedPath}'. This file is probably corrupted or has been tampered with. To fix this error, you may set "reset" to true in the options in your main process where you configure your store, or you can turn off your app, delete (recommended) or fix this file and restart your app to fix this issue.`);
        }

        return dataToRead;
    }

    // Clears ipcMain bindings;
    // mainly intended to be used within Mac-OS
    clearMainBindings(ipcMain) {
        ipcMain.removeAllListeners(readConfigRequest);
        ipcMain.removeAllListeners(writeConfigRequest);
        ipcMain.removeAllListeners(deleteConfigRequest);
        ipcMain.removeAllListeners(savePasskeyRequest);
        ipcMain.removeAllListeners(useConfigInMainRequest);
        ipcMain.removeAllListeners(readUnprotectedConfigRequest);
        ipcMain.removeAllListeners(writeUnprotectedConfigRequest);
        ipcMain.removeAllListeners(deleteUnprotectedConfigRequest);
        ipcMain.removeAllListeners(useUnprotectedConfigInMainRequest);
    }

    // Santizes path due to Electron upgrade (v14 and onwards) that
    // broke passing "\" characters in the additionalArguments.
    // "||" will be translated into "\"
    sanitizePath(path){
        return path.replaceAll("\\", "||");
    }
}
