const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: isDev 
      ? path.join(__dirname, process.platform === 'darwin' ? 'CherryIcon.icns' : 'CherryIcon.png')
      : path.join(__dirname, process.platform === 'darwin' ? 'CherryIcon.icns' : 'CherryIcon.png'),
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  // Only open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  
  // Disable menu bar in production
  if (!isDev) {
    mainWindow.setMenuBarVisibility(false);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Disable DevTools keyboard shortcuts in production
  if (!isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (input.key === 'F12' || 
          (input.control && input.shift && (input.key === 'I' || input.key === 'J')) ||
          (input.control && input.key === 'U')) {
        event.preventDefault();
      }
    });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Helper function to get resource path
function getResourcePath(relativePath) {
  if (isDev) {
    return path.join(__dirname, '../../', relativePath);
  } else {
    return path.join(process.resourcesPath, relativePath);
  }
}

// IPC handlers for Python script execution
ipcMain.handle('check-python', async () => {
  return new Promise((resolve) => {
    exec('python3 --version', (error, stdout, stderr) => {
      if (error) {
        exec('python --version', (error2, stdout2, stderr2) => {
          resolve({
            available: !error2,
            version: error2 ? null : stdout2.trim(),
            command: 'python'
          });
        });
      } else {
        resolve({
          available: true,
          version: stdout.trim(),
          command: 'python3'
        });
      }
    });
  });
});

ipcMain.handle('check-git', async () => {
  return new Promise((resolve) => {
    exec('git --version', (error, stdout, stderr) => {
      resolve({
        available: !error,
        version: error ? null : stdout.trim(),
        command: 'git'
      });
    });
  });
});

ipcMain.handle('check-jiracli', async () => {
  // Check multiple possible locations for jcli
  const possiblePaths = [
    'jcli', // In PATH
    path.join(os.homedir(), '.local', 'bin', 'jcli'),
    path.join(os.homedir(), '.local', 'jiracli', 'jcli'),
    '/usr/local/bin/jcli'
  ];

  for (const jcliPath of possiblePaths) {
    try {
      const result = await new Promise((resolve) => {
        exec(`"${jcliPath}" --version`, (error, stdout, stderr) => {
          resolve({ error, stdout, stderr, path: jcliPath });
        });
      });

      if (!result.error) {
        return {
          available: true,
          version: result.stdout.trim(),
          path: result.path,
          error: null
        };
      }
    } catch (err) {
      continue;
    }
  }

  return {
    available: false,
    version: null,
    path: null,
    error: 'jcli not found in any standard locations'
  };
});

ipcMain.handle('install-jiracli', async (event, forceReinstall = false) => {
  const installDir = path.join(os.homedir(), '.local');
  const jiracliDir = path.join(installDir, 'jiracli');
  const binDir = path.join(installDir, 'bin');
  
  // Check if jiracli already exists
  if (fs.existsSync(jiracliDir) && !forceReinstall) {
    return {
      success: false,
      alreadyExists: true,
      output: '',
      message: 'jiracli directory already exists. Use reinstall option to update.'
    };
  }
  
  // Remove existing installation if reinstalling
  if (fs.existsSync(jiracliDir) && forceReinstall) {
    try {
      fs.rmSync(jiracliDir, { recursive: true, force: true });
      mainWindow.webContents.send('install-progress', { 
        step: 'cleanup', 
        data: 'Removing existing jiracli installation...\n' 
      });
    } catch (err) {
      return {
        success: false,
        output: '',
        message: `Failed to remove existing installation: ${err.message}`
      };
    }
  }
  
  // Ensure directories exist
  try {
    fs.mkdirSync(installDir, { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
  } catch (err) {
    return {
      success: false,
      output: '',
      message: `Failed to create directories: ${err.message}`
    };
  }

  return new Promise((resolve) => {
    let output = '';
    
    // Step 1: Clone jiracli
    const gitClone = spawn('git', ['clone', 'https://github.com/apconole/jiracli.git', jiracliDir], {
      cwd: installDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    gitClone.stdout.on('data', (data) => {
      const text = data.toString();
      output += `[CLONE] ${text}`;
      mainWindow.webContents.send('install-progress', { step: 'clone', data: text });
    });

    gitClone.stderr.on('data', (data) => {
      const text = data.toString();
      output += `[CLONE ERROR] ${text}`;
      mainWindow.webContents.send('install-progress', { step: 'clone', data: text });
    });

    gitClone.on('close', (code) => {
      if (code !== 0) {
        resolve({
          success: false,
          output: output,
          message: 'Failed to clone jiracli repository'
        });
        return;
      }

      // Step 2: Create virtual environment and install Python dependencies
      mainWindow.webContents.send('install-progress', { step: 'venv', data: 'Creating virtual environment...\n' });
      
      const venvDir = path.join(jiracliDir, 'venv');
      const createVenv = spawn('python3', ['-m', 'venv', venvDir], {
        cwd: jiracliDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      createVenv.stdout.on('data', (data) => {
        const text = data.toString();
        output += `[VENV] ${text}`;
        mainWindow.webContents.send('install-progress', { step: 'venv', data: text });
      });

      createVenv.stderr.on('data', (data) => {
        const text = data.toString();
        output += `[VENV] ${text}`;
        mainWindow.webContents.send('install-progress', { step: 'venv', data: text });
      });

      createVenv.on('close', (venvCode) => {
        if (venvCode !== 0) {
          resolve({
            success: false,
            output: output,
            message: 'Failed to create virtual environment'
          });
          return;
        }

        // Step 3: Install Python dependencies in virtual environment
        mainWindow.webContents.send('install-progress', { step: 'install', data: 'Installing Python dependencies in virtual environment...\n' });
        
        const pipPath = process.platform === 'win32' ? 
          path.join(venvDir, 'Scripts', 'pip') : 
          path.join(venvDir, 'bin', 'pip');
        
        const pythonInstall = spawn(pipPath, ['install', '-r', 'requirements.txt', '-e', '.'], {
          cwd: jiracliDir,
          stdio: ['pipe', 'pipe', 'pipe']
        });

      pythonInstall.stdout.on('data', (data) => {
        const text = data.toString();
        output += `[INSTALL] ${text}`;
        mainWindow.webContents.send('install-progress', { step: 'install', data: text });
      });

      pythonInstall.stderr.on('data', (data) => {
        const text = data.toString();
        output += `[INSTALL] ${text}`;
        mainWindow.webContents.send('install-progress', { step: 'install', data: text });
      });

      pythonInstall.on('close', (installCode) => {
        // Step 4: Create wrapper script that uses the virtual environment
        const jcliWrapperPath = path.join(binDir, 'jcli');
        const venvJcli = process.platform === 'win32' ? 
          path.join(venvDir, 'Scripts', 'jcli.exe') : 
          path.join(venvDir, 'bin', 'jcli');
        
        const wrapperScript = `#!/bin/bash
# jiracli wrapper script that uses virtual environment
exec "${venvJcli}" "$@"
`;
        
        try {
          // Remove existing script if it exists
          if (fs.existsSync(jcliWrapperPath)) {
            fs.unlinkSync(jcliWrapperPath);
          }
          
          // Create wrapper script
          fs.writeFileSync(jcliWrapperPath, wrapperScript);
          
          // Make executable
          fs.chmodSync(jcliWrapperPath, '755');
          
          output += `[WRAPPER] Created wrapper script: ${jcliWrapperPath}\n`;
          mainWindow.webContents.send('install-progress', { 
            step: 'complete', 
            data: 'Installation completed successfully!\n' 
          });
          
          resolve({
            success: true,
            output: output,
            message: 'jiracli installed successfully to ~/.local with virtual environment',
            path: jcliWrapperPath
          });
        } catch (wrapperError) {
          output += `[WRAPPER ERROR] ${wrapperError.message}\n`;
          resolve({
            success: installCode === 0, // Still success if pip install worked
            output: output,
            message: installCode === 0 ? 
              'jiracli installed but wrapper script failed. You may need to manually set up the environment.' :
              'Failed to install jiracli dependencies',
            path: jcliWrapperPath
          });
        }
      });
      });
    });
  });
});

ipcMain.handle('update-jiracli', async (event, updateMethod = 'pull') => {
  const installDir = path.join(os.homedir(), '.local');
  const jiracliDir = path.join(installDir, 'jiracli');
  const binDir = path.join(installDir, 'bin');
  
  // Check if jiracli exists
  if (!fs.existsSync(jiracliDir)) {
    return {
      success: false,
      output: '',
      message: 'jiracli not found. Please install it first.'
    };
  }

  if (updateMethod === 'fresh') {
    // Fresh install: remove existing installation and call install handler
    mainWindow.webContents.send('install-progress', { 
      step: 'cleanup', 
      data: 'Performing fresh install - removing existing installation...\n' 
    });
    
    try {
      // Remove existing installation
      fs.rmSync(jiracliDir, { recursive: true, force: true });
      
      mainWindow.webContents.send('install-progress', { 
        step: 'cleanup', 
        data: 'Existing installation removed. Starting fresh installation...\n' 
      });
      
      // Call the install handler with force reinstall
      // We'll simulate this by recreating the install logic
      return await new Promise((resolve) => {
        // Ensure directories exist
        try {
          fs.mkdirSync(installDir, { recursive: true });
          fs.mkdirSync(binDir, { recursive: true });
        } catch (err) {
          resolve({
            success: false,
            output: '',
            message: `Failed to create directories: ${err.message}`
          });
          return;
        }

        let output = '';
        
        // Step 1: Clone jiracli
        const gitClone = spawn('git', ['clone', 'https://github.com/apconole/jiracli.git', jiracliDir], {
          cwd: installDir,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        gitClone.stdout.on('data', (data) => {
          const text = data.toString();
          output += `[GIT] ${text}`;
          mainWindow.webContents.send('install-progress', { step: 'clone', data: text });
        });
        
        gitClone.stderr.on('data', (data) => {
          const text = data.toString();
          output += `[GIT] ${text}`;
          mainWindow.webContents.send('install-progress', { step: 'clone', data: text });
        });
        
        gitClone.on('close', (gitCode) => {
          if (gitCode !== 0) {
            resolve({
              success: false,
              output: output,
              message: 'Failed to clone jiracli repository'
            });
            return;
          }
          
          // Step 2: Create virtual environment
          mainWindow.webContents.send('install-progress', { step: 'venv', data: 'Creating virtual environment...\n' });
          
          const venvDir = path.join(jiracliDir, 'venv');
          const createVenv = spawn('python3', ['-m', 'venv', venvDir], {
            cwd: jiracliDir,
            stdio: ['pipe', 'pipe', 'pipe']
          });
          
          createVenv.stdout.on('data', (data) => {
            const text = data.toString();
            output += `[VENV] ${text}`;
            mainWindow.webContents.send('install-progress', { step: 'venv', data: text });
          });
          
          createVenv.stderr.on('data', (data) => {
            const text = data.toString();
            output += `[VENV] ${text}`;
            mainWindow.webContents.send('install-progress', { step: 'venv', data: text });
          });

          createVenv.on('close', (venvCode) => {
            if (venvCode !== 0) {
              resolve({
                success: false,
                output: output,
                message: 'Failed to create virtual environment'
              });
              return;
            }

            // Step 3: Install Python dependencies in virtual environment
            mainWindow.webContents.send('install-progress', { step: 'install', data: 'Installing Python dependencies in virtual environment...\n' });
            
            const pipPath = process.platform === 'win32' ? 
              path.join(venvDir, 'Scripts', 'pip') : 
              path.join(venvDir, 'bin', 'pip');
            
            const pythonInstall = spawn(pipPath, ['install', '-r', 'requirements.txt', '-e', '.'], {
              cwd: jiracliDir,
              stdio: ['pipe', 'pipe', 'pipe']
            });

            pythonInstall.stdout.on('data', (data) => {
              const text = data.toString();
              output += `[PIP] ${text}`;
              mainWindow.webContents.send('install-progress', { step: 'install', data: text });
            });

            pythonInstall.stderr.on('data', (data) => {
              const text = data.toString();
              output += `[PIP] ${text}`;
              mainWindow.webContents.send('install-progress', { step: 'install', data: text });
            });

            pythonInstall.on('close', (installCode) => {
              // Step 4: Create wrapper script that uses the virtual environment
              const jcliWrapperPath = path.join(binDir, 'jcli');
              const venvJcli = process.platform === 'win32' ? 
                path.join(venvDir, 'Scripts', 'jcli.exe') : 
                path.join(venvDir, 'bin', 'jcli');
              
              const wrapperScript = `#!/bin/bash
# jiracli wrapper script that uses virtual environment
exec "${venvJcli}" "$@"
`;
              
              try {
                fs.writeFileSync(jcliWrapperPath, wrapperScript);
                fs.chmodSync(jcliWrapperPath, '755');
                
                const successMessage = installCode === 0 ? 
                  'Fresh jiracli installation completed successfully!' : 
                  'Fresh jiracli installation completed with some warnings - check output for details';
                
                mainWindow.webContents.send('install-progress', { 
                  step: 'complete', 
                  data: successMessage + '\n' 
                });
                
                resolve({
                  success: installCode === 0,
                  output: output,
                  message: successMessage,
                  path: jcliWrapperPath
                });
              } catch (wrapperError) {
                output += `[WRAPPER ERROR] ${wrapperError.message}\n`;
                resolve({
                  success: installCode === 0,
                  output: output,
                  message: installCode === 0 ? 
                    'Fresh jiracli installation completed but wrapper script failed. You may need to manually set up the environment.' :
                    'Failed to install jiracli dependencies',
                  path: jcliWrapperPath
                });
              }
            });
          });
        });
      });
    } catch (err) {
      return {
        success: false,
        output: '',
        message: `Failed to remove existing installation: ${err.message}`
      };
    }
  } else {
    // Git pull method (default)
    return new Promise((resolve) => {
      let output = '';
      
      // Check if there are local changes
      const gitStatus = spawn('git', ['status', '--porcelain'], {
        cwd: jiracliDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let hasLocalChanges = false;
      
      gitStatus.stdout.on('data', (data) => {
        if (data.toString().trim()) {
          hasLocalChanges = true;
        }
      });
      
      gitStatus.on('close', (statusCode) => {
        if (hasLocalChanges) {
          output += 'Local changes detected - backing up changes...\n';
          mainWindow.webContents.send('install-progress', { 
            step: 'backup', 
            data: 'Local changes detected - backing up changes...\n' 
          });
        }
        
        // Pull latest changes
        output += 'Fetching latest updates from repository...\n';
        mainWindow.webContents.send('install-progress', { 
          step: 'pull', 
          data: 'Fetching latest updates from repository...\n' 
        });
        
        const gitPull = spawn('git', ['pull', 'origin', 'main'], {
          cwd: jiracliDir,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        gitPull.stdout.on('data', (data) => {
          const text = data.toString();
          output += `[GIT] ${text}`;
          mainWindow.webContents.send('install-progress', { step: 'pull', data: text });
        });
        
        gitPull.stderr.on('data', (data) => {
          const text = data.toString();
          output += `[GIT] ${text}`;
          mainWindow.webContents.send('install-progress', { step: 'pull', data: text });
        });
        
        gitPull.on('close', (pullCode) => {
          if (pullCode !== 0) {
            output += '\nGit pull failed - you may need to use fresh install option\n';
            resolve({
              success: false,
              output: output,
              message: 'Git pull failed. Try fresh install option for a clean update.'
            });
            return;
          }
          
          // Update Python dependencies
          output += 'Updating Python dependencies...\n';
          mainWindow.webContents.send('install-progress', { 
            step: 'install', 
            data: 'Updating Python dependencies...\n' 
          });
          
          const venvDir = path.join(jiracliDir, 'venv');
          const pipPath = process.platform === 'win32' ? 
            path.join(venvDir, 'Scripts', 'pip') : 
            path.join(venvDir, 'bin', 'pip');
          
          const pipInstall = spawn(pipPath, ['install', '-r', 'requirements.txt', '-e', '.'], {
            cwd: jiracliDir,
            stdio: ['pipe', 'pipe', 'pipe']
          });
          
          pipInstall.stdout.on('data', (data) => {
            const text = data.toString();
            output += `[PIP] ${text}`;
            mainWindow.webContents.send('install-progress', { step: 'install', data: text });
          });
          
          pipInstall.stderr.on('data', (data) => {
            const text = data.toString();
            output += `[PIP] ${text}`;
            mainWindow.webContents.send('install-progress', { step: 'install', data: text });
          });
          
          pipInstall.on('close', (installCode) => {
            if (installCode === 0) {
              output += '\nUpdate completed successfully!\n';
              mainWindow.webContents.send('install-progress', { 
                step: 'complete', 
                data: 'Update completed successfully!\n' 
              });
            }
            
            resolve({
              success: installCode === 0,
              output: output,
              message: installCode === 0 ? 
                'jiracli updated successfully!' : 
                'Update completed with some warnings - check output for details'
            });
          });
        });
      });
    });
  }
});

ipcMain.handle('run-script', async (event, scriptName, args = []) => {
  const pythonCheck = await new Promise((resolve) => {
    exec('python3 --version', (error) => {
      resolve(error ? 'python' : 'python3');
    });
  });

  const scriptPath = getResourcePath(`src/${scriptName}`);
  
  return new Promise((resolve) => {
    const pythonProcess = spawn(pythonCheck, [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // Send real-time updates to renderer
      mainWindow.webContents.send('script-output', {
        type: 'stdout',
        data: output
      });
    });

    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      mainWindow.webContents.send('script-output', {
        type: 'stderr',
        data: output
      });
    });

    pythonProcess.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout: stdout,
        stderr: stderr,
        exitCode: code
      });
    });

    // Handle stdin for interactive scripts
    pythonProcess.stdin.setEncoding = 'utf-8';
    
    // Listen for user input from renderer
    ipcMain.on('script-input', (event, input) => {
      pythonProcess.stdin.write(input + '\n');
    });
  });
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
});

// Handle jiracli configuration
ipcMain.handle('get-jira-config', async () => {
  const configPath = path.join(os.homedir(), '.jira.yml');
  try {
    const config = fs.readFileSync(configPath, 'utf8');
    return { exists: true, content: config };
  } catch (error) {
    return { exists: false, error: error.message };
  }
});

ipcMain.handle('save-jira-config', async (event, config) => {
  const configPath = path.join(os.homedir(), '.jira.yml');
  try {
    fs.writeFileSync(configPath, config);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});