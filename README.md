# secure-electron-store
This is a close copy/fork of [electron-store](https://github.com/sindresorhus/electron-store) that uses IPC (instead of having 'fs' access directly) to communicate and marshal requests to read/write your local config file. This module is specifically being built to be used within [secure-electron-template](https://github.com/reZach/secure-electron-template).

Data is being saved in a `.json` file, with key/value pairs.

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=reZach_secure-electron-store&metric=alert_status)](https://sonarcloud.io/dashboard?id=reZach_secure-electron-store)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=reZach_secure-electron-store&metric=security_rating)](https://sonarcloud.io/dashboard?id=reZach_secure-electron-store)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=reZach_secure-electron-store&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=reZach_secure-electron-store)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=reZach_secure-electron-store&metric=bugs)](https://sonarcloud.io/dashboard?id=reZach_secure-electron-store)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=reZach_secure-electron-store&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=reZach_secure-electron-store)

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

app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  } else {
    store.clearMainBindings(ipcMain);
  }
});
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
    if (args.success){
         console.log(`Received '${args.key}:${args.value}' from file.`);
    }    
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

### Setting up your bindings
Since this store uses [ipcRenderer]() internally, we recommend setting up your bindings in your [componentDidMount](https://reactjs.org/docs/react-component.html#componentdidmount) method if you are using secure-electron-store in a react app. 

> Even _if_ you aren't using an react app, it's important to clear your subscriptions (see note below code sample).
```jsx
import React from "react";
import { readConfigRequest, readConfigResponse } from "secure-electron-store";

class MyComponent extends React.Component {
  constructor(){
    super();

    // your initialization of functions/etc.
  }

  componentDidMount() {
    // Clears all listeners
    window.api.store.clearRendererBindings();

    window.api.store.onReceive(readConfigResponse, function(args) {
      if (args.success) {
        // Do something with the value from file
      }
    });

    // Read from file as soon as this component is rendered
    window.api.store.send(readConfigRequest, "store");
  }
}
```

> _NOTE_: It's important to remember to `clearRendererBindings()`. Doing so will remove all subscriptions your store has already created. If you do not do this, you may end up where multiple bindings are being called for a single read/write event. (This _may_ be your intention, but if it is I assume you are smart enough to know what you are doing).

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

### Using the store from the main process
You can use the store from the main process by sending a request from the renderer process. Once this request is received by the main electron process, the main electron process will be able to use values in your store (to modify your [BrowserWindow](https://www.electronjs.org/docs/api/browser-window) for example).

> _NOTE_: It's important to remember that if your store is protected by a passkey, you'll need to first send the `savePasskeyRequest` message (shown above) before you send the `useConfigInMainRequest` message.
```jsx
import React from "react";
import { useConfigInMainRequest, useConfigInMainResponse } from "secure-electron-store";

class MyComponent extends React.Component {
  constructor(){
    super();

    // your initialization of functions/etc.
  }

  componentDidMount() {
    // Request so that the main process can use the store
    window.api.store.send(useConfigInMainRequest);

    // Act on a successful message
    window.api.store.onReceive(useConfigInMainResponse, function(args) {
      if (args.success){
        console.log("Successfully used store in electron main process");
      }
    });
  }
}
```

Your main electron process will look something like this. This code looks similar to the main bindings as shown above but with a few modifications.
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

  // Sets up main.js bindings for our electron store;
  // callback is optional and allows you to use store in main process
  const callback = function(success, store){
    console.log(`${!success ? "Un-s" : "S"}uccessfully retrieved store in main process.`);
    console.log(store); // {"key1": "value1", ... }
    
    win.maximize(); // modify BrowserWindow, for example
  };

  const store = new Store({
    path: app.getPath("userData")
  });
  store.mainBindings(ipcMain, win, fs, callback); // "callback" was added as the last parameter here!

  // Load app
  win.loadFile("path_to_my_html_file");
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  } else {
    store.clearMainBindings(ipcMain);
  }
});
```

### Deleting the store
If you'd like to delete the store, you can send the `deleteConfigRequest` request.
```javascript
import { deleteConfigRequest, deleteConfigResponse } from "secure-electron-store";

// ...

window.api.store.onReceive(deleteConfigResponse, function(args){
    if (args.success){
      console.log("File deleted");
    }
});
window.api.store.send(deleteConfigRequest);
```

## Using the unprotected store (New since v1.3.0)
There is now an unprotected store, driven by a [desired feature](https://github.com/reZach/secure-electron-template/issues/26). This unprotected store is a _separate_ file that exists in the same directory (by default) as your main store. You can save values in this store that you'd like to use to configure anything _before_ your app actually starts up, like a height or width of the [BrowserWindow](https://www.electronjs.org/docs/api/browser-window) in your electron app.

In order to use the unprotected store, you'll make use of the `mainInitialStore` function, which can query this store's values. Here's an example of how that might work below.
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

  const store = new Store({
    path: app.getPath("userData")
  });

  // Use saved config values for configuring your
  // BrowserWindow, for instance.
  // NOTE - this config is not passcode protected
  // and stores plaintext values
  // NOTE - be sure to _ensure_ values exist before
  // referencing them below!
  let savedConfig = store.mainInitialStore(fs);

  // Create the browser window.
  win = new BrowserWindow({
    width: savedConfig.width,
    height: savedConfig.height,
    webPreferences: {
      contextIsolation: true,
      additionalArguments: [`storePath:${app.getPath("userData")}`], // important!
      preload: path.join(__dirname, "preload.js") // a preload script is necessary!
    }
  });

  // Sets up main.js bindings for our electron store;
  // callback is optional and allows you to use store in main process
  const callback = function(success, store){
    console.log(`${!success ? "Un-s" : "S"}uccessfully retrieved store in main process.`);
    console.log(store); // {"key1": "value1", ... }
    
    win.maximize(); // modify BrowserWindow, for example
  };

  // There is a separate callback that can be
  // called when the unprotected file is used in main.js.
  // This function is no different than it's counterpart
  const unprotectedCallback = function(success, store){
    console.log(`${!success ? "Un-s" : "S"}uccessfully retrieved store in main process.`);
    console.log(store); // {"key1": "value1", ... }
    
    win.maximize(); // modify BrowserWindow, for example
  };
  
  store.mainBindings(ipcMain, win, fs, callback, unprotectedCallback); // there is an extra callback for unprotected file store access

  // Load app
  win.loadFile("path_to_my_html_file");
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  } else {
    store.clearMainBindings(ipcMain);
  }
});
```

### Using the unprotected store
Similar to using the regular store, the unprotected store can be interacted in _exactly_ the same way. The only difference you must be aware of are the messages that are used are different.
```
Instead of > Use this
---------------------

readConfigRequest > readUnprotectedConfigRequest
readConfigResponse > readUnprotectedConfigResponse
writeConfigRequest > writeUnprotectedConfigRequest
writeConfigResponse > writeUnprotectedConfigResponse
deleteConfigRequest > deleteUnprotectedConfigRequest
deleteConfigResponse > deleteUnprotectedConfigResponse
savePasskeyRequest > N/A (not available)
savePasskeyResponse > N/A (not available)
useConfigInMainRequest > useUnprotectedConfigInMainRequest
useConfigInMainResponse > useUnprotectedConfigInMainResponse
```

Writing data to the unprotected store, an example.
```javascript
import { writeUnprotectedConfigRequest } from "secure-electron-store";

// ...

window.api.store.send(writeUnprotectedConfigRequest, "myvalue", "14");
```

To retrieve the data of the store on app launch, like it's regular counterpart, you can access it via `window.api.store.initialUnprotected()`.
```jsx
import React from "react";

class Main extends React.Component {
  constructor() {
    super();

    this.state = {
      message: typeof window.api.store.initialUnprotected()["myvalue"] !== "undefined" ? window.api.store.initialUnprotected()["myvalue"] : "Default value",
    };
  }

  //...
}
```

## Configuring options
There are a number of options you can configure for your store. All of the below options are default values:
```json
{
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
}
``` 

- debug - prints debugging messages to the console. Errors will be shown _regardless_ of this option set or not.
- minify - uses [msgpack](https://www.npmjs.com/package/@msgpack/msgpack) to minify your json in your config file.
- encrypt - uses [crypto](https://nodejs.org/api/crypto.html) to encrypt your json in your config file.
- passkey - a string, when using **encrypt**, that password-protects your config file.
- path - the path to your config file. **It is essential that this option only be set in the file that creates your `BrowserWindow` and NOT in the preload file.** We recommend setting this value to `app.getPath("userData")`.
- unprotectedPath - the path to your unprotected config file. By **default**, this path will default to the value of the **path** variable (so it's safe 99% of the time to never set this value).
- filename - the name of the config file.
- unprotectedFilename - the name of the unprotected config file.
- extension - the extension of the config file. (The idea was that you could store something _other_ than json in your config file; an idea for a future enhancement).
- reset - Anytime the app runs, your config file gets deleted/created-anew. Helpful for fixing any problems related to your config file or if you want a fresh config file everytime your app starts (when in testing/development).

> _NOTE_: If you set an option when creating the `Store`, you must set this option in **both** files (ie. main / preload). This is required due to the way this package was written. (The one exception to this are the **path**/**unprotectedPath** options, which should only be set in the file that creates your `BrowserWindow`). 