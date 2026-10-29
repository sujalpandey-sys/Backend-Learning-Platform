.PHONY: help install dev test lint format migrate docker-up docker-down clean

help:
	@echo "Available Makefile targets:"
	@echo "  make install     - Install project dependencies into active virtualenv"
	@echo "  make dev         - Run development server with auto-reload"
	@echo "  make test        - Run automated tests with code coverage"
	@echo "  make lint        - Run Ruff linting and formatting verification"
	@echo "  make format      - Auto-format code using Ruff"
	@echo "  make migrate     - Run Alembic database migrations to head"
	@echo "  make docker-up   - Build and start containers in the background"
	@echo "  make docker-down - Stop and tear down containers"
	@echo "  make clean       - Remove caches and temporary test artifacts"

install:
	pip install --upgrade pip
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

test:
	pytest --cov=app --cov-report=term-missing

lint:
	ruff check .
	ruff format --check .

format:
	ruff check --fix .
	ruff format .

migrate:
	alembic upgrade head

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

clean:
	rm -rf .pytest_cache .coverage htmlcov .ruff_cache
	find . -type d -name "__pycache__" -exec rm -rf {} +

