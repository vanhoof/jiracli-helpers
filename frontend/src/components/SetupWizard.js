import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  CircularProgress,
  Chip,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Computer,
  CloudDownload,
  Settings
} from '@mui/icons-material';

const steps = ['Check System', 'Install Dependencies', 'Configure JIRA'];

function StatusChip({ status, label }) {
  const getStatusProps = () => {
    if (status === null) return { color: 'default', icon: null };
    if (status.available || status.exists || status.success) {
      return { color: 'success', icon: <CheckCircle /> };
    }
    return { color: 'error', icon: <Error /> };
  };

  const { color, icon } = getStatusProps();
  
  return (
    <Chip
      label={label}
      color={color}
      icon={icon}
      variant="outlined"
      sx={{ mr: 1, mb: 1 }}
    />
  );
}

function SetupWizard({ systemStatus, onSetupComplete, onStatusChange }) {
  const [activeStep, setActiveStep] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [installOutput, setInstallOutput] = useState('');
  const [installComplete, setInstallComplete] = useState(false);
  const [showReinstallOption, setShowReinstallOption] = useState(false);
  const [jiraConfig, setJiraConfig] = useState({
    server: '',
    username: '',
    password: '',
    token: ''
  });
  const [useToken, setUseToken] = useState(true);

  React.useEffect(() => {
    // Listen for installation progress
    const handleInstallProgress = (event, data) => {
      setInstallOutput(prev => prev + data.data);
    };

    window.electronAPI.onInstallProgress(handleInstallProgress);

    return () => {
      window.electronAPI.removeInstallProgressListener(handleInstallProgress);
    };
  }, []);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleInstallJiracli = async (forceReinstall = false) => {
    setInstalling(true);
    setInstallOutput('');
    setShowReinstallOption(false);
    try {
      const result = await window.electronAPI.installJiracli(forceReinstall);
      if (result.success) {
        setInstallComplete(true);
        await onStatusChange();
      } else if (result.alreadyExists) {
        setShowReinstallOption(true);
        setInstallOutput('⚠️ jiracli is already installed at ~/.local/jiracli\n\nYou can either:\n• Use the existing installation\n• Reinstall to get the latest version');
      } else {
        console.error('Installation failed:', result.output);
        setInstallOutput(prev => prev + '\n❌ Installation failed: ' + result.message);
      }
    } catch (error) {
      console.error('Installation error:', error);
      setInstallOutput(prev => prev + '\n❌ Installation error: ' + error.message);
    } finally {
      setInstalling(false);
    }
  };

  const handleSaveJiraConfig = async () => {
    const configYaml = `server: ${jiraConfig.server}
username: ${jiraConfig.username}
${useToken ? `token: ${jiraConfig.token}` : `password: ${jiraConfig.password}`}`;

    try {
      const result = await window.electronAPI.saveJiraConfig(configYaml);
      if (result.success) {
        await onStatusChange();
        onSetupComplete();
      }
    } catch (error) {
      console.error('Config save error:', error);
    }
  };

  const isStepComplete = (step) => {
    switch (step) {
      case 0:
        return systemStatus.python?.available;
      case 1:
        return systemStatus.jiracli?.available || installComplete;
      case 2:
        return systemStatus.jiraConfig?.exists;
      default:
        return false;
    }
  };

  const canProceed = () => {
    return isStepComplete(activeStep);
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              System Requirements Check
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              We'll check if your system has the required dependencies.
            </Typography>
            
            <Box sx={{ mt: 3 }}>
              <StatusChip 
                status={systemStatus.python} 
                label={`Python ${systemStatus.python?.version || 'Not Found'}`} 
              />
              <StatusChip 
                status={systemStatus.jiracli} 
                label={`jiracli ${systemStatus.jiracli?.version || 'Not Found'}`} 
              />
              <StatusChip 
                status={systemStatus.jiraConfig} 
                label="JIRA Configuration" 
              />
            </Box>

            {!systemStatus.python?.available && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Python is required but not found. Please install Python 3.7+ and restart the application.
              </Alert>
            )}

            {!systemStatus.jiracli?.available && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                jiracli is not installed. We'll help you install it in the next step.
              </Alert>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Install Dependencies
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Install jiracli from the official repository.
            </Typography>

            {systemStatus.jiracli?.available ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                jiracli is already installed and ready to use!
              </Alert>
            ) : (
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={() => handleInstallJiracli(false)}
                  disabled={installing}
                  startIcon={installing ? <CircularProgress size={20} /> : <CloudDownload />}
                  size="large"
                >
                  {installing ? 'Installing jiracli...' : 'Install jiracli'}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  This will clone the official jiracli repository to ~/.local and set it up for use.
                </Typography>
                
                {(installing || installOutput) && (
                  <Box className="install-progress" sx={{ mt: 3, p: 2, maxHeight: 200, overflow: 'auto' }}>
                    <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: '#D4D4D4' }}>
                      {installOutput}
                    </Typography>
                  </Box>
                )}
                
                {showReinstallOption && (
                  <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setInstallComplete(true);
                        onStatusChange();
                      }}
                      startIcon={<CheckCircle />}
                      color="success"
                    >
                      Use Existing Installation
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => handleInstallJiracli(true)}
                      disabled={installing}
                      startIcon={<CloudDownload />}
                      color="warning"
                    >
                      Reinstall (Get Latest)
                    </Button>
                  </Box>
                )}
                
                {installComplete && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    jiracli has been successfully installed to ~/.local/bin/jcli!
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configure JIRA Connection
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Set up your JIRA server connection details.
            </Typography>

            {systemStatus.jiraConfig?.exists ? (
              <Box>
                <Alert severity="success" sx={{ mt: 2 }}>
                  JIRA configuration already exists! You can modify it in the Settings tab.
                </Alert>
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    onClick={onSetupComplete}
                    startIcon={<Settings />}
                    size="large"
                  >
                    Continue with Existing Configuration
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box component="form" sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="JIRA Server URL"
                  value={jiraConfig.server}
                  onChange={(e) => setJiraConfig({ ...jiraConfig, server: e.target.value })}
                  placeholder="https://your-company.atlassian.net"
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="Username/Email"
                  value={jiraConfig.username}
                  onChange={(e) => setJiraConfig({ ...jiraConfig, username: e.target.value })}
                  placeholder="your-email@company.com"
                  sx={{ mb: 2 }}
                />

                <FormGroup sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={useToken}
                        onChange={(e) => setUseToken(e.target.checked)}
                      />
                    }
                    label="Use API Token (Recommended)"
                  />
                </FormGroup>

                {useToken ? (
                  <TextField
                    fullWidth
                    label="API Token"
                    type="password"
                    value={jiraConfig.token}
                    onChange={(e) => setJiraConfig({ ...jiraConfig, token: e.target.value })}
                    placeholder="Your JIRA API token"
                    helperText="Generate an API token from your JIRA account settings"
                    sx={{ mb: 2 }}
                  />
                ) : (
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={jiraConfig.password}
                    onChange={(e) => setJiraConfig({ ...jiraConfig, password: e.target.value })}
                    placeholder="Your JIRA password"
                    sx={{ mb: 2 }}
                  />
                )}

                <Button
                  variant="contained"
                  onClick={handleSaveJiraConfig}
                  disabled={!jiraConfig.server || !jiraConfig.username || (!jiraConfig.token && !jiraConfig.password)}
                  startIcon={<Settings />}
                  size="large"
                >
                  Save Configuration
                </Button>
              </Box>
            )}
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Paper elevation={3} className="setup-card" sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom align="center" sx={{ color: '#FFFFFF', mb: 3 }}>
        🚀 Setup Wizard
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label} completed={isStepComplete(index)}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ minHeight: 300 }}>
        {renderStepContent(activeStep)}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
        >
          Back
        </Button>
        
        <Button
          variant="contained"
          onClick={activeStep === steps.length - 1 ? onSetupComplete : handleNext}
          disabled={!canProceed()}
          sx={{ display: activeStep === steps.length - 1 && systemStatus.jiraConfig?.exists ? 'none' : 'block' }}
        >
          {activeStep === steps.length - 1 ? 'Complete' : 'Next'}
        </Button>
      </Box>
    </Paper>
  );
}

export default SetupWizard;