#!/bin/bash

#==============================================================================
# Node Monitor - Interactive Setup Script
#==============================================================================
#
# This script helps you configure and deploy Node Monitor with an easy
# interactive wizard. It will:
#   - Prompt for all configuration values
#   - Generate .env file
#   - Generate nginx configuration
#   - Generate systemd service file
#   - Install dependencies
#   - Set up SSH keys
#   - Deploy the application
#
# Usage:
#   ./setup.sh
#
#==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Configuration variables
CONFIG=()

#==============================================================================
# Helper Functions
#==============================================================================

print_header() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Prompt for input with default value
prompt() {
    local var_name=$1
    local prompt_text=$2
    local default_value=$3
    local value

    if [ -n "$default_value" ]; then
        read -p "$(echo -e ${CYAN}$prompt_text ${NC}[${GREEN}$default_value${NC}]: )" value
        value=${value:-$default_value}
    else
        read -p "$(echo -e ${CYAN}$prompt_text: ${NC})" value
        while [ -z "$value" ]; do
            print_error "This value is required"
            read -p "$(echo -e ${CYAN}$prompt_text: ${NC})" value
        done
    fi

    CONFIG[$var_name]="$value"
}

# Prompt for yes/no
prompt_yes_no() {
    local prompt_text=$1
    local default=${2:-n}
    local response

    if [ "$default" = "y" ]; then
        read -p "$(echo -e ${CYAN}$prompt_text ${NC}[${GREEN}Y/n${NC}]: )" response
        response=${response:-y}
    else
        read -p "$(echo -e ${CYAN}$prompt_text ${NC}[y/${GREEN}N${NC}]: )" response
        response=${response:-n}
    fi

    [[ "$response" =~ ^[Yy] ]]
}

# Validate domain name
validate_domain() {
    local domain=$1
    if [[ $domain =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$ ]] || \
       [[ $domain =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        return 0
    fi
    return 1
}

# Validate port number
validate_port() {
    local port=$1
    if [[ $port =~ ^[0-9]+$ ]] && [ $port -ge 1 ] && [ $port -le 65535 ]; then
        return 0
    fi
    return 1
}

# Generate random secret
generate_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 64 | tr -d '\n'
    else
        cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1
    fi
}

# Replace template variables
replace_template() {
    local template_file=$1
    local output_file=$2
    local content

    content=$(cat "$template_file")

    for key in "${!CONFIG[@]}"; do
        content="${content//\{\{$key\}\}/${CONFIG[$key]}}"
    done

    echo "$content" > "$output_file"
}

#==============================================================================
# Check Prerequisites
#==============================================================================

check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing=()

    # Check for required commands
    for cmd in node npm nginx git; do
        if command -v $cmd &> /dev/null; then
            print_success "$cmd is installed"
        else
            print_error "$cmd is NOT installed"
            missing+=($cmd)
        fi
    done

    # Check Node.js version
    if command -v node &> /dev/null; then
        node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -ge 18 ]; then
            print_success "Node.js version is sufficient (v$(node -v))"
        else
            print_warning "Node.js version $(node -v) detected. Version 18+ recommended"
        fi
    fi

    # Check for Python (for PAM auth)
    if command -v python3 &> /dev/null; then
        print_success "Python 3 is installed"
    else
        print_warning "Python 3 is not installed (required for PAM authentication)"
    fi

    # Check for SSH
    if command -v ssh &> /dev/null; then
        print_success "SSH is installed"
    else
        print_error "SSH is NOT installed"
        missing+=(openssh-client)
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        echo
        print_error "Missing prerequisites: ${missing[*]}"
        print_info "Install them with: sudo apt install ${missing[*]}"
        echo
        if ! prompt_yes_no "Continue anyway?" "n"; then
            exit 1
        fi
    fi

    echo
}

#==============================================================================
# Configuration Wizard
#==============================================================================

run_configuration_wizard() {
    print_header "Configuration Wizard"

    print_info "This wizard will ask you for all required configuration values."
    print_info "Press Enter to accept default values shown in [brackets]."
    echo

    # Application Settings
    echo -e "${YELLOW}━━━ Application Settings ━━━${NC}"
    prompt "APP_NAME" "Application name" "Node Monitor"
    prompt "APP_SHORT_NAME" "Short name" "Nodes"
    echo

    # Server Settings
    echo -e "${YELLOW}━━━ Server Settings ━━━${NC}"

    current_user=$(whoami)
    prompt "SYSTEM_USER" "System user to run the service" "$current_user"

    prompt "PORT" "Backend port" "3001"
    while ! validate_port "${CONFIG[PORT]}"; do
        print_error "Invalid port number"
        prompt "PORT" "Backend port" "3001"
    done

    prompt "DOMAIN_NAME" "Domain name (e.g., monitor.example.com)" "localhost"

    if [ "${CONFIG[DOMAIN_NAME]}" != "localhost" ]; then
        CONFIG[FRONTEND_URL]="https://${CONFIG[DOMAIN_NAME]}"
        CONFIG[NODE_ENV]="production"
    else
        CONFIG[FRONTEND_URL]="http://localhost:5173"
        CONFIG[NODE_ENV]="development"
    fi
    echo

    # Security
    echo -e "${YELLOW}━━━ Security ━━━${NC}"
    print_info "Generating JWT secret..."
    CONFIG[JWT_SECRET]=$(generate_secret)
    print_success "JWT secret generated (64 characters)"
    echo

    # Local Node Configuration
    echo -e "${YELLOW}━━━ Local Node Configuration ━━━${NC}"
    print_info "Which node will the backend run on?"
    echo "  node1 - Backend runs on first node"
    echo "  node2 - Backend runs on second node"
    echo "  none  - Backend runs on separate machine"
    prompt "NODE_LOCAL_ID" "Local node ID" "node2"
    echo

    # SSH Configuration
    echo -e "${YELLOW}━━━ SSH Configuration ━━━${NC}"
    prompt "SSH_USER" "SSH username for monitoring" "monitor"

    default_key_path="$HOME/.ssh/node_monitor"
    prompt "SSH_KEY_PATH" "SSH key path" "$default_key_path"
    CONFIG[SSH_KEY_PATH]="${CONFIG[SSH_KEY_PATH]}"

    # Check if key exists
    if [ ! -f "${CONFIG[SSH_KEY_PATH]}" ]; then
        if prompt_yes_no "SSH key not found. Generate new key?" "y"; then
            CONFIG[GENERATE_SSH_KEY]="yes"
        fi
    fi
    echo

    # Node 1 Configuration
    echo -e "${YELLOW}━━━ Node 1 Configuration ━━━${NC}"
    prompt "NODE1_HOST" "Node 1 hostname/IP" "node1.example.com"
    prompt "NODE1_LABEL" "Node 1 display label" "Node 1"
    prompt "NODE1_SSH_PORT" "Node 1 SSH port" "22"
    echo

    # Node 2 Configuration
    echo -e "${YELLOW}━━━ Node 2 Configuration ━━━${NC}"
    prompt "NODE2_HOST" "Node 2 hostname/IP" "node2.example.com"
    prompt "NODE2_LABEL" "Node 2 display label" "Node 2"
    prompt "NODE2_SSH_PORT" "Node 2 SSH port" "22"
    echo

    # Database
    echo -e "${YELLOW}━━━ Database ━━━${NC}"
    prompt "DB_PATH" "Database file path" "./data/node-monitor.db"
    echo

    # Deployment Paths
    echo -e "${YELLOW}━━━ Deployment Settings ━━━${NC}"
    CONFIG[APP_DIR]="$SCRIPT_DIR"
    CONFIG[SERVICE_NAME]="node-monitor"

    print_info "Application directory: ${CONFIG[APP_DIR]}"
    print_info "Service name: ${CONFIG[SERVICE_NAME]}"
    echo
}

#==============================================================================
# Show Configuration Summary
#==============================================================================

show_configuration_summary() {
    print_header "Configuration Summary"

    cat << EOF
${CYAN}Application:${NC}
  Name:              ${CONFIG[APP_NAME]}
  Short Name:        ${CONFIG[APP_SHORT_NAME]}

${CYAN}Server:${NC}
  System User:       ${CONFIG[SYSTEM_USER]}
  Backend Port:      ${CONFIG[PORT]}
  Domain:            ${CONFIG[DOMAIN_NAME]}
  Frontend URL:      ${CONFIG[FRONTEND_URL]}
  Environment:       ${CONFIG[NODE_ENV]}

${CYAN}Nodes:${NC}
  Local Node:        ${CONFIG[NODE_LOCAL_ID]}

  Node 1:
    Host:            ${CONFIG[NODE1_HOST]}
    Label:           ${CONFIG[NODE1_LABEL]}
    SSH Port:        ${CONFIG[NODE1_SSH_PORT]}

  Node 2:
    Host:            ${CONFIG[NODE2_HOST]}
    Label:           ${CONFIG[NODE2_LABEL]}
    SSH Port:        ${CONFIG[NODE2_SSH_PORT]}

${CYAN}SSH:${NC}
  Username:          ${CONFIG[SSH_USER]}
  Key Path:          ${CONFIG[SSH_KEY_PATH]}
  Generate Key:      ${CONFIG[GENERATE_SSH_KEY]:-no}

${CYAN}Paths:${NC}
  Application:       ${CONFIG[APP_DIR]}
  Database:          ${CONFIG[DB_PATH]}
  Service Name:      ${CONFIG[SERVICE_NAME]}

${CYAN}Security:${NC}
  JWT Secret:        $(echo ${CONFIG[JWT_SECRET]} | cut -c1-10)... (hidden)
EOF

    echo
}

#==============================================================================
# Generate Configuration Files
#==============================================================================

generate_configuration_files() {
    print_header "Generating Configuration Files"

    # Generate .env file
    print_info "Generating backend/.env..."
    replace_template "$SCRIPT_DIR/templates/.env.template" "$SCRIPT_DIR/backend/.env"
    print_success "Created backend/.env"

    # Generate nginx.conf
    if [ "${CONFIG[NODE_ENV]}" = "production" ]; then
        print_info "Generating nginx.conf..."
        replace_template "$SCRIPT_DIR/templates/nginx.conf.template" "$SCRIPT_DIR/nginx.conf"
        print_success "Created nginx.conf"
    else
        print_info "Skipping nginx.conf (development mode)"
    fi

    # Generate systemd service file
    if [ "${CONFIG[NODE_ENV]}" = "production" ]; then
        print_info "Generating systemd service file..."
        replace_template "$SCRIPT_DIR/templates/systemd.service.template" "$SCRIPT_DIR/${CONFIG[SERVICE_NAME]}.service"
        print_success "Created ${CONFIG[SERVICE_NAME]}.service"
    fi

    echo
}

#==============================================================================
# Generate SSH Key
#==============================================================================

generate_ssh_key() {
    if [ "${CONFIG[GENERATE_SSH_KEY]}" = "yes" ]; then
        print_header "Generating SSH Key"

        local key_path="${CONFIG[SSH_KEY_PATH]}"
        local key_dir=$(dirname "$key_path")

        # Create .ssh directory if it doesn't exist
        mkdir -p "$key_dir"
        chmod 700 "$key_dir"

        # Generate key
        print_info "Generating SSH key at $key_path..."
        ssh-keygen -t ed25519 -C "node-monitor" -f "$key_path" -N ""
        print_success "SSH key generated"

        # Show public key
        echo
        print_info "Public key (copy this to your nodes):"
        echo -e "${GREEN}$(cat ${key_path}.pub)${NC}"
        echo

        print_warning "You need to copy this key to your nodes:"
        echo "  For Node 1: ssh-copy-id -i ${key_path}.pub -p ${CONFIG[NODE1_SSH_PORT]} ${CONFIG[SSH_USER]}@${CONFIG[NODE1_HOST]}"
        echo "  For Node 2: ssh-copy-id -i ${key_path}.pub -p ${CONFIG[NODE2_SSH_PORT]} ${CONFIG[SSH_USER]}@${CONFIG[NODE2_HOST]}"
        echo

        if prompt_yes_no "Copy key to nodes now?" "n"; then
            if [ "${CONFIG[NODE_LOCAL_ID]}" != "node1" ]; then
                print_info "Copying to Node 1..."
                ssh-copy-id -i "${key_path}.pub" -p "${CONFIG[NODE1_SSH_PORT]}" "${CONFIG[SSH_USER]}@${CONFIG[NODE1_HOST]}" || print_warning "Failed to copy to Node 1"
            fi
            if [ "${CONFIG[NODE_LOCAL_ID]}" != "node2" ]; then
                print_info "Copying to Node 2..."
                ssh-copy-id -i "${key_path}.pub" -p "${CONFIG[NODE2_SSH_PORT]}" "${CONFIG[SSH_USER]}@${CONFIG[NODE2_HOST]}" || print_warning "Failed to copy to Node 2"
            fi
        fi

        echo
    fi
}

#==============================================================================
# Install Dependencies
#==============================================================================

install_dependencies() {
    print_header "Installing Dependencies"

    if prompt_yes_no "Install npm dependencies?" "y"; then
        # Backend
        print_info "Installing backend dependencies..."
        cd "$SCRIPT_DIR/backend"
        npm install
        print_success "Backend dependencies installed"

        # Frontend
        print_info "Installing frontend dependencies..."
        cd "$SCRIPT_DIR/frontend"
        npm install
        print_success "Frontend dependencies installed"

        cd "$SCRIPT_DIR"
        echo
    fi
}

#==============================================================================
# Deploy Application
#==============================================================================

deploy_application() {
    if [ "${CONFIG[NODE_ENV]}" != "production" ]; then
        print_header "Development Mode"
        print_info "To start the application in development mode:"
        echo
        echo "  Terminal 1 - Backend:"
        echo "    cd $SCRIPT_DIR/backend && npm run dev"
        echo
        echo "  Terminal 2 - Frontend:"
        echo "    cd $SCRIPT_DIR/frontend && npm run dev"
        echo
        echo "  Then open: http://localhost:5173"
        echo
        return
    fi

    print_header "Production Deployment"

    # Build frontend
    if prompt_yes_no "Build frontend for production?" "y"; then
        print_info "Building frontend..."
        cd "$SCRIPT_DIR/frontend"
        npm run build
        print_success "Frontend built"
        cd "$SCRIPT_DIR"
    fi

    # Install systemd service
    if prompt_yes_no "Install systemd service?" "y"; then
        print_info "Installing systemd service..."
        sudo cp "${CONFIG[SERVICE_NAME]}.service" "/etc/systemd/system/${CONFIG[SERVICE_NAME]}.service"
        sudo systemctl daemon-reload
        sudo systemctl enable "${CONFIG[SERVICE_NAME]}"
        print_success "Systemd service installed"

        if prompt_yes_no "Start the service now?" "y"; then
            sudo systemctl start "${CONFIG[SERVICE_NAME]}"
            sleep 2
            if systemctl is-active --quiet "${CONFIG[SERVICE_NAME]}"; then
                print_success "Service started successfully"
            else
                print_error "Service failed to start. Check logs with: sudo journalctl -u ${CONFIG[SERVICE_NAME]} -n 50"
            fi
        fi
    fi

    # Install nginx config
    if prompt_yes_no "Install nginx configuration?" "y"; then
        print_info "Installing nginx configuration..."
        sudo cp nginx.conf "/etc/nginx/sites-available/${CONFIG[SERVICE_NAME]}"

        if [ ! -L "/etc/nginx/sites-enabled/${CONFIG[SERVICE_NAME]}" ]; then
            sudo ln -s "/etc/nginx/sites-available/${CONFIG[SERVICE_NAME]}" "/etc/nginx/sites-enabled/${CONFIG[SERVICE_NAME]}"
        fi

        print_success "Nginx configuration installed"

        # Test nginx config
        if sudo nginx -t 2>/dev/null; then
            print_success "Nginx configuration is valid"

            if prompt_yes_no "Reload nginx?" "y"; then
                sudo systemctl reload nginx
                print_success "Nginx reloaded"
            fi
        else
            print_error "Nginx configuration has errors"
            print_info "Fix errors and run: sudo nginx -t && sudo systemctl reload nginx"
        fi

        # SSL setup
        echo
        print_warning "SSL Certificate Setup"
        print_info "If you haven't set up SSL yet, run:"
        echo "  sudo certbot --nginx -d ${CONFIG[DOMAIN_NAME]}"
        echo
    fi

    echo
}

#==============================================================================
# Final Summary
#==============================================================================

show_final_summary() {
    print_header "Setup Complete! 🎉"

    if [ "${CONFIG[NODE_ENV]}" = "production" ]; then
        cat << EOF
${GREEN}Your Node Monitor is configured!${NC}

${CYAN}Access:${NC}
  URL: https://${CONFIG[DOMAIN_NAME]}

${CYAN}Service Management:${NC}
  Status:  sudo systemctl status ${CONFIG[SERVICE_NAME]}
  Restart: sudo systemctl restart ${CONFIG[SERVICE_NAME]}
  Logs:    sudo journalctl -u ${CONFIG[SERVICE_NAME]} -f

${CYAN}Nginx:${NC}
  Test:   sudo nginx -t
  Reload: sudo systemctl reload nginx
  Logs:   sudo tail -f /var/log/nginx/${CONFIG[SERVICE_NAME]}.access.log

${CYAN}Files Created:${NC}
  • backend/.env
  • nginx.conf
  • ${CONFIG[SERVICE_NAME]}.service

${CYAN}Next Steps:${NC}
  1. Set up SSL: sudo certbot --nginx -d ${CONFIG[DOMAIN_NAME]}
  2. Configure monitor users on each node (see README.md)
  3. Test SSH connections to nodes
  4. Access your dashboard at https://${CONFIG[DOMAIN_NAME]}

${CYAN}Documentation:${NC}
  • README.md - Complete documentation
  • QUICK_START.md - Quick reference
  • DEPLOYMENT_CHECKLIST.md - Deployment checklist
EOF
    else
        cat << EOF
${GREEN}Your Node Monitor is configured for development!${NC}

${CYAN}To start:${NC}

  Terminal 1 - Backend:
    cd $SCRIPT_DIR/backend && npm run dev

  Terminal 2 - Frontend:
    cd $SCRIPT_DIR/frontend && npm run dev

  Then open: ${CONFIG[FRONTEND_URL]}

${CYAN}Files Created:${NC}
  • backend/.env

${CYAN}For production deployment:${NC}
  Run ./setup.sh again and use a real domain name instead of localhost
EOF
    fi

    echo
}

#==============================================================================
# Save Configuration
#==============================================================================

save_configuration() {
    print_info "Saving configuration..."

    # Save to a file for future reference
    cat > "$SCRIPT_DIR/.setup-config" << EOF
# Node Monitor Setup Configuration
# Generated on $(date)

APP_NAME="${CONFIG[APP_NAME]}"
APP_SHORT_NAME="${CONFIG[APP_SHORT_NAME]}"
SYSTEM_USER="${CONFIG[SYSTEM_USER]}"
PORT="${CONFIG[PORT]}"
DOMAIN_NAME="${CONFIG[DOMAIN_NAME]}"
NODE_LOCAL_ID="${CONFIG[NODE_LOCAL_ID]}"
NODE1_HOST="${CONFIG[NODE1_HOST]}"
NODE1_LABEL="${CONFIG[NODE1_LABEL]}"
NODE2_HOST="${CONFIG[NODE2_HOST]}"
NODE2_LABEL="${CONFIG[NODE2_LABEL]}"
SERVICE_NAME="${CONFIG[SERVICE_NAME]}"
EOF

    chmod 600 "$SCRIPT_DIR/.setup-config"
    print_success "Configuration saved to .setup-config"
}

#==============================================================================
# Main Setup Flow
#==============================================================================

main() {
    clear

    cat << "EOF"

    ███╗   ██╗ ██████╗ ██████╗ ███████╗    ███╗   ███╗ ██████╗ ███╗   ██╗██╗████████╗ ██████╗ ██████╗
    ████╗  ██║██╔═══██╗██╔══██╗██╔════╝    ████╗ ████║██╔═══██╗████╗  ██║██║╚══██╔══╝██╔═══██╗██╔══██╗
    ██╔██╗ ██║██║   ██║██║  ██║█████╗      ██╔████╔██║██║   ██║██╔██╗ ██║██║   ██║   ██║   ██║██████╔╝
    ██║╚██╗██║██║   ██║██║  ██║██╔══╝      ██║╚██╔╝██║██║   ██║██║╚██╗██║██║   ██║   ██║   ██║██╔══██╗
    ██║ ╚████║╚██████╔╝██████╔╝███████╗    ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║██║   ██║   ╚██████╔╝██║  ██║
    ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝    ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝

                            Interactive Setup Wizard

EOF

    print_info "This wizard will help you set up Node Monitor step by step."
    echo

    if [ -f "$SCRIPT_DIR/.setup-config" ]; then
        print_warning "Found existing configuration from previous setup"
        if prompt_yes_no "Load previous configuration?" "y"; then
            source "$SCRIPT_DIR/.setup-config"
            declare -A CONFIG
            for var in APP_NAME APP_SHORT_NAME SYSTEM_USER PORT DOMAIN_NAME NODE_LOCAL_ID \
                       NODE1_HOST NODE1_LABEL NODE2_HOST NODE2_LABEL SERVICE_NAME; do
                CONFIG[$var]="${!var}"
            done
            print_success "Previous configuration loaded"
            echo
        fi
    fi

    # Run setup steps
    check_prerequisites
    run_configuration_wizard
    show_configuration_summary

    if ! prompt_yes_no "Proceed with this configuration?" "y"; then
        print_warning "Setup cancelled"
        exit 0
    fi

    generate_configuration_files
    generate_ssh_key
    install_dependencies
    deploy_application
    save_configuration
    show_final_summary
}

# Run main function
main
