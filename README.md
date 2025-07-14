# JIRA CLI Helpers

A collection of Python utilities that provide user-friendly interfaces for common JIRA operations using [jiracli](https://github.com/apconole/jiracli).

## Overview

This repository contains interactive Python scripts that wrap the `jcli` command-line tool to provide enhanced user experiences for JIRA operations. The scripts feature colored terminal output, interactive prompts, and intelligent defaults to streamline common JIRA workflows.

## Prerequisites

### Required Dependencies

1. **jiracli** - Install from [https://github.com/apconole/jiracli](https://github.com/apconole/jiracli)
   ```bash
   git clone https://github.com/apconole/jiracli.git
   cd jiracli
   # Follow the installation instructions in the jiracli repository
   ```

2. **JIRA Configuration** - Configure your JIRA connection in `~/.jira.yml`:
   ```yaml
   server: https://your-jira-instance.atlassian.net
   username: your-username
   password: your-api-token  # Use API token, not password
   ```

3. **Python 3.8+** - Required for all scripts

### Verify Installation

Test your jiracli installation:
```bash
jcli myself
```

If this command succeeds, you're ready to use the helper scripts.

## Current Scripts

### `create_issue_interactive.py`

An interactive JIRA issue creation tool that guides users through the process with visual prompts and intelligent defaults.

**Features:**
- Automatic jcli detection and path persistence
- Project discovery with fallback mechanisms
- Interactive calendar-based date selection
- Support for Epic issues with Epic Name field
- Epic description templates with customizable options
- Priority selection with standard JIRA priorities
- Colored terminal output for better UX
- Input validation and error handling

**Usage:**
```bash
python create_issue_interactive.py
```

**Options:**
- `--clear-path`: Clear saved jcli path and re-detect
- `--help`: Show help message

**Example Workflow:**
1. Script detects and tests jcli installation
2. Fetches available projects from your JIRA instance
3. Interactive selection of project, issue type, and priority
4. For Epic issues: Choose between default template, custom description, or no description
5. Calendar-based due date selection
6. Confirmation before issue creation
7. Automatic issue creation via jcli

**Epic Template Feature:**
When creating Epic issues, you can choose from three options:
- **Use default Epic template**: Pre-structured template with Goal, Acceptance Criteria, and Open Questions sections
- **Provide custom description**: Enter your own description text
- **No description**: Leave the description field empty

The default template includes:
```
### Goal:
*

### Acceptance Criteria:
*

### Open questions:
Any additional details, questions or decisions that need to be made/addressed
*
```

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd jiracli-helpers
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Ensure jiracli is installed and configured (see Prerequisites)

## Development

### Setting Up Development Environment

1. Install development dependencies:
   ```bash
   pip install -r requirements-dev.txt
   ```

2. Run linting:
   ```bash
   flake8 .
   mypy .
   ```

3. Run security checks (optional):
   ```bash
   make security
   ```

4. Run tests:
   ```bash
   pytest
   ```

### Code Quality

This project uses:
- **flake8** for linting
- **mypy** for type checking
- **pytest** for testing
- **safety** for dependency vulnerability scanning
- **bandit** for security issue detection (optional)

Run all quality checks:
```bash
make lint
make test
```

## Configuration

### jcli Path Detection

The scripts automatically detect jcli installation in these locations:
1. Current virtual environment (`$VIRTUAL_ENV/bin/jcli`)
2. System PATH (`which jcli`)
3. User local install (`~/.local/bin/jcli`)
4. System install (`/usr/local/bin/jcli`)

Selected paths are saved to `~/.local/share/jcli-interactive/jcli_path` for faster startup.

### Project Discovery

Projects are discovered through multiple methods:
1. Parsing jcli JSON output from recent issues
2. Direct import of jcli modules (fallback)
3. Hardcoded defaults (final fallback)

## Troubleshooting

### Common Issues

**"Could not find a working jcli installation"**
- Ensure jiracli is installed following the instructions at [https://github.com/apconole/jiracli](https://github.com/apconole/jiracli)
- Check if jcli is in PATH: `which jcli`
- Try manual path specification when prompted

**"jcli failed to authenticate"**
- Verify `~/.jira.yml` configuration
- Test with: `jcli myself`
- Ensure API token (not password) is used

**"Could not fetch projects"**
- Check JIRA connection: `jcli issues list --max-issues 1`
- Verify project permissions in JIRA
- Script will fall back to default project list

### Reset Configuration

Clear saved jcli path:
```bash
python create_issue_interactive.py --clear-path
```

## Future Scripts

This repository will expand to include additional JIRA helper scripts:
- Bulk issue operations
- Sprint management utilities
- Advanced search and filtering tools
- Issue transition workflows
- Reporting and analytics helpers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

[Add your license information here]

## Support

For issues related to:
- **jiracli**: See [https://github.com/apconole/jiracli](https://github.com/apconole/jiracli)
- **These helper scripts**: Open an issue in this repository