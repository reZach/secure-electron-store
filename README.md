# secure-electron-store
This is a close copy/fork of [electron-store](https://github.com/sindresorhus/electron-store) that uses IPC (instead of having 'fs' access directly) to communicate and marshal requests to read/write your local config file. This module is specifically being built to be used within [secure-electron-template](https://github.com/reZach/secure-electron-template).

Data is being saved in a `.json` file, with key/value pairs.

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

## Using the store
Using `secure-electron-store` is easy, you have access to a few methods where you can read, write or reset the store. These methods are setup as subscriptions (similar to pub-sub).

To read a value from the store, you can use the `.onReceive` and `.send` methods.
```javascript
import { readConfigRequest, readConfigResponse } from "secure-electron-store";

// ...

window.api.store.onReceive(readConfigResponse, function(args){
    console.log(`Received '${args.key}:${args.value}' from file.`);
});
window.api.store.send(readConfigRequest, "myvalue");
```

To write a value to the store, you can use the `.send` method.
```javascript
import { writeConfigRequest } from "secure-electron-store";

// ...

window.api.store.send(writeConfigRequest, "myvalue", "14");
```


To retrieve the data of the store on app launch, you can access it via `window.api.store.initial()`. 
> _NOTE_: You cannot access the store in this way if using the **passkey** option! Please see the below section for more information.
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

### Using the passkey
Due to being able to configure the store with a passkey (see options below for more details), before you ever access `window.api.store.initial()`, or the read or write methods, you'll need to set the passkey (or else encryption will fail)! This is only required if your passkey has a value (by default the passkey has a value of `""` which doesn't require any additional code shown below). Here is a sample of how you might do that.
```jsx
import React from "react";
import { savePasskeyRequest, savePasskeyResponse } from "secure-electron-store";

class Main extends React.Component {
  constructor() {
    super();

    this.state = {
      passkey: "",
    };

    this.onChangePasskey = this.onChangePasskey.bind(this);
    this.onSubmit = this.onSubmit.bind(this);

    // Handle when we've successfully saved the passkey
    window.api.store.onReceive(savePasskeyResponse, function(args){
      
      if (args.success){
        // We now have access to the initial file
        // ie. window.api.store.initial()[key]....
      }      
    });
  }

  onChangePasskey(event){
    const { value } = event.target;
    this.setState(state => ({
      passkey: value
    }));
  }

  onSubmit(event){
    // We have the passkey, update it into the store
    window.api.store.send(savePasskeyRequest, this.state.passkey);
  }

  render(){
    <div>
      <form onSubmit={this.onSubmit}>
        <input value={this.passkey} onChange={this.onChangePasskey}/>
        <button type="submit"></button>
      </form>
    </div>
  }
}
```

## Configuring options
There are a number of options you can configure for your store. All of the below options are default values:
```
{
  debug: false,
  minify: true,
  encrypt: true,
  passkey: "",
  path: "",
  filename: "data",
  extension: ".json",
  reset: false
}
```

- debug - prints debugging messages to the console. Errors will be shown _regardless_ of this option set or not.
- minify - uses [msgpack](https://www.npmjs.com/package/@msgpack/msgpack) to minify your json in your config file.
- encrypt - uses [crypto](https://nodejs.org/api/crypto.html) to encrypt your json in your config file.
- passkey - a string, when using **encrypt**, that password-protects your config file.
- path - the path to your config file. **It is essential that this option only be set in the file that creates your `BrowserWindow` and NOT in the preload file.** We recommend setting this value to `app.getPath("userData")`.
- filename - the name of the config file.
- extension - the extension of the config file. (The idea was that you could store something _other_ than json in your config file; an idea for a future enhancement).
- reset - Anytime the app runs, your config file gets deleted/created-anew. Helpful for fixing any problems related to your config file or if you want a fresh config file everytime your app starts (when in testing/development).

> _NOTE_: If you set an option when creating the `Store`, you must set this option in **both** files (ie. main / preload). This is required due to the way this package was written. (The one exception to this is the **path** option, which should only be set in the file that creates your `BrowserWindow`). 