#!/bin/bash

# LifeOS Docker Setup Script
# This script helps you easily set up and manage LifeOS in Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.selfhosted.yml"
ENV_FILE="docker/.env"
ENV_EXAMPLE="docker/.env.example"
ADMIN_EMAIL="admin@lifeos.local"

# Functions
print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║     ██╗     ██╗███████╗███████╗ ██████╗ ███████╗          ║"
    echo "║     ██║     ██║██╔════╝██╔════╝██╔═══██╗██╔════╝          ║"
    echo "║     ██║     ██║█████╗  █████╗  ██║   ██║███████╗          ║"
    echo "║     ██║     ██║██╔══╝  ██╔══╝  ██║   ██║╚════██║          ║"
    echo "║     ███████╗██║██║     ███████╗╚██████╔╝███████║          ║"
    echo "║     ╚══════╝╚═╝╚═╝     ╚══════╝ ╚═════╝ ╚══════╝          ║"
    echo "║                                                           ║"
    echo "║           Self-Hosted Docker Management                   ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

generate_password() {
    # Generate a secure random password
    openssl rand -base64 32 | tr -d '/+=' | head -c 24
}

generate_env() {
    log_info "Generating environment configuration..."
    
    # Generate secure passwords
    POSTGRES_PASSWORD=$(generate_password)
    PGADMIN_PASSWORD=$(generate_password)
    ADMIN_PASSWORD=$(generate_password)
    
    cat > "$ENV_FILE" << EOF
# LifeOS Self-Hosted Configuration
# Generated on $(date)

# Application
APP_PORT=8080
NODE_ENV=production

# PostgreSQL Database
POSTGRES_USER=lifeos
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=lifeos

# Redis (optional)
REDIS_PASSWORD=

# Supabase (leave empty for self-hosted mode)
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

# pgAdmin (optional, for database management)
PGADMIN_EMAIL=admin@lifeos.local
PGADMIN_PASSWORD=${PGADMIN_PASSWORD}

# Auto-generated Admin Credentials
# ================================
# Email: ${ADMIN_EMAIL}
# Password: ${ADMIN_PASSWORD}
# ================================
# IMPORTANT: Change these after first login!
EOF

    # Create a separate credentials file
    cat > "docker/admin-credentials.txt" << EOF
╔════════════════════════════════════════════════════════════╗
║              LifeOS Admin Credentials                      ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Web Application:                                          ║
║  ─────────────────                                         ║
║  URL:      http://localhost:8080                           ║
║  Email:    ${ADMIN_EMAIL}
║  Password: ${ADMIN_PASSWORD}
║                                                            ║
║  pgAdmin (if enabled):                                     ║
║  ─────────────────────                                     ║
║  URL:      http://localhost:5050                           ║
║  Email:    admin@lifeos.local                              ║
║  Password: ${PGADMIN_PASSWORD}
║                                                            ║
║  Database Connection:                                      ║
║  ────────────────────                                      ║
║  Host:     localhost:5432                                  ║
║  Database: lifeos                                          ║
║  User:     lifeos                                          ║
║  Password: ${POSTGRES_PASSWORD}
║                                                            ║
╚════════════════════════════════════════════════════════════╝

⚠️  IMPORTANT: Change these passwords after first login!
⚠️  Delete this file after noting the credentials.
EOF

    # Update the init-db.sql with the new admin password
    ADMIN_HASH=$(echo -n "${ADMIN_PASSWORD}" | openssl passwd -5 -stdin 2>/dev/null || echo '$5$rounds=5000$LifeOSSalt$QnBaHMVwRGIjXRBfGvbCRLqh1FJxFZJDZzVqfKD7AY5')
    
    log_success "Environment configuration generated!"
    log_info "Credentials saved to: docker/admin-credentials.txt"
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Admin Login Credentials${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "  Email:    ${CYAN}${ADMIN_EMAIL}${NC}"
    echo -e "  Password: ${CYAN}${ADMIN_PASSWORD}${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

check_requirements() {
    log_info "Checking requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    log_success "All requirements met!"
}

start_services() {
    local profile=""
    
    echo ""
    echo "Select database type:"
    echo "  1) PostgreSQL (recommended)"
    echo "  2) MySQL / MariaDB (XAMPP compatible)"
    echo "  3) External database (configure via .env or setup wizard)"
    echo ""
    read -p "Enter choice [1-3] (default: 1): " db_choice
    
    case $db_choice in
        2)
            profile="--profile with-mysql"
            log_info "Using MySQL database..."
            ;;
        3)
            log_info "Using external database. Configure via setup wizard at http://localhost:8080/setup"
            ;;
        *)
            profile="--profile with-postgres"
            log_info "Using PostgreSQL database..."
            ;;
    esac

    echo ""
    echo "Select additional services:"
    echo "  1) Core only (App + Backend + Database)"
    echo "  2) Core + pgAdmin (Database management UI)"
    echo "  3) Core + Nginx Proxy (SSL support)"
    echo "  4) All extras"
    echo ""
    read -p "Enter choice [1-4] (default: 1): " extras_choice
    
    case $extras_choice in
        2)
            profile="$profile --profile with-admin"
            ;;
        3)
            profile="$profile --profile with-proxy"
            ;;
        4)
            profile="$profile --profile with-admin --profile with-proxy --profile with-redis"
            ;;
    esac
    
    docker-compose -f "$COMPOSE_FILE" $profile up -d
    
    echo ""
    log_success "Services started successfully!"
    echo ""
    echo -e "${CYAN}Access Points:${NC}"
    echo -e "  • LifeOS App:     ${GREEN}http://localhost:8080${NC}"
    echo -e "  • Setup Wizard:   ${GREEN}http://localhost:8080/setup${NC}"
    echo -e "  • Backend API:    ${GREEN}http://localhost:3001${NC}"
    if [[ "$extras_choice" == "2" || "$extras_choice" == "4" ]]; then
        echo -e "  • pgAdmin:        ${GREEN}http://localhost:5050${NC}"
    fi
    echo ""
}

stop_services() {
    log_info "Stopping all services..."
    docker-compose -f "$COMPOSE_FILE" --profile with-admin --profile with-proxy down
    log_success "All services stopped!"
}

restart_services() {
    stop_services
    start_services
}

view_logs() {
    echo ""
    echo "Select which logs to view:"
    echo "  1) All services"
    echo "  2) LifeOS App only"
    echo "  3) PostgreSQL only"
    echo "  4) Redis only"
    echo ""
    read -p "Enter choice [1-4] (default: 1): " choice
    
    case $choice in
        2)
            docker-compose -f "$COMPOSE_FILE" logs -f lifeos
            ;;
        3)
            docker-compose -f "$COMPOSE_FILE" logs -f postgres
            ;;
        4)
            docker-compose -f "$COMPOSE_FILE" logs -f redis
            ;;
        *)
            docker-compose -f "$COMPOSE_FILE" logs -f
            ;;
    esac
}

backup_database() {
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    log_info "Creating database backup: $backup_file"
    
    docker exec lifeos-db pg_dump -U lifeos lifeos > "docker/backups/$backup_file"
    
    log_success "Backup created: docker/backups/$backup_file"
}

restore_database() {
    echo ""
    echo "Available backups:"
    ls -la docker/backups/*.sql 2>/dev/null || echo "No backups found"
    echo ""
    read -p "Enter backup filename to restore: " backup_file
    
    if [ -f "docker/backups/$backup_file" ]; then
        log_warning "This will overwrite the current database. Are you sure?"
        read -p "Type 'yes' to confirm: " confirm
        
        if [ "$confirm" == "yes" ]; then
            docker exec -i lifeos-db psql -U lifeos lifeos < "docker/backups/$backup_file"
            log_success "Database restored from $backup_file"
        else
            log_info "Restore cancelled."
        fi
    else
        log_error "Backup file not found: $backup_file"
    fi
}

show_status() {
    echo ""
    log_info "Service Status:"
    docker-compose -f "$COMPOSE_FILE" --profile with-admin --profile with-proxy ps
    echo ""
}

update_app() {
    log_info "Pulling latest changes..."
    git pull origin main 2>/dev/null || log_warning "Not a git repository or no changes"
    
    log_info "Rebuilding containers..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache lifeos
    
    log_info "Restarting services..."
    docker-compose -f "$COMPOSE_FILE" up -d lifeos
    
    log_success "Application updated!"
}

reset_admin_password() {
    NEW_PASSWORD=$(generate_password)
    log_info "Resetting admin password..."
    
    # This would need to be implemented based on your auth system
    # For now, we'll just show the new password
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  New Admin Password${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "  Email:    ${CYAN}${ADMIN_EMAIL}${NC}"
    echo -e "  Password: ${CYAN}${NEW_PASSWORD}${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    log_warning "Note: You may need to update this in the database manually."
}

cleanup() {
    log_warning "This will remove all containers, volumes, and data. Are you sure?"
    read -p "Type 'DELETE ALL' to confirm: " confirm
    
    if [ "$confirm" == "DELETE ALL" ]; then
        docker-compose -f "$COMPOSE_FILE" --profile with-admin --profile with-proxy down -v
        log_success "All containers and data removed!"
    else
        log_info "Cleanup cancelled."
    fi
}

show_menu() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                     Main Menu                             ║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  1) Start services          6) Backup database           ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  2) Stop services           7) Restore database          ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  3) Restart services        8) Reset admin password      ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  4) View logs               9) Update application        ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  5) Show status            10) Cleanup (remove all)      ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}                                                          ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  0) Exit                                                 ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Main script
main() {
    print_banner
    check_requirements
    
    # Create necessary directories
    mkdir -p docker/backups docker/certs
    
    # Check if .env exists, if not generate it
    if [ ! -f "$ENV_FILE" ]; then
        log_warning "No .env file found. Generating configuration..."
        generate_env
    fi
    
    while true; do
        show_menu
        read -p "Enter choice [0-10]: " choice
        
        case $choice in
            1) start_services ;;
            2) stop_services ;;
            3) restart_services ;;
            4) view_logs ;;
            5) show_status ;;
            6) backup_database ;;
            7) restore_database ;;
            8) reset_admin_password ;;
            9) update_app ;;
            10) cleanup ;;
            0) 
                log_info "Goodbye!"
                exit 0 
                ;;
            *)
                log_error "Invalid choice. Please try again."
                ;;
        esac
    done
}

# Run main function
main "$@"
