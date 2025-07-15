# JIRA CLI Helpers - Desktop GUI

Cross-platform desktop application for JIRA CLI Helpers, built with Electron and React.

## Features

- **Setup Wizard**: Guided installation and configuration of jiracli and JIRA connection
- **Script Runner**: Execute Python scripts with real-time output and interactive input
- **Terminal Interface**: Built-in terminal for script interaction
- **Cross-platform**: Works on macOS and Linux
- **Auto-updates**: Automatic dependency checking and installation
- **Extensible**: Easy to add new scripts and features

## Development

### Prerequisites

- Node.js 18+
- Python 3.8+
- npm or yarn

### Setup

```bash
cd frontend
npm install
```

### Running in Development

```bash
# Start React development server and Electron
npm run electron-dev
```

### Building for Production

```bash
# Build for current platform
npm run dist

# Build for macOS
npm run dist-mac

# Build for Linux
npm run dist-linux
```

## Architecture

### Frontend Structure

```
frontend/
├── public/
│   ├── electron.js          # Main Electron process
│   ├── preload.js           # Secure IPC bridge
│   └── index.html           # React app entry point
├── src/
│   ├── components/
│   │   ├── SetupWizard.js   # Installation & configuration
│   │   ├── ScriptRunner.js  # Script execution interface
│   │   └── Settings.js      # Configuration management
│   ├── App.js               # Main React component
│   └── index.js             # React entry point
└── package.json             # Dependencies & build config
```

### Key Components

#### SetupWizard
- Checks system dependencies (Python, jiracli)
- Guides through jiracli installation
- Configures JIRA connection settings
- Multi-step wizard interface

#### ScriptRunner
- Lists available Python scripts
- Executes scripts with real-time output
- Handles interactive input/output
- Terminal-like interface for script interaction

#### Settings
- System status monitoring
- JIRA configuration editing
- Application information
- Dependency management

### IPC Communication

The app uses Electron's IPC (Inter-Process Communication) to securely bridge the frontend and backend:

- **Main Process** (`electron.js`): Handles system operations, Python script execution
- **Renderer Process** (React app): User interface
- **Preload Script** (`preload.js`): Secure communication bridge

### Script Integration

Python scripts are executed as child processes with:
- Real-time stdout/stderr streaming
- Interactive stdin handling
- Process management and cleanup
- Error handling and reporting

## Distribution

### Automated Builds

GitHub Actions automatically builds desktop applications:
- **macOS**: `.dmg` installer
- **Linux**: `.AppImage` portable executable

### Manual Distribution

```bash
# Build for distribution
npm run dist

# Output files
dist/
├── JIRA CLI Helpers-0.1.0.dmg      # macOS
└── JIRA CLI Helpers-0.1.0.AppImage # Linux
```

## Adding New Scripts

1. Add your Python script to `../src/`
2. Update `ScriptRunner.js` in the `availableScripts` array:

```javascript
{
  name: 'your_script.py',
  title: 'Your Script Name',
  description: 'What your script does',
  icon: <YourIcon />,
  category: 'Your Category'
}
```

3. The script will automatically appear in the GUI

## Security

- **Context Isolation**: Renderer process cannot access Node.js APIs directly
- **Preload Scripts**: Only exposed APIs are available to React
- **Input Validation**: All user inputs are validated before system operations
- **Sandboxing**: Python scripts run in isolated processes

## Troubleshooting

### Common Issues

**Script not running:**
- Check if Python is installed and accessible
- Verify script path in `src/` directory
- Check Electron console for errors

**jiracli not found:**
- Ensure jiracli is installed via the Setup Wizard
- Check if jiracli is in system PATH
- Try reinstalling through the app

**JIRA connection issues:**
- Verify JIRA configuration in Settings
- Test connection with jiracli CLI directly
- Check API token permissions

### Development Issues

**Hot reload not working:**
- Restart the development server
- Clear browser cache
- Check for syntax errors in console

**Build failures:**
- Clear `node_modules` and reinstall
- Check Node.js version compatibility
- Verify all dependencies are installed