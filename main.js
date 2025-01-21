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

    // Load index.html from the renderer directory
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

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
    try {
        const { filePaths, canceled } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg'] }],
        });
        return canceled ? null : filePaths[0];
    } catch (error) {
        console.error('Error selecting audio file:', error);
        return null;
    }
});

ipcMain.handle('separate-stems', async (event, filePath) => {
    try {
        const { filePaths, canceled } = await dialog.showOpenDialog({
            title: 'Select a directory to save stems',
            properties: ['openDirectory', 'createDirectory']
        });

        if (canceled) {
            return { status: 'cancelled' };
        }

        const directory = filePaths[0];
        
        return new Promise((resolve, reject) => {
            const demucsProcess = spawn('demucs', ['-n', 'htdemucs', '-o', directory, filePath]);
            
            let progressData = '';
            let errorData = '';

            demucsProcess.stdout.on('data', (data) => {
                progressData += data.toString();
                mainWindow.webContents.send('separation-progress', progressData);
            });

            demucsProcess.stderr.on('data', (data) => {
                errorData += data.toString();
            });

            demucsProcess.on('error', (error) => {
                reject({ status: 'error', message: `Failed to start Demucs: ${error.message}` });
            });

            demucsProcess.on('close', (code) => {
                if (code === 0) {
                    const fileName = path.parse(filePath).name;
                    const stems = ['drums', 'bass', 'other', 'vocals'].map(stem =>
                        path.join(directory, 'htdemucs', fileName, `${stem}.wav`)
                    );
                    resolve({ status: 'success', stems: stems });
                } else {
                    reject({ 
                        status: 'error', 
                        message: `Process exited with code ${code}`,
                        error: errorData
                    });
                }
            });
        });
    } catch (error) {
        return { 
            status: 'error', 
            message: `Failed to separate stems: ${error.message}` 
        };
    }
});