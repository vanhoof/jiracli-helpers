.PHONY: help lint security format test clean install-dev

help:
	@echo "Available commands:"
	@echo "  lint        - Run linting checks (flake8, mypy)"
	@echo "  security    - Run security checks (safety, bandit)"
	@echo "  format      - Code formatting disabled"
	@echo "  test        - Run tests with pytest"
	@echo "  clean       - Clean up cache files"
	@echo "  install-dev - Install development dependencies"

lint:
	flake8 .
	mypy .

security:
	@echo "Running security checks..."
	safety check || true
	bandit -r . || true

format:
	@echo "Code formatting disabled. Use your preferred formatter manually."

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