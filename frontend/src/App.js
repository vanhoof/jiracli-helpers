import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, Box, Typography, Tab, Tabs } from '@mui/material';
import SetupWizard from './components/SetupWizard';
import ScriptRunner from './components/ScriptRunner';
import Settings from './components/Settings';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#f36196',      // Pink accent (matches cherry icon theme)
      light: '#f582ab',
      dark: '#d4407a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#3B8EEA',      // Blue accent (matches terminal info color)
      light: '#5BA3F0',
      dark: '#2E72BB',
      contrastText: '#ffffff',
    },
    error: {
      main: '#F14C4C',      // Red (matches terminal error color)
      light: '#F56B6B',
      dark: '#D93D3D',
    },
    warning: {
      main: '#F5F543',      // Yellow (matches terminal warning color)
      light: '#F7F76A',
      dark: '#D4D436',
      contrastText: '#000000',
    },
    info: {
      main: '#29B8DB',      // Cyan (matches terminal info color)
      light: '#4FC3E1',
      dark: '#1F93AF',
    },
    success: {
      main: '#f36196',      // Pink (matches primary text)
      light: '#f582ab',
      dark: '#d4407a',
    },
    background: {
      default: '#1E1E1E',   // Dark background (matches terminal)
      paper: '#2D2D2D',     // Slightly lighter for cards/papers
    },
    text: {
      primary: '#D4D4D4',   // Light gray (matches terminal text)
      secondary: '#9CA3AF', // Muted gray for secondary text
    },
    divider: '#404040',     // Dark gray for dividers
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 600,
      color: '#FFFFFF',
    },
    h5: {
      fontWeight: 600,
      color: '#FFFFFF',
    },
    h6: {
      fontWeight: 600,
      color: '#FFFFFF',
    },
  },
  components: {
    // Customize component styles for dark theme
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove default gradient
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#2D2D2D',
          borderRadius: 12,
          border: '1px solid #404040',
          '&:hover': {
            borderColor: '#f36196',
            boxShadow: '0 4px 20px rgba(243, 97, 150, 0.15)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          '&.Mui-selected': {
            color: '#f36196',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#f36196',
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#404040',
            },
            '&:hover fieldset': {
              borderColor: '#606060',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#f36196',
            },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          '&.Mui-active': {
            color: '#f36196',
            fontWeight: 600,
          },
          '&.Mui-completed': {
            color: '#f36196',
          },
        },
      },
    },
  },
});

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const [currentTab, setCurrentTab] = useState(0);
  const [setupComplete, setSetupComplete] = useState(false);
  const [manualSetupComplete, setManualSetupComplete] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    python: null,
    jiracli: null,
    jiraConfig: null
  });

  useEffect(() => {
    checkSystemStatus();
  }, [manualSetupComplete]);

  const checkSystemStatus = async () => {
    try {
      const [pythonCheck, jiracliCheck, jiraConfig] = await Promise.all([
        window.electronAPI.checkPython(),
        window.electronAPI.checkJiracli(),
        window.electronAPI.getJiraConfig()
      ]);

      setSystemStatus({
        python: pythonCheck,
        jiracli: jiracliCheck,
        jiraConfig: jiraConfig
      });

      // Consider setup complete if all components are available OR manually completed
      const systemSetupComplete = pythonCheck.available && 
        jiracliCheck.available && 
        jiraConfig.exists;
      
      const isSetupComplete = systemSetupComplete || manualSetupComplete;
      setSetupComplete(isSetupComplete);
      
      // Set default tab to Scripts if setup is complete and this is the initial load
      if (!initialLoadComplete && isSetupComplete) {
        setCurrentTab(1); // Scripts tab
        setInitialLoadComplete(true);
      } else if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    } catch (error) {
      console.error('Error checking system status:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSetupComplete = async () => {
    // Mark that user has manually completed setup
    setManualSetupComplete(true);
    
    // Refresh the system status which will now set setupComplete to true
    await checkSystemStatus();
    
    setCurrentTab(1); // Switch to Scripts tab
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            JIRA CLI Helpers
          </Typography>
          <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
            Cross-platform GUI for JIRA operations
          </Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} centered>
            <Tab label="Setup" />
            <Tab label="Scripts" disabled={!setupComplete} />
            <Tab label="Settings" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          <SetupWizard 
            systemStatus={systemStatus}
            onSetupComplete={handleSetupComplete}
            onStatusChange={checkSystemStatus}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <ScriptRunner systemStatus={systemStatus} />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Settings 
            systemStatus={systemStatus}
            onStatusChange={checkSystemStatus}
          />
        </TabPanel>
      </Container>
    </ThemeProvider>
  );
}

export default App;
