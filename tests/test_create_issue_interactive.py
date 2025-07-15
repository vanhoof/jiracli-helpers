"""
Tests for create_issue_interactive.py

These tests focus on unit testing individual functions without requiring
actual jcli installation or JIRA connectivity.
"""
import os
import tempfile
import unittest.mock as mock
from unittest.mock import MagicMock, patch

import pytest

# Import the module under test
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src"))
from create_issue_interactive import (
    Colors,
    extract_project_key,
    get_priority_options,
    print_header,
    print_success,
    print_error,
    print_info,
    check_jcli_command,
    get_user_input,
    save_jcli_path,
    load_jcli_path,
    get_config_dir,
    get_jcli_path_file,
    get_epic_description_template,
    get_description_for_issue_type,
)


class TestColors:
    """Test the Colors class has expected constants"""

    def test_colors_defined(self):
        """Test that color constants are defined"""
        assert hasattr(Colors, "HEADER")
        assert hasattr(Colors, "OKGREEN")
        assert hasattr(Colors, "FAIL")
        assert hasattr(Colors, "ENDC")


class TestUtilityFunctions:
    """Test utility functions"""

    def test_extract_project_key_with_dash(self):
        """Test extracting project key from 'KEY - Name' format"""
        result = extract_project_key("PROJ - Project Name")
        assert result == "PROJ"

    def test_extract_project_key_without_dash(self):
        """Test extracting project key when no dash present"""
        result = extract_project_key("PROJ")
        assert result == "PROJ"

    def test_get_priority_options(self):
        """Test getting priority options"""
        priorities = get_priority_options("TEST")
        expected = ["Blocker", "Critical", "Major", "Normal", "Minor"]
        assert priorities == expected


class TestPrintFunctions:
    """Test print functions (these test the functions don't crash)"""

    @patch("builtins.print")
    def test_print_header(self, mock_print):
        """Test print_header function"""
        print_header("Test Header")
        assert mock_print.called

    @patch("builtins.print")
    def test_print_success(self, mock_print):
        """Test print_success function"""
        print_success("Success message")
        assert mock_print.called

    @patch("builtins.print")
    def test_print_error(self, mock_print):
        """Test print_error function"""
        print_error("Error message")
        assert mock_print.called

    @patch("builtins.print")
    def test_print_info(self, mock_print):
        """Test print_info function"""
        print_info("Info message")
        assert mock_print.called


class TestJcliCommand:
    """Test jcli command related functions"""

    @patch("subprocess.run")
    def test_check_jcli_command_success(self, mock_run):
        """Test successful jcli command check"""
        mock_run.return_value = MagicMock(returncode=0)
        result = check_jcli_command("/usr/bin/jcli")
        assert result is True
        mock_run.assert_called_once_with(
            ["/usr/bin/jcli", "--version"], capture_output=True, text=True, timeout=5
        )

    @patch("subprocess.run")
    def test_check_jcli_command_failure(self, mock_run):
        """Test failed jcli command check"""
        mock_run.return_value = MagicMock(returncode=1)
        result = check_jcli_command("/usr/bin/jcli")
        assert result is False

    @patch("subprocess.run")
    def test_check_jcli_command_exception(self, mock_run):
        """Test jcli command check with exception"""
        mock_run.side_effect = Exception("Command failed")
        result = check_jcli_command("/usr/bin/jcli")
        assert result is False


class TestUserInput:
    """Test user input functions"""

    @patch("builtins.input")
    def test_get_user_input_with_default(self, mock_input):
        """Test get_user_input with default value"""
        mock_input.return_value = ""
        result = get_user_input("Enter value", "default")
        assert result == "default"

    @patch("builtins.input")
    def test_get_user_input_with_custom_value(self, mock_input):
        """Test get_user_input with custom value"""
        mock_input.return_value = "custom"
        result = get_user_input("Enter value", "default")
        assert result == "custom"

    @patch("builtins.input")
    def test_get_user_input_without_default(self, mock_input):
        """Test get_user_input without default value"""
        mock_input.return_value = "user_input"
        result = get_user_input("Enter value")
        assert result == "user_input"


class TestConfigManagement:
    """Test configuration management functions"""

    def test_get_config_dir(self):
        """Test getting config directory"""
        config_dir = get_config_dir()
        assert config_dir.endswith("/.local/share/jiracli-helpers")

    def test_get_jcli_path_file(self):
        """Test getting jcli path file"""
        path_file = get_jcli_path_file()
        assert path_file.endswith("/.local/share/jiracli-helpers/jcli_path")

    def test_save_and_load_jcli_path(self):
        """Test saving and loading jcli path"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            test_path = "/usr/bin/jcli"
            test_file = os.path.join(tmp_dir, "jcli_path")

            # Mock the path file function
            with patch(
                "create_issue_interactive.get_jcli_path_file", return_value=test_file
            ):
                with patch("create_issue_interactive.print_success"):
                    save_jcli_path(test_path)

                    # Test that file was created
                    assert os.path.exists(test_file)

                    # Test loading the path
                    with patch("os.path.exists", return_value=True):
                        with patch("os.access", return_value=True):
                            loaded_path = load_jcli_path()
                            assert loaded_path == test_path

    def test_load_jcli_path_nonexistent(self):
        """Test loading jcli path when file doesn't exist"""
        with patch(
            "create_issue_interactive.get_jcli_path_file",
            return_value="/nonexistent/file",
        ):
            result = load_jcli_path()
            assert result is None


class TestEpicTemplate:
    """Test Epic template functionality"""

    def test_get_epic_description_template(self):
        """Test getting Epic description template"""
        template = get_epic_description_template()

        # Check that template contains expected sections
        assert "h3. Goal:" in template
        assert "h3. Acceptance Criteria:" in template
        assert "h3. Open questions:" in template
        assert "Any additional details" in template

        # Check that bullet points are present
        assert "* _Add your" in template

        # Check template structure
        lines = template.split("\n")
        assert len(lines) >= 8  # Should have multiple lines

    @patch("create_issue_interactive.select_from_list")
    @patch("create_issue_interactive.print_header")
    @patch("create_issue_interactive.print_info")
    def test_get_description_for_issue_type_epic_template(
        self, mock_print_info, mock_print_header, mock_select
    ):
        """Test getting description for Epic with template option"""
        mock_select.return_value = "Use default Epic template"

        result = get_description_for_issue_type("Epic", "Test Epic")

        # Should return the template
        assert "h3. Goal:" in result
        assert "h3. Acceptance Criteria:" in result
        assert "h3. Open questions:" in result

        # Check that appropriate functions were called
        mock_print_header.assert_called_once_with("EPIC DESCRIPTION")
        assert mock_print_info.call_count >= 3
        mock_select.assert_called_once()

    @patch("create_issue_interactive.select_from_list")
    @patch("create_issue_interactive.get_user_input")
    @patch("create_issue_interactive.print_header")
    @patch("create_issue_interactive.print_info")
    def test_get_description_for_issue_type_epic_custom(
        self, mock_print_info, mock_print_header, mock_input, mock_select
    ):
        """Test getting description for Epic with custom option"""
        mock_select.return_value = "Provide custom description"
        mock_input.return_value = "Custom epic description"

        result = get_description_for_issue_type("Epic", "Test Epic")

        # Should return custom description
        assert result == "Custom epic description"

        # Check that appropriate functions were called
        mock_print_header.assert_called_once_with("EPIC DESCRIPTION")
        mock_select.assert_called_once()
        mock_input.assert_called_once()

    @patch("create_issue_interactive.select_from_list")
    @patch("create_issue_interactive.print_header")
    @patch("create_issue_interactive.print_info")
    def test_get_description_for_issue_type_epic_no_description(
        self, mock_print_info, mock_print_header, mock_select
    ):
        """Test getting description for Epic with no description option"""
        mock_select.return_value = "No description"

        result = get_description_for_issue_type("Epic", "Test Epic")

        # Should return empty string
        assert result == ""

        # Check that appropriate functions were called
        mock_print_header.assert_called_once_with("EPIC DESCRIPTION")
        mock_select.assert_called_once()

    @patch("create_issue_interactive.get_user_input")
    @patch("create_issue_interactive.print_header")
    def test_get_description_for_issue_type_task(
        self, mock_print_header, mock_input
    ):
        """Test getting description for non-Epic issue type"""
        mock_input.return_value = "Task description"

        result = get_description_for_issue_type("Task", "Test Task")

        # Should return the input description
        assert result == "Task description"

        # Check that appropriate functions were called
        mock_print_header.assert_called_once_with("ISSUE DESCRIPTION")
        mock_input.assert_called_once_with("Enter issue description (optional)", "")


if __name__ == "__main__":
    pytest.main([__file__])