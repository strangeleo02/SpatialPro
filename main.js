const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'assets/icon.png'),
  });

  mainWindow.loadFile('renderer/index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});


ipcMain.handle('select-audio-file', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg'] }],
  });
  if (filePaths && filePaths.length > 0) {
    return filePaths[0];
  }
  return null;
});

ipcMain.handle('separate-stems', async (event, filePath) => {
  const savePath = await dialog.showSaveDialog({
      title: 'Select a directory to save stems',
      buttonLabel: 'Select Folder',
      properties: ['openDirectory', 'createDirectory']
   });

  if (savePath.canceled){
       return null
  }
  const directory = savePath.filePath;

 return new Promise((resolve, reject) => {
  const demucsProcess = spawn('demucs', ['-n', 'htdemucs', '-o', directory, filePath]);

   let errorData = '';
  demucsProcess.stderr.on('data', (data) => {
   errorData += data.toString();
  });


   demucsProcess.on('close', (code) => {
     if (code === 0) {
         const fileName = path.parse(filePath).name
         const stems = ["drums", "bass", "other", "vocals"].map(stem => path.join(directory, "htdemucs", fileName, `${stem}.wav`));

         resolve({ status: 'success', stems: stems });
     } else {
       reject(errorData)
     }
   });
 });

});