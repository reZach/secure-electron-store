// https://dev.to/therealdanvega/creating-your-first-npm-package-2ehf
const fs = require("fs");
const path = require("path");

export const REQUESTFILE = "SES-RequestFile";
export const WRITEFILE = "SES-WriteFile";
export const REQUESTFILEREPLY = "SES-RequestFileReply";
export const WRITEFILEREPLY = "SES-WriteFileReply";

export default class Bindings {
    constructor(ipcMain, basePath, options){
        this.ipcMain = ipcMain;

        let filename = typeof options.filename === "undefined" ? "config.json" : options.filename;
        this.filepath = path.join(basePath, filename);

        this.bindEvents();
    }

    bindEvents(){
        ipcMain.on(REQUESTFILE, (IpcMainEvent, args) => {

            fs.access(this.filepath, fs.constants.F_OK, (error) => {
                if (!error){
                    fs.readFile(this.filepath, (error, data) => {
                        IpcMainEvent.reply(REQUESTFILEREPLY, {error, data});
                    });
                } else {
                    IpcMainEvent.reply(REQUESTFILEREPLY, {error: "No file found!", data: {}});
                }
            });
        });

        ipcMain.on(WRITEFILE, (IpcMainEvent, args) => {

            fs.writeFile(this.filepath, args.data, (error) => {
                if (error){
                    IpcMainEvent.reply(WRITEFILEREPLY, {error});
                } else {
                    IpcMainEvent.reply(WRITEFILEREPLY, {});
                }
            });
        });
    }
}