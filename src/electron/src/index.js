var cookie = cookie ? cookie : "";
var userAgent = userAgent ? userAgent : '';

const { ipcMain } = require('electron')

ipcMain.on('synchronous-message', (event, arg) => {
  let args = JSON.parse(arg);
  cookie = args.cookie ? args.cookie : cookie;
  userAgent = args.userAgent ? args.userAgent : userAgent;
  event.returnValue = 'pong'
})

const { session } = require('electron');

const { app, BrowserWindow } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if(require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    //thickFrame: "WS_THICKFRAME",
    backgroundColor: '#fff',
    fullscreenable: false,
    //fullscreen:true,
    //fullscreenWindowTitle:true,
    icon: "src/icons/icon.ico",
    webPreferences: {
      nodeIntegration: true,
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.maximize();

  mainWindow.webContents.on('new-window', function(e, url) {
    e.preventDefault();
    require('electron').shell.openExternal(url);
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = userAgent;
    details.requestHeaders['cookie'] = cookie;
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // Context Menu
  const { Menu, MenuItem, Session, clipboard } = require('electron')

  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu()

    let shouldPopup = false;

    if(params.editFlags.canSelectAll && params.selectionText) {
      menu.append(
        new MenuItem({
          label: "Select all",
          role:'select all',
          accelerator:'CommandOrControl+A',
          click: () => mainWindow.webContents.selectAll()
        })
      )
      shouldPopup = true;
    }

    if(shouldPopup && ((params.editFlags.canCopy && params.selectionText) || (params.editFlags.canPaste && params.inputFieldType !== 'none'))) {
      menu.append(new MenuItem({ type: 'separator' }))
    }

    if(params.editFlags.canCopy && params.selectionText) {
      menu.append(
        new MenuItem({
          label: "Copy",
          role:'copy',
          accelerator:'CommandOrControl+C',
          click: () => clipboard.writeText(params.selectionText, 'selection')
        })
      )
      shouldPopup = true;
    }

    if(params.editFlags.canPaste && params.inputFieldType !== 'none') {
      menu.append(
        new MenuItem({
          label: "Paste",
          role:'paste',
          accelerator:'CommandOrControl+V',
          click: () => mainWindow.webContents.paste()
        })
      )
      shouldPopup = true;
    }

    if(params.linkURL) {
      if(shouldPopup) {
        menu.append(new MenuItem({ type: 'separator' }))
      }
      menu.append(
        new MenuItem({
          label: "Copy link address",
          role:'copy link address',
          click: () => clipboard.writeText(params.linkURL, 'selection')
        })
      )
      shouldPopup = true;
    }

    if(params.dictionarySuggestions.length > 0) {
      if(shouldPopup) {
        menu.append(new MenuItem({ type: 'separator' }))
      }
      // Add each spelling suggestion
      for(const suggestion of params.dictionarySuggestions) {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion)
        }))
      }

      // Allow users to add the misspelled word to the dictionary
      if(params.misspelledWord) {
        menu.append(
          new MenuItem({
            label: 'Add to dictionary',
            click: () => mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
          })
        )
      }
      shouldPopup = true;
    }

    if(shouldPopup) {
      menu.popup()
    }

  })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if(process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if(BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
