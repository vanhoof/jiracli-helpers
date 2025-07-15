import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Link,
  Grid,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore,
  Refresh,
  OpenInNew,
  Computer,
  CloudDownload,
  Settings as SettingsIcon
} from '@mui/icons-material';

function Settings({ systemStatus, onStatusChange }) {
  const [jiraConfig, setJiraConfig] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateOutput, setUpdateOutput] = useState('');
  const [updateStatus, setUpdateStatus] = useState(null);

  useEffect(() => {
    loadJiraConfig();
    
    // Listen for installation progress
    const handleInstallProgress = (event, data) => {
      setUpdateOutput(prev => prev + data.data);
    };

    window.electronAPI.onInstallProgress(handleInstallProgress);

    return () => {
      window.electronAPI.removeInstallProgressListener(handleInstallProgress);
    };
  }, []);

  const loadJiraConfig = async () => {
    try {
      const config = await window.electronAPI.getJiraConfig();
      if (config.exists) {
        setJiraConfig(config.content);
      }
      setConfigLoaded(true);
    } catch (error) {
      console.error('Error loading config:', error);
      setConfigLoaded(true);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const result = await window.electronAPI.saveJiraConfig(jiraConfig);
      if (result.success) {
        setSaveStatus({ type: 'success', message: 'Configuration saved successfully!' });
        onStatusChange();
      } else {
        setSaveStatus({ type: 'error', message: `Failed to save: ${result.error}` });
      }
    } catch (error) {
      setSaveStatus({ type: 'error', message: `Error: ${error.message}` });
    }

    // Clear status after 3 seconds
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleRefreshStatus = () => {
    onStatusChange();
  };

  const handleUpdateJiracli = async () => {
    setIsUpdating(true);
    setUpdateOutput('');
    setUpdateStatus(null);

    try {
      const result = await window.electronAPI.updateJiracli();
      if (result.success) {
        setUpdateStatus({ type: 'success', message: 'jiracli updated successfully!' });
        onStatusChange(); // Refresh system status
      } else {
        setUpdateStatus({ type: 'error', message: `Update failed: ${result.message}` });
      }
    } catch (error) {
      setUpdateStatus({ type: 'error', message: `Update error: ${error.message}` });
    } finally {
      setIsUpdating(false);
    }

    // Clear status after 5 seconds
    setTimeout(() => setUpdateStatus(null), 5000);
  };

  const getStatusColor = (status) => {
    if (!status) return 'default';
    if (status.available || status.exists || status.success) return 'success';
    return 'error';
  };

  const getVersionInfo = () => {
    const versions = window.electronAPI.versions;
    const platform = window.electronAPI.platform;
    
    return {
      platform: platform,
      node: versions.node,
      chrome: versions.chrome,
      electron: versions.electron
    };
  };

  const versionInfo = getVersionInfo();

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Settings & Configuration
      </Typography>

      {/* System Status */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Computer sx={{ mr: 1 }} />
            <Typography variant="h6">System Status</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Python</Typography>
                <Chip
                  label={systemStatus.python?.available ? 
                    `✓ ${systemStatus.python.version}` : '✗ Not Found'}
                  color={getStatusColor(systemStatus.python)}
                  variant="outlined"
                />
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>jiracli</Typography>
                <Chip
                  label={systemStatus.jiracli?.available ? 
                    `✓ ${systemStatus.jiracli.version}` : '✗ Not Found'}
                  color={getStatusColor(systemStatus.jiracli)}
                  variant="outlined"
                />
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>JIRA Configuration</Typography>
                <Chip
                  label={systemStatus.jiraConfig?.exists ? '✓ Configured' : '✗ Not Configured'}
                  color={getStatusColor(systemStatus.jiraConfig)}
                  variant="outlined"
                />
              </Paper>
            </Grid>
          </Grid>

          <Button
            variant="outlined"
            onClick={handleRefreshStatus}
            startIcon={<Refresh />}
          >
            Refresh Status
          </Button>
        </AccordionDetails>
      </Accordion>

      {/* jiracli Management */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CloudDownload sx={{ mr: 1 }} />
            <Typography variant="h6">jiracli Management</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Update jiracli to the latest version from the official repository.
          </Typography>
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <Button
              variant="contained"
              onClick={handleUpdateJiracli}
              disabled={isUpdating}
              startIcon={isUpdating ? <CircularProgress size={20} /> : <CloudDownload />}
              color="primary"
              size="large"
            >
              {isUpdating ? 'Updating jiracli...' : 'Update to Latest Version'}
            </Button>
          </Box>

          {updateStatus && (
            <Alert severity={updateStatus.type} sx={{ mt: 2 }}>
              {updateStatus.message}
            </Alert>
          )}

          {(isUpdating || updateOutput) && (
            <Box className="install-progress" sx={{ mt: 3, p: 2, maxHeight: 200, overflow: 'auto' }}>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: '#D4D4D4' }}>
                {updateOutput || 'Starting update process...'}
              </Typography>
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Note:</strong> This will download the latest version of jiracli and replace your current installation. 
            Your JIRA configuration will remain unchanged.
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* JIRA Configuration */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SettingsIcon sx={{ mr: 1 }} />
            <Typography variant="h6">JIRA Configuration</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Edit your JIRA connection configuration. This file is stored at ~/.jira.yml
          </Typography>

          {saveStatus && (
            <Alert severity={saveStatus.type} sx={{ mb: 2 }}>
              {saveStatus.message}
            </Alert>
          )}

          <TextField
            fullWidth
            multiline
            rows={8}
            value={jiraConfig}
            onChange={(e) => setJiraConfig(e.target.value)}
            placeholder={`server: https://your-company.atlassian.net
username: your-email@company.com
token: your-api-token`}
            sx={{ mb: 2, fontFamily: 'monospace' }}
            disabled={!configLoaded}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleSaveConfig}
              disabled={!configLoaded}
            >
              Save Configuration
            </Button>
            <Button
              variant="outlined"
              onClick={loadJiraConfig}
            >
              Reload from File
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Tip:</strong> Use API tokens instead of passwords for better security.{' '}
            <Link 
              href="#" 
              onClick={() => window.electronAPI.openExternal('https://id.atlassian.com/manage-profile/security/api-tokens')}
              sx={{ display: 'inline-flex', alignItems: 'center' }}
            >
              Generate API Token <OpenInNew sx={{ fontSize: 14, ml: 0.5 }} />
            </Link>
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* Application Info */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CloudDownload sx={{ mr: 1 }} />
            <Typography variant="h6">Application Information</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Platform</Typography>
              <Typography variant="body2" color="text.secondary">
                {versionInfo.platform}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Electron</Typography>
              <Typography variant="body2" color="text.secondary">
                {versionInfo.electron}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Node.js</Typography>
              <Typography variant="body2" color="text.secondary">
                {versionInfo.node}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Chrome</Typography>
              <Typography variant="body2" color="text.secondary">
                {versionInfo.chrome}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" color="text.secondary">
            JIRA CLI Helpers v0.1.0 - Cross-platform GUI for JIRA operations
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Link 
              href="#"
              onClick={() => window.electronAPI.openExternal('https://github.com/vanhoof/jiracli-helpers')}
              sx={{ mr: 2 }}
            >
              GitHub Repository <OpenInNew sx={{ fontSize: 14, ml: 0.5 }} />
            </Link>
            <Link 
              href="#"
              onClick={() => window.electronAPI.openExternal('https://github.com/apconole/jiracli')}
            >
              jiracli Project <OpenInNew sx={{ fontSize: 14, ml: 0.5 }} />
            </Link>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

export default Settings;
