const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('node:path');
const { spawn, execFile } = require('child_process');

const fs = require('fs').promises;
const fsSync = require('fs');

const userDataPath = app.getPath('userData');
const storeFile = path.join(userDataPath, 'store.json');

async function readStore() {
  try {
    const data = await fs.readFile(storeFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function writeStore(data) {
  await fs.writeFile(storeFile, JSON.stringify(data));
}

// Set the app name as early as possible
app.name = 'ArXiv Reader';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;
let settingsWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1200,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
    // Add these options for better UX
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: '#f0f0f0', // Match the background color from App.jsx
    icon: path.join(__dirname, '../assets/icon.png')
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Create the application menu
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

const createSettingsWindow = () => {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 400,
    height: 300,
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
    // Add these options for better UX
    resizable: false,
    minimizable: false,
    maximizable: false,
    backgroundColor: '#f0f0f0', // Match the background color from App.jsx
  });

  settingsWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY + '#settings');

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
};


ipcMain.handle('save-api-key', async (event, apiKey) => {
  try {
    const store = await readStore();
    store.apiKey = apiKey;
    await writeStore(store);
    return { success: true, apiKey: apiKey };
  } catch (error) {
    console.error('Failed to save API key:', error);
    throw error;
  }
});

ipcMain.handle('load-api-key', async () => {
  try {
    const store = await readStore();
    return store.apiKey || null;
  } catch (error) {
    console.error('Failed to load API key:', error);
    throw error;
  }
});

app.name = 'ArXiv Reader';
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {

  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle IPC messages
ipcMain.on('open-settings', () => {
  createSettingsWindow();
});

// Handle close-settings-window event
ipcMain.on('close-settings-window', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

function getPythonPath() {
  if (app.isPackaged) {
    const possiblePaths = [
      path.join(process.resourcesPath, 'src', 'venv', 'bin', 'python3'),
      path.join(process.resourcesPath, 'src', 'venv', 'bin', 'python'),
      path.join(process.resourcesPath, 'src', 'venv', 'Scripts', 'python.exe'),
    ];

    for (const pythonPath of possiblePaths) {
      if (fsSync.existsSync(pythonPath)) {  // Use fsSync.existsSync instead of fs.existsSync
        return pythonPath;
      }
    }

    throw new Error('Python executable not found in the packaged app');
  } else {
    return 'python3'; // or 'python' depending on your system
  }
}

function runPythonScript(args) {
  return new Promise((resolve, reject) => {
    const pythonExecutable = getPythonPath();
    const scriptPath = app.isPackaged
      ? path.join(process.resourcesPath, 'src', 'app.py')
      : path.join(__dirname, 'app.py');

    console.log(`Python executable: ${pythonExecutable}`);
    console.log(`Script path: ${scriptPath}`);

    const pythonProcess = spawn(pythonExecutable, [scriptPath, ...args]);

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
      console.log(`Python stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.error(`Python stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      if (code === 0) {
        resolve(stdoutData);
      } else {
        reject(new Error(`Python script exited with code ${code}. Stderr: ${stderrData}`));
      }
    });

    pythonProcess.on('error', (error) => {
      console.error(`Failed to start Python process: ${error}`);
      reject(error);
    });
  });
}

// ... other existing code ...
ipcMain.handle('run-python-script', async (event, params) => {
  try {
    const store = await readStore();
    const apiKey = store.apiKey;

    if (!apiKey) {
      throw new Error('API key is not set');
    }

    const args = [
      params.topic,
      params.subjects,
      params.interests,
      params.maxResults.toString(),
      apiKey
    ];

    const output = await runPythonScript(args);
    
    try {
      const filePath = app.isPackaged
        ? path.join(process.resourcesPath, 'src', 'results.json')
        : path.join(app.getAppPath(), 'src', 'results.json');
      console.log(`Attempting to read file at: ${filePath}`);
      const data = await fs.readFile(filePath, 'utf8');
      console.log(`File contents: ${data}`);
      const results = JSON.parse(data);
      return results;
    } catch (error) {
      console.error(`Error reading or parsing results file: ${error.message}`);
      throw new Error(`Failed to read or parse results file: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in run-python-script:', error);
    throw error;
  }
});

// Add this at the end of the file to handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});



// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
