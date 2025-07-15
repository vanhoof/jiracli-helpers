import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Terminal,
  Description,
  BugReport
} from '@mui/icons-material';
import Convert from 'ansi-to-html';

// Create ANSI to HTML converter with terminal-like styling
const convert = new Convert({
  fg: '#D4D4D4',        // Default foreground (light gray)
  bg: '#1E1E1E',        // Default background (dark)
  newline: true,        // Convert newlines to <br>
  escapeXML: true,      // Escape HTML entities
  colors: {
    0: '#000000',       // Black
    1: '#CD3131',       // Red
    2: '#0DBC79',       // Green  
    3: '#E5E510',       // Yellow
    4: '#2472C8',       // Blue
    5: '#BC3FBC',       // Magenta
    6: '#11A8CD',       // Cyan
    7: '#E5E5E5',       // White
    8: '#666666',       // Bright Black (Gray)
    9: '#F14C4C',       // Bright Red
    10: '#23D18B',      // Bright Green
    11: '#F5F543',      // Bright Yellow
    12: '#3B8EEA',      // Bright Blue
    13: '#D670D6',      // Bright Magenta
    14: '#29B8DB',      // Bright Cyan
    15: '#E5E5E5'       // Bright White
  }
});

const availableScripts = [
  {
    name: 'create_issue_interactive.py',
    title: 'Create JIRA Issue',
    description: 'Interactive tool for creating JIRA issues with templates and guided workflow',
    icon: <Description />,
    category: 'Issue Management'
  },
  // Future scripts can be added here
  {
    name: 'future_script.py',
    title: 'Future Script',
    description: 'Placeholder for future JIRA helper scripts',
    icon: <BugReport />,
    category: 'Coming Soon',
    disabled: true
  }
];

function ScriptRunner({ systemStatus }) {
  const [selectedScript, setSelectedScript] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [userInput, setUserInput] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  const outputRef = useRef(null);
  const scriptProcessRef = useRef(null);

  // Convert ANSI codes to HTML
  const convertAnsiToHtml = (text) => {
    return convert.toHtml(text);
  };

  useEffect(() => {
    // Auto-scroll to bottom of output
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    // Set up real-time output listener
    const handleScriptOutput = (event, data) => {
      setOutput(prev => prev + data.data);
    };

    window.electronAPI.onScriptOutput(handleScriptOutput);

    return () => {
      window.electronAPI.removeScriptOutputListener(handleScriptOutput);
    };
  }, []);

  const handleRunScript = async (script) => {
    if (script.disabled) return;
    
    setSelectedScript(script);
    setOutput('');
    setIsRunning(true);
    setShowTerminal(true);
    setOutput(`Starting ${script.title}...\n\n`);

    try {
      const result = await window.electronAPI.runScript(script.name);
      
      setOutput(prev => prev + `\n\nScript completed with exit code: ${result.exitCode}\n`);
      
      if (!result.success && result.stderr) {
        setOutput(prev => prev + `\nErrors:\n${result.stderr}\n`);
      }
    } catch (error) {
      setOutput(prev => prev + `\nError running script: ${error.message}\n`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSendInput = () => {
    if (userInput.trim() && isRunning) {
      setOutput(prev => prev + `> ${userInput}\n`);
      window.electronAPI.sendScriptInput(userInput);
      setUserInput('');
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSendInput();
    }
  };

  const handleCloseTerminal = () => {
    setShowTerminal(false);
    setSelectedScript(null);
    setOutput('');
  };

  const isSystemReady = () => {
    return systemStatus.python?.available && 
           systemStatus.jiracli?.available && 
           systemStatus.jiraConfig?.exists;
  };

  if (!isSystemReady()) {
    return (
      <Paper elevation={3} sx={{ p: 4 }}>
        <Alert severity="warning">
          Please complete the setup process before running scripts. 
          Go to the Setup tab to configure your system.
        </Alert>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Available Scripts
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose a script to run. Interactive scripts will open a terminal window.
      </Typography>

      <Grid container spacing={3}>
        {availableScripts.map((script, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <Card 
              className="script-card"
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                opacity: script.disabled ? 0.6 : 1
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {script.icon}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {script.title}
                  </Typography>
                </Box>
                
                <Chip 
                  label={script.category} 
                  size="small" 
                  color={script.disabled ? 'default' : 'primary'}
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="body2" color="text.secondary">
                  {script.description}
                </Typography>
              </CardContent>
              
              <CardActions>
                <Button
                  variant="contained"
                  onClick={() => handleRunScript(script)}
                  disabled={script.disabled || isRunning}
                  startIcon={isRunning && selectedScript?.name === script.name ? 
                    <CircularProgress size={16} /> : <PlayArrow />
                  }
                  fullWidth
                >
                  {isRunning && selectedScript?.name === script.name ? 'Running...' : 'Run Script'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Terminal Dialog */}
      <Dialog
        open={showTerminal}
        onClose={handleCloseTerminal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <Terminal sx={{ mr: 1 }} />
          {selectedScript?.title}
          {isRunning && <CircularProgress size={20} sx={{ ml: 2 }} />}
        </DialogTitle>
        
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 0 }}>
          <Box
            ref={outputRef}
            className="terminal-output"
            sx={{ 
              flexGrow: 1, 
              margin: 2,
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: 1.4,
              backgroundColor: '#1E1E1E',
              color: '#D4D4D4',
              padding: 2,
              borderRadius: 1,
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }}
            dangerouslySetInnerHTML={{
              __html: output ? convertAnsiToHtml(output) : '<span style="color: #666666;">Waiting for output...</span>'
            }}
          />
          
          {isRunning && (
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type input and press Enter..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                InputProps={{
                  className: 'terminal-input',
                  sx: { 
                    fontFamily: 'monospace',
                    backgroundColor: '#2d2d2d',
                    '& input': { 
                      color: '#D4D4D4',
                      padding: '8px 12px'
                    },
                    '& fieldset': {
                      borderColor: '#555555'
                    },
                    '&:hover fieldset': {
                      borderColor: '#777777'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#0DBC79'
                    }
                  }
                }}
              />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseTerminal}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ScriptRunner;