
# .env file


FRONTEND_PORT = process.env.FRONTEND_PORT || 3000
BACKEND_PORT = process.env.BACKEND_PORT || 5000

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


# help
help:
	@echo "Makefile commands:"
	@echo "------------------------------------------------------------"
	@echo "  "
	@echo " - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -"
	@echo "  setup-frontend: Setup frontend"
	@echo "  setup-backend: Setup backend"
	@echo "  setup-fullstack: Setup fullstack"
	@echo "  "
	@echo " - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -"
	@echo "  dev-frontend: Run frontend"
	@echo "  dev-backend: Run backend"
	@echo "  dev-fullstack: Run fullstack"
	@echo "  "
	@echo " - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -"
	@echo "  "
	@echo "  "
	@echo "  "
	@echo "  "
	@echo "  "
	@echo "------------------------------------------------------------"



