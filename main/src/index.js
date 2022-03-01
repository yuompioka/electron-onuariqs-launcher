const { app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');

const DESTINATION_PATH = `${app.getAppPath().replace('\\resources\\app.asar','')}\\.minecraft\\`;
const APP_DIR = app.getAppPath().replace('\\resources\\app.asar','');

var mainProcessVars = {
  path: DESTINATION_PATH,
  app_path: APP_DIR,
}

const {download} = require('electron-dl');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}
const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280 + 20,
    height: 720,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.setResizable(true);
  mainWindow.setMenuBarVisibility(false);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};
app.commandLine.appendSwitch ("disable-http-cache");
app.commandLine.appendSwitch('disable-site-isolation-trials')
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('quit-app', function() {
  tray.window.close(); // Standart Event of the BrowserWindow object.
  app.quit(); // Standart event of the app - that will close our app.
});

ipcMain.on('variable-request', function (event, arg) {
  event.sender.send('variable-reply', [mainProcessVars[arg[0]], mainProcessVars[arg[1]]]);
});

ipcMain.on('downloadUpdate', (event, arg) => {
  arg.properties.onProgress = function(obj) {
    //console.log('hi' + ` ${obj.transferredBytes}`);
    event.reply('updateDownloadProgress', obj);
  }
  arg.properties.onCompleted = function(obj) {
    event.reply('DownloadCompleted', obj);
  };
  download(BrowserWindow.getFocusedWindow(), arg.url, arg.properties)
  .then(dl => event.sender.send("updateDownloadCompleted", dl.getSavePath()));
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
