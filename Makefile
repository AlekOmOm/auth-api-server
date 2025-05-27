# .env file

FRONTEND_PORT = process.env.FRONTEND_PORT || 3000
BACKEND_PORT = process.env.BACKEND_PORT || 5000
POSTGRES_PORT = process.env.POSTGRES_PORT || 5432

# ==============================================================================
# DOCKER COMPOSE COMMANDS
# ==============================================================================

# Start all services in detached mode
run: setup-env
	@echo "Starting all services with Docker Compose..."
	@docker compose up -d
	@echo "Services are running in the background"
	@echo " Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo " Backend: http://localhost:$(BACKEND_PORT)"
	@echo " Database: localhost:$(POSTGRES_PORT)"

# Stop all services
stop:
	@echo "Stopping all Docker Compose services..."
	@docker compose stop
	@echo "All services stopped"

# Remove containers (keeps images and volumes)
clean:
	@echo "Removing Docker Compose containers..."
	@docker compose down
	@echo "Containers removed"

# Full cleanup - removes containers, images, and volumes
clean-full:
	@echo "Performing full cleanup (containers, images, volumes)..."
	@docker compose down -v --rmi all --remove-orphans
	@echo "Full cleanup completed"

# Show logs for all services
logs:
	@echo "Showing Docker Compose logs..."
	@docker compose logs -f

# Show logs for specific service
logs-db:
	@echo "Showing database logs..."
	@docker compose logs -f db

logs-backend:
	@echo "Showing backend logs..."
	@docker compose logs -f backend

logs-frontend:
	@echo "Showing frontend logs..."
	@docker compose logs -f frontend

# Show status of all services
status:
	@docker compose ps

# Restart all services
restart: stop run

# Rebuild and start services
rebuild:
	@echo "Rebuilding and starting services..."
	@docker compose up -d --build
	@echo "Services rebuilt and started"

# ==============================================================================
# DEVELOPMENT COMMANDS (Non-Docker)
# ==============================================================================

setup-frontend:
	@echo "Setting up frontend..."
	@cd frontend && npm install
	@echo "FRONTEND_PORT: $(FRONTEND_PORT)"

setup-backend:
	@echo "Setting up backend..."
	@cd backend && npm install
	@echo "BACKEND_PORT: $(BACKEND_PORT)"

# run-frontend
dev-frontend:
	@echo "Running frontend..."
	@cd frontend && npm run dev

# dev backend
dev-backend:
	@echo "Running backend..."
	@cd backend && npm run dev
	@echo "Backend running on http://localhost:5000"

# run fullstack
dev-fullstack:
	@echo "Running fullstack..."
	@cd backend && npm run dev & cd frontend && npm run dev
	@echo "Fullstack running on http://localhost:3000"

# ==============================================================================
# ENVIRONMENT SETUP
# ==============================================================================

# setup environment
setup-env:
	@node .\scripts\setup-env.js

gen-ses-secret: setup-env
	@node .\scripts\gen-ses-secret.js
	@echo  .. updated .env with session secret

# ==============================================================================
# HELP
# ==============================================================================

# help
help:
	@echo "  Auth-System Makefile Commands"
	@echo "===================================================================="
	@echo ""
	@echo " DOCKER COMPOSE COMMANDS:"
	@echo "  run          - Start all services (docker compose up -d)"
	@echo "  stop         - Stop all services"
	@echo "  clean        - Remove containers (keeps images/volumes)"
	@echo "  clean-full   - Full cleanup (containers + images + volumes)"
	@echo "  logs         - Show logs for all services"
	@echo "  logs-db      - Show database logs only"
	@echo "  logs-backend - Show backend logs only"  
	@echo "  logs-frontend- Show frontend logs only"
	@echo "  status       - Show service status"
	@echo "  restart      - Stop and start services"
	@echo "  rebuild      - Rebuild and start services"
	@echo ""
	@echo " DEVELOPMENT COMMANDS (Non-Docker):"
	@echo "  setup-frontend   - Install frontend dependencies"
	@echo "  setup-backend    - Install backend dependencies"
	@echo "  dev-frontend     - Run frontend in development mode"
	@echo "  dev-backend      - Run backend in development mode"
	@echo "  dev-fullstack    - Run both frontend and backend"
	@echo ""
	@echo " ENVIRONMENT SETUP:"
	@echo "  setup-env        - Setup environment files"
	@echo "  gen-ses-secret   - Generate session secret"
	@echo ""
	@echo "===================================================================="
	@echo "Quick Start: make setup-env && make gen-ses-secret && make run"

# Default target
.DEFAULT_GOAL := help

# Declare phony targets
.PHONY: run stop clean clean-full logs logs-db logs-backend logs-frontend status restart rebuild
.PHONY: setup-frontend setup-backend dev-frontend dev-backend dev-fullstack
.PHONY: setup-env gen-ses-secret help



