.PHONY: help lint format test clean install-dev

help:
	@echo "Available commands:"
	@echo "  lint        - Run linting checks (flake8, black, isort, mypy)"
	@echo "  format      - Format code with black and isort"
	@echo "  test        - Run tests with pytest"
	@echo "  clean       - Clean up cache files"
	@echo "  install-dev - Install development dependencies"

lint:
	flake8 .
	black --check .
	isort --check-only .
	mypy .

format:
	black .
	isort .

test:
	pytest

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +

install-dev:
	pip install -r requirements-dev.txt