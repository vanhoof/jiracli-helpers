const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // System checks
  checkPython: () => ipcRenderer.invoke('check-python'),
  checkGit: () => ipcRenderer.invoke('check-git'),
  checkJiracli: () => ipcRenderer.invoke('check-jiracli'),
  
  // jiracli installation
  installJiracli: (forceReinstall = false) => ipcRenderer.invoke('install-jiracli', forceReinstall),
  updateJiracli: (updateMethod = 'pull') => ipcRenderer.invoke('update-jiracli', updateMethod),
  onInstallProgress: (callback) => ipcRenderer.on('install-progress', callback),
  removeInstallProgressListener: (callback) => ipcRenderer.removeListener('install-progress', callback),
  
  // Script execution
  runScript: (scriptName, args) => ipcRenderer.invoke('run-script', scriptName, args),
  sendScriptInput: (input) => ipcRenderer.send('script-input', input),
  onScriptOutput: (callback) => ipcRenderer.on('script-output', callback),
  removeScriptOutputListener: (callback) => ipcRenderer.removeListener('script-output', callback),
  
  // File system
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // JIRA configuration
  getJiraConfig: () => ipcRenderer.invoke('get-jira-config'),
  saveJiraConfig: (config) => ipcRenderer.invoke('save-jira-config', config),
  
  // Platform info
  platform: process.platform,
  versions: process.versions
});