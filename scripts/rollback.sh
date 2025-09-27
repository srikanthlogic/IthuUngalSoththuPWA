#!/bin/bash

# Automated Rollback Script for MTC Bus Tracker
# This script handles automatic and manual rollback operations

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/rollback.log"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "${LOG_FILE}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "${LOG_FILE}"
}

# Function to create backup
create_backup() {
    local backup_name="pre_rollback_backup_${TIMESTAMP}"
    local backup_path="${BACKUP_DIR}/${backup_name}"

    log_info "Creating backup before rollback..."

    mkdir -p "${backup_path}"

    # Backup current deployment info
    if [ -f "deployment-info.json" ]; then
        cp "deployment-info.json" "${backup_path}/"
    fi

    # Backup current Vercel configuration
    if [ -f "vercel.json" ]; then
        cp "vercel.json" "${backup_path}/"
    fi

    # Backup environment variables (without sensitive data)
    if [ -f ".env.example" ]; then
        cp ".env.example" "${backup_path}/"
    fi

    log_success "Backup created at: ${backup_path}"
    echo "${backup_path}"
}

# Function to perform Vercel rollback
perform_vercel_rollback() {
    local reason="${1:-Automatic rollback triggered by health check failure}"
    local deployment_id="${2:-}"

    log_info "Performing Vercel rollback..."
    log_info "Reason: ${reason}"

    # Check if Vercel CLI is available
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi

    # Perform the rollback
    if [ -n "${deployment_id}" ]; then
        log_info "Rolling back to specific deployment: ${deployment_id}"
        vercel rollback "${deployment_id}" --yes
    else
        log_info "Rolling back to previous deployment"
        vercel rollback --yes
    fi

    if [ $? -eq 0 ]; then
        log_success "Vercel rollback completed successfully"
    else
        log_error "Vercel rollback failed"
        exit 1
    fi
}

# Function to validate rollback
validate_rollback() {
    local max_attempts=10
    local attempt=1
    local deployment_url=""

    log_info "Validating rollback..."

    # Get deployment URL from recent deployment info
    if [ -f "deployment-info.json" ]; then
        deployment_url=$(jq -r '.deploymentUrl' deployment-info.json 2>/dev/null || echo "")
    fi

    if [ -z "${deployment_url}" ]; then
        log_warning "Could not determine deployment URL, skipping validation"
        return 0
    fi

    log_info "Validating deployment at: ${deployment_url}"

    while [ $attempt -le $max_attempts ]; do
        log_info "Validation attempt ${attempt}/${max_attempts}"

        if curl -f -s "${deployment_url}/api/health" > /dev/null 2>&1; then
            log_success "Rollback validation successful"
            return 0
        fi

        log_warning "Health check failed, waiting 30 seconds before retry..."
        sleep 30
        ((attempt++))
    done

    log_error "Rollback validation failed after ${max_attempts} attempts"
    return 1
}

# Function to send notifications
send_notification() {
    local status="$1"
    local message="$2"
    local deployment_url="$3"

    log_info "Sending notification..."

    # This would integrate with Slack, Discord, or other notification systems
    # For now, we'll just log the notification
    if [ "$status" = "success" ]; then
        log_success "NOTIFICATION: ${message}"
        log_success "Deployment URL: ${deployment_url}"
    else
        log_error "NOTIFICATION: ${message}"
        log_error "Deployment URL: ${deployment_url}"
    fi
}

# Main rollback function
main() {
    local reason="${1:-Automatic rollback}"
    local deployment_id="${2:-}"
    local skip_validation="${3:-false}"

    log_info "=== Starting Rollback Process ==="
    log_info "Reason: ${reason}"
    log_info "Timestamp: $(date)"
    log_info "User: $(whoami)"
    log_info "Project: ${PROJECT_ROOT}"

    # Create backup
    local backup_path
    backup_path=$(create_backup)

    # Perform rollback
    perform_vercel_rollback "${reason}" "${deployment_id}"

    # Validate rollback (unless skipped)
    if [ "${skip_validation}" != "true" ]; then
        if validate_rollback; then
            send_notification "success" "Rollback completed successfully" "${deployment_url}"
        else
            send_notification "error" "Rollback validation failed" "${deployment_url}"
            log_error "Rollback completed but validation failed"
            exit 1
        fi
    else
        log_warning "Skipping rollback validation"
        send_notification "success" "Rollback completed (validation skipped)" "${deployment_url}"
    fi

    log_success "=== Rollback Process Completed Successfully ==="
    log_info "Backup location: ${backup_path}"
}

# Handle command line arguments
case "${1:-}" in
    "auto")
        main "Automatic rollback triggered by health check failure"
        ;;
    "manual")
        reason="${2:-Manual rollback}"
        main "${reason}"
        ;;
    "validate")
        validate_rollback
        ;;
    "backup")
        create_backup
        ;;
    *)
        echo "Usage: $0 {auto|manual|validate|backup} [reason] [deployment_id]"
        echo ""
        echo "Commands:"
        echo "  auto      - Perform automatic rollback"
        echo "  manual    - Perform manual rollback with reason"
        echo "  validate  - Validate current deployment health"
        echo "  backup    - Create backup only"
        echo ""
        echo "Examples:"
        echo "  $0 auto"
        echo "  $0 manual 'Emergency fix required'"
        echo "  $0 validate"
        exit 1
        ;;
esac