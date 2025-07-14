#!/usr/bin/env python3
"""
Interactive JIRA Issue Creation Script
=====================================

A user-friendly front-end for creating JIRA issues using jiracli.
Guides users through the process with interactive prompts and visual aids.
"""

import sys
import subprocess
import calendar
import datetime
import json
import os
import shutil
from typing import List, Optional


class Colors:
    """ANSI color codes for terminal output"""
    HEADER = "\033[95m"
    OKBLUE = "\033[94m"
    OKCYAN = "\033[96m"
    OKGREEN = "\033[92m"
    WARNING = "\033[93m"
    FAIL = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"


def print_header(text: str):
    """Print a formatted header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text:^60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")


def print_success(text: str):
    """Print success message"""
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")


def print_error(text: str):
    """Print error message"""
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")


def print_info(text: str):
    """Print info message"""
    print(f"{Colors.OKBLUE}ℹ {text}{Colors.ENDC}")


def get_config_dir() -> str:
    """Get the configuration directory for storing jcli path"""
    config_dir = os.path.expanduser("~/.local/share/jcli-interactive")
    os.makedirs(config_dir, exist_ok=True)
    return config_dir


def get_jcli_path_file() -> str:
    """Get the path to the jcli path storage file"""
    return os.path.join(get_config_dir(), "jcli_path")


def save_jcli_path(jcli_path: str) -> None:
    """Save the jcli path to persistent storage"""
    try:
        with open(get_jcli_path_file(), "w") as f:
            f.write(jcli_path)
        print_success(f"Saved jcli path to {get_jcli_path_file()}")
    except Exception as e:
        print_error(f"Failed to save jcli path: {e}")


def load_jcli_path() -> Optional[str]:
    """Load the saved jcli path from persistent storage"""
    try:
        path_file = get_jcli_path_file()
        if os.path.exists(path_file):
            with open(path_file, "r") as f:
                saved_path = f.read().strip()
                if saved_path and os.path.exists(saved_path) and os.access(saved_path, os.X_OK):
                    return saved_path
                else:
                    # Remove invalid saved path
                    os.remove(path_file)
                    print_info("Removed invalid saved jcli path")
        return None
    except Exception as e:
        print_error(f"Failed to load saved jcli path: {e}")
        return None


def check_jcli_command(jcli_path: str) -> bool:
    """Check if a jcli command is working"""
    try:
        result = subprocess.run([jcli_path, "--version"], capture_output=True, text=True, timeout=5)
        return result.returncode == 0
    except:
        return False


def get_user_input(prompt: str, default: Optional[str] = None) -> str:
    """Get user input with optional default value"""
    if default:
        user_input = input(f"{prompt} [{default}]: ").strip()
        return user_input if user_input else default
    else:
        return input(f"{prompt}: ").strip()


def select_from_list(items: List[str], prompt: str, default_index: int = 0) -> str:
    """Display a numbered list and let user select an item"""
    print(f"\n{Colors.OKBLUE}{prompt}{Colors.ENDC}")
    print("-" * 40)
    
    for i, item in enumerate(items, 1):
        marker = f"{Colors.OKGREEN}→{Colors.ENDC}" if i == default_index + 1 else " "
        print(f"{marker} {i}. {item}")
    
    while True:
        try:
            choice = input(f"\nEnter choice (1-{len(items)}) [{default_index + 1}]: ").strip()
            if not choice:
                return items[default_index]
            
            index = int(choice) - 1
            if 0 <= index < len(items):
                return items[index]
            else:
                print_error(f"Please enter a number between 1 and {len(items)}")
        except ValueError:
            print_error("Please enter a valid number")


def display_calendar() -> str:
    """Display a calendar and let user select a date"""
    print_header("SELECT DUE DATE")
    
    today = datetime.date.today()
    current_month = today.month
    current_year = today.year
    
    while True:
        print(f"\n{Colors.OKBLUE}Calendar for {calendar.month_name[current_month]} {current_year}{Colors.ENDC}")
        print("-" * 40)
        
        # Display the calendar
        cal = calendar.monthcalendar(current_year, current_month)
        
        # Print header
        print(" Mo Tu We Th Fr Sa Su")
        
        # Print calendar days
        for week in cal:
            week_str = ""
            for day in week:
                if day == 0:
                    week_str += "   "
                elif day == today.day and current_month == today.month and current_year == today.year:
                    week_str += f"{Colors.OKGREEN}{day:2d}{Colors.ENDC} "
                else:
                    week_str += f"{day:2d} "
            print(week_str)
        
        print(f"\n{Colors.OKGREEN}Today is highlighted{Colors.ENDC}")
        print("Commands: [n]ext month, [p]revious month, [t]oday, or enter date (YYYY-MM-DD)")
        
        user_input = input("\nEnter command or date: ").strip().lower()
        
        if user_input == "n":
            if current_month == 12:
                current_month = 1
                current_year += 1
            else:
                current_month += 1
        elif user_input == "p":
            if current_month == 1:
                current_month = 12
                current_year -= 1
            else:
                current_month -= 1
        elif user_input == "t":
            return today.strftime("%Y-%m-%d")
        elif user_input == "":
            return ""  # No due date
        else:
            # Try to parse as date
            try:
                # Try different formats
                for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y%m%d"]:
                    try:
                        date_obj = datetime.datetime.strptime(user_input, fmt).date()
                        return date_obj.strftime("%Y-%m-%d")
                    except ValueError:
                        continue
                
                # If no format worked, try parsing day only for current month
                day = int(user_input)
                if 1 <= day <= 31:
                    try:
                        date_obj = datetime.date(current_year, current_month, day)
                        return date_obj.strftime("%Y-%m-%d")
                    except ValueError:
                        print_error(f"Invalid day {day} for {calendar.month_name[current_month]}")
                        continue
                
                print_error("Invalid date format. Try YYYY-MM-DD or just the day number")
            except ValueError:
                print_error("Invalid date format. Try YYYY-MM-DD or just the day number")


def find_jcli_command() -> str:
    """Find the jcli command location with user interaction"""
    print_header("JCLI LOCATION DETECTION")
    
    # First, check if we have a saved path
    saved_path = load_jcli_path()
    if saved_path:
        print_info(f"Found saved jcli path: {saved_path}")
        if check_jcli_command(saved_path):
            print_success(f"Using saved jcli at: {saved_path}")
            return saved_path
        else:
            print_error("Saved jcli path is no longer working, searching for new location...")
    
    # Check common locations
    common_locations = [
        "jcli",  # In PATH
        "/usr/local/bin/jcli",  # Common system install
        os.path.expanduser("~/.local/bin/jcli"),  # User local install
    ]
    
    # Add virtual environment paths
    if "VIRTUAL_ENV" in os.environ:
        venv_path = os.path.join(os.environ['VIRTUAL_ENV'], 'bin', 'jcli')
        common_locations.insert(0, venv_path)
    
    # Check if we can find jcli with 'which'
    try:
        result = subprocess.run(['which', 'jcli'], capture_output=True, text=True)
        if result.returncode == 0:
            which_path = result.stdout.strip()
            if which_path not in common_locations:
                common_locations.insert(0, which_path)
    except:
        pass
    
    # Test each location
    working_locations = []
    for location in common_locations:
        if check_jcli_command(location):
            working_locations.append(location)
            print_success(f"Found working jcli at: {location}")
    
    if working_locations:
        selected_path = None
        if len(working_locations) == 1:
            selected_path = working_locations[0]
            print_success(f"Using jcli at: {selected_path}")
        else:
            # If we're in a virtual environment, prefer the venv version
            if "VIRTUAL_ENV" in os.environ:
                venv_path = os.environ['VIRTUAL_ENV']
                for location in working_locations:
                    if location.startswith(venv_path):
                        selected_path = location
                        print_success(f"Using jcli from virtual environment: {selected_path}")
                        break
            
            # Otherwise, ask user to choose
            if not selected_path:
                print_info("Multiple jcli installations found:")
                selected_path = select_from_list(working_locations, "Select jcli installation:", 0)
        
        # Save the selected path
        save_jcli_path(selected_path)
        return selected_path
    
    # If no working location found, ask user
    print_error("Could not automatically detect jcli installation")
    print_info("Common locations to check:")
    print_info("- In virtual environment: $VIRTUAL_ENV/bin/jcli")
    print_info("- User install: ~/.local/bin/jcli")
    print_info("- System install: /usr/local/bin/jcli")
    
    while True:
        custom_path = get_user_input("Enter full path to jcli command")
        if not custom_path:
            print_error("Path is required!")
            continue
            
        # Expand user home directory
        custom_path = os.path.expanduser(custom_path)
        
        if not os.path.exists(custom_path):
            print_error(f"File not found: {custom_path}")
            continue
            
        if not os.access(custom_path, os.X_OK):
            print_error(f"File is not executable: {custom_path}")
            continue
            
        # Test if it's actually jcli
        if check_jcli_command(custom_path):
            print_success(f"Valid jcli found at: {custom_path}")
            # Save the manually entered path
            save_jcli_path(custom_path)
            return custom_path
        else:
            print_error(f"Command failed at {custom_path}")


def extract_project_key(project_display: str) -> str:
    """Extract project key from display format 'KEY - Name' or return as-is"""
    if " - " in project_display:
        return project_display.split(" - ")[0]
    return project_display


def get_priority_options(project: str) -> List[str]:
    """Get available priority options"""
    # Return standard JIRA priority options
    return ["Blocker", "Critical", "Major", "Normal", "Minor"]


def get_epic_description_template() -> str:
    """Get default Epic description template"""
    return """### Goal:
*

### Acceptance Criteria:
*

### Open questions:
Any additional details, questions or decisions that need to be made/addressed
*"""


def get_description_for_issue_type(issue_type: str, summary: str) -> str:
    """Get description for issue, handling templates for specific issue types"""
    if issue_type == "Epic":
        print_header("EPIC DESCRIPTION")
        print_info("Epic issues can use a structured template to help organize information.")
        print_info("You can choose to:")
        print_info("1. Use the default Epic template (recommended)")
        print_info("2. Provide your own custom description")
        print_info("3. Use no description")
        
        options = [
            "Use default Epic template",
            "Provide custom description",
            "No description"
        ]
        
        choice = select_from_list(options, "Choose description option:", 0)
        
        if choice == "Use default Epic template":
            template = get_epic_description_template()
            print_info(
                "Using default Epic template. You can edit this after the issue is created."
            )
            return template
        elif choice == "Provide custom description":
            print_info("Enter your custom description:")
            return get_user_input("Enter issue description (optional)", "")
        else:
            return ""
    else:
        # For non-Epic issues, use the original flow
        print_header("ISSUE DESCRIPTION")
        return get_user_input("Enter issue description (optional)", "")


def get_available_projects(jcli_cmd: str) -> List[str]:
    """Get list of available projects - fallback to common defaults if jcli unavailable"""
    try:
        # Try to get projects by running a simple jcli command and parsing output
        # Since there's no direct "list projects" command, we'll try to get projects
        # from a sample issue listing
        result = subprocess.run(
            [jcli_cmd, "issues", "list", "--max-issues", "10", "--output", "json"], 
            capture_output=True, 
            text=True, 
            timeout=15
        )
        
        if result.returncode == 0 and result.stdout.strip():
            try:
                data = json.loads(result.stdout)
                projects = set()
                
                # Extract project names from issues
                if 'issues' in data and data['issues']:
                    for issue in data['issues']:
                        if 'fields' in issue and 'project' in issue['fields']:
                            project = issue['fields']['project']
                            if 'key' in project and 'name' in project:
                                projects.add(f"{project['key']} - {project['name']}")
                            elif 'key' in project:
                                projects.add(project['key'])
                
                if projects:
                    return sorted(list(projects))
                    
            except json.JSONDecodeError:
                pass
        
        # If that didn't work, try to use a import-based approach as fallback
        try:
            # Try to locate and import jcli module relative to the jcli command
            jcli_dir = os.path.dirname(os.path.abspath(jcli_cmd))
            parent_dir = os.path.dirname(jcli_dir)
            
            # Add potential module paths to sys.path temporarily
            potential_paths = [
                parent_dir,  # For venv installations
                os.path.join(parent_dir, 'lib', 'python*', 'site-packages'),  # venv site-packages
                '/usr/local/lib/python*/site-packages',  # system install
                os.path.expanduser('~/.local/lib/python*/site-packages'),  # user install
            ]
            
            original_path = sys.path.copy()
            
            for path in potential_paths:
                if os.path.exists(path):
                    sys.path.insert(0, path)
            
            from jcli.connector import JiraConnector
            
            jobj = JiraConnector()
            jobj.login()
            
            if jobj.jira is not None:
                projects = jobj.jira.projects()
                project_list = []
                for project in projects:
                    project_list.append(f"{project.key} - {project.name}")
                
                if project_list:
                    return project_list
        except Exception as e:
            print_info(f"Import fallback failed: {e}")
            pass
        finally:
            # Restore original sys.path
            sys.path = original_path
        
        # Final fallback to hardcoded common projects
        print_info("Using default project list (could not fetch from jcli)")
        return ["NSTL", "OTHER"]
        
    except Exception as e:
        print_error(f"Could not fetch projects: {e}")
        print_info("Using default project list")
        return ["NSTL"]


def clear_saved_path():
    """Clear saved jcli path"""
    path_file = get_jcli_path_file()
    if os.path.exists(path_file):
        os.remove(path_file)
        print_success("Cleared saved jcli path")
    else:
        print_info("No saved jcli path found")


def main():
    """Main interactive function"""
    # Check for command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "--clear-path":
            clear_saved_path()
            return 0
        elif sys.argv[1] in ["--help", "-h"]:
            print("JIRA Issue Creation Tool")
            print("Usage: create_issue_interactive.py [--clear-path] [--help]")
            print("")
            print("Options:")
            print("  --clear-path  Clear saved jcli path")
            print("  --help        Show this help message")
            return 0
    
    print_header("JIRA Issue Creation Tool")
    print_info("This tool will guide you through creating a new JIRA issue.")
    print_info("Tip: Use --clear-path to reset saved jcli location")
    
    # Find jcli command location
    jcli_cmd = find_jcli_command()
    if not jcli_cmd:
        print_error("Could not find a working jcli installation")
        return 1
    
    # Test jcli availability
    print_info("Testing jcli connection...")
    try:
        # Test if jcli command is available and working
        result = subprocess.run(
            [jcli_cmd, "myself"], 
            capture_output=True, 
            text=True, 
            timeout=10
        )
        
        if result.returncode == 0:
            print_success("jcli is connected and ready!")
        else:
            print_error("jcli failed to authenticate")
            print_info("Please check your JIRA configuration in ~/.jira.yml")
            if result.stderr:
                print_error(f"Error: {result.stderr.strip()}")
            return 1
        
    except subprocess.TimeoutExpired:
        print_error("jcli command timed out")
        print_info("Please check your JIRA configuration and network connection")
        return 1
    except Exception as e:
        print_error(f"Failed to test jcli: {e}")
        print_info("Please check your JIRA configuration and network connection")
        return 1
    
    # Get project selection
    print_header("PROJECT SELECTION")
    available_projects = get_available_projects(jcli_cmd)
    
    # Find default project (prefer NSTL if available)
    default_index = 0
    for i, proj in enumerate(available_projects):
        if proj.startswith("NSTL") or proj == "NSTL":
            default_index = i
            break
    
    selected_project = select_from_list(available_projects, "Select project:", default_index)
    
    # Extract project key from "KEY - Name" format, or use as-is if it's just the key
    project_key = extract_project_key(selected_project)
    
    # Get issue type
    print_header("ISSUE TYPE")
    issue_types = ["Task", "Epic"]
    issue_type = select_from_list(issue_types, "Select issue type:", 0)
    
    # Get summary
    print_header("ISSUE SUMMARY")
    summary = get_user_input("Enter issue summary")
    while not summary:
        print_error("Summary is required!")
        summary = get_user_input("Enter issue summary")
    
    # Get description (with special handling for Epic issues)
    description = get_description_for_issue_type(issue_type, summary)
    
    # Get Epic Name if issue type is Epic
    epic_name = None
    if issue_type == "Epic":
        print_header("EPIC NAME")
        print_info("Epic issues require an Epic Name field to be set.")
        epic_name = get_user_input("Enter Epic Name", summary)
    
    # Get due date
    due_date = display_calendar()
    
    # Get priority
    print_header("PRIORITY SELECTION")
    priority_options = get_priority_options(project_key)
    priority = select_from_list(priority_options, "Select priority:", 3)  # Default to Normal
    
    # Confirm details
    print_header("CONFIRMATION")
    print(f"{Colors.OKBLUE}Project:{Colors.ENDC} {selected_project}")
    print(f"{Colors.OKBLUE}Issue Type:{Colors.ENDC} {issue_type}")
    print(f"{Colors.OKBLUE}Summary:{Colors.ENDC} {summary}")
    print(f"{Colors.OKBLUE}Description:{Colors.ENDC} {description or '(none)'}")
    if epic_name:
        print(f"{Colors.OKBLUE}Epic Name:{Colors.ENDC} {epic_name}")
    print(f"{Colors.OKBLUE}Due Date:{Colors.ENDC} {due_date or '(none)'}")
    print(f"{Colors.OKBLUE}Priority:{Colors.ENDC} {priority}")
    
    confirm = get_user_input("\nCreate this issue? (y/n)", "y").lower()
    if confirm not in ['y', 'yes']:
        print_info("Issue creation cancelled.")
        return 0
    
    # Build the command
    cmd = [
        jcli_cmd, "issues", "create",
        "--project", project_key,
        "--issue-type", issue_type,
        "--summary", summary,
    ]
    
    if description:
        cmd.extend(["--description", description])
    
    if due_date:
        cmd.extend(["--set-field", "duedate", due_date])
    
    if priority:
        cmd.extend(["--set-field", "priority", priority])
    
    # Add Epic Name field if it's an Epic issue
    if epic_name:
        cmd.extend(["--set-field", "Epic Name", epic_name])
    
    # Execute the command
    print_header("CREATING ISSUE")
    print_info(f"Running: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print_success("Issue created successfully!")
        print(result.stdout)
        return 0
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to create issue: {e}")
        if e.stderr:
            print(f"Error output: {e.stderr}")
        return 1
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())