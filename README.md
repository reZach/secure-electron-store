# secure-electron-store
This is a close copy/fork of [electron-store](https://github.com/sindresorhus/electron-store) that uses IPC (instead of having 'fs' access directly) to communicate and marshal requests to read/write your local config file. This module is specifically being built to be used within [secure-electron-template](https://github.com/reZach/secure-electron-template).

Data is being saved in a `.json` file, with key/value pairs. Encryption and minification will come as enhancements (_soon_) to this repository.

## Getting started
To set up secure-electron-store, follow these steps:

### Install via npm
```
npm i secure-electron-store
```

### Modify your main.js file
Modify the file that creates the [`BrowserWindow`](https://www.electronjs.org/docs/api/browser-window) like so:

```javascript
const {
  app,
  BrowserWindow,
  ipcMain,
  ...
} = require("electron");
const Store = require("secure-electron-store").default;
const fs = require("fs");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

async function createWindow() {

  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      additionalArguments: [`storePath:${app.getPath("userData")}`], // important!
      preload: path.join(__dirname, "preload.js") // a preload script is necessary!
    }
  });

  // Sets up main.js bindings for our electron store
  const store = new Store({
    path: app.getPath("userData")
  });
  store.mainBindings(ipcMain, win, fs);

  // Load app
  win.loadFile("path_to_my_html_file");
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);
```

### Modify your preload.js file
Create/modify your existing preload file with the following additions:
```javascript
const {
    contextBridge,
    ipcRenderer
} = require("electron");
const fs = require("fs");
const Store = require("secure-electron-store").default;

// Create the electron store to be made available in the renderer process
let store = new Store();

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "api", {
        store: store.preloadBindings(ipcRenderer, fs)
    }
);
```

### Use the store
To retrieve the data of the store on app launch, you can access it via `window.api.store.initial()`. 

Eg:
```jsx
import React from "react";

class Main extends React.Component {
  constructor() {
    super();

    this.state = {
      message: typeof window.api.store.initial()["myvalue"] !== "undefined" ? window.api.store.initial()["myvalue"] : "Default value",
    };
  }

  //...
}
```

To write a value to the store, you can use the `.send` method.
```javascript
import { writeConfigRequest } from "secure-electron-store";

// ...

window.api.store.send(writeConfigRequest, "myvalue", "14");
```

To read a value from the store, you can use the `.onReceive` and `.send` methods.
```javascript
import { readConfigRequest, readConfigResponse } from "secure-electron-store";

// ...

window.api.store.onReceive(readConfigResponse, function(args){
    console.log(`Received '${args.key}:${args.value}' from file.`);
});
window.api.store.send(readConfigRequest, "myvalue");
```