#!/bin/bash

# Configuration Backup Script for MTC Bus Tracker
# Creates comprehensive backups of configuration files and deployment state

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/backup.log"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_RETENTION_DAYS=30
DEFAULT_BACKUP_NAME=""

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

# Function to create directory structure
create_backup_structure() {
    local backup_name="$1"
    local backup_path="${BACKUP_DIR}/${backup_name}"

    log_info "Creating backup directory structure..."

    mkdir -p "${backup_path}"
    mkdir -p "${backup_path}/config"
    mkdir -p "${backup_path}/deployment"
    mkdir -p "${backup_path}/environment"
    mkdir -p "${backup_path}/logs"

    echo "${backup_path}"
}

# Function to backup configuration files
backup_config_files() {
    local backup_path="$1"

    log_info "Backing up configuration files..."

    local config_files=(
        "vercel.json"
        ".vercelignore"
        "package.json"
        "package-lock.json"
        "vite.config.ts"
        "vitest.config.ts"
        "tsconfig.json"
        ".env.example"
        "manifest.json"
        "metadata.json"
    )

    local backed_up=0
    local skipped=0

    for file in "${config_files[@]}"; do
        if [ -f "${PROJECT_ROOT}/${file}" ]; then
            cp "${PROJECT_ROOT}/${file}" "${backup_path}/config/"
            log_success "Backed up: ${file}"
            ((backed_up++))
        else
            log_warning "File not found, skipping: ${file}"
            ((skipped++))
        fi
    done

    log_info "Configuration backup complete: ${backed_up} files backed up, ${skipped} skipped"
}

# Function to backup deployment information
backup_deployment_info() {
    local backup_path="$1"

    log_info "Backing up deployment information..."

    # Backup current deployment info if exists
    if [ -f "${PROJECT_ROOT}/deployment-info.json" ]; then
        cp "${PROJECT_ROOT}/deployment-info.json" "${backup_path}/deployment/"
        log_success "Backed up deployment info"
    fi

    # Backup Git information
    if [ -d "${PROJECT_ROOT}/.git" ]; then
        git log --oneline -10 > "${backup_path}/deployment/git-log.txt"
        git status --porcelain > "${backup_path}/deployment/git-status.txt"
        git rev-parse HEAD > "${backup_path}/deployment/current-commit.txt"
        git branch --show-current > "${backup_path}/deployment/current-branch.txt"
        log_success "Backed up Git information"
    fi

    # Backup workflow files
    if [ -d "${PROJECT_ROOT}/.github" ]; then
        cp -r "${PROJECT_ROOT}/.github" "${backup_path}/deployment/"
        log_success "Backed up GitHub workflows"
    fi
}

# Function to backup environment variables
backup_environment() {
    local backup_path="$1"
    local include_secrets="${2:-false}"

    log_info "Backing up environment configuration..."

    # Backup environment template
    if [ -f "${PROJECT_ROOT}/.env.example" ]; then
        cp "${PROJECT_ROOT}/.env.example" "${backup_path}/environment/"
        log_success "Backed up environment template"
    fi

    # Backup environment variables (without sensitive data unless requested)
    if [ "${include_secrets}" = "true" ]; then
        log_warning "Including sensitive environment variables in backup"
        if [ -f "${PROJECT_ROOT}/.env" ]; then
            cp "${PROJECT_ROOT}/.env" "${backup_path}/environment/.env.backup"
            log_success "Backed up environment variables (including secrets)"
        fi
    else
        log_info "Skipping sensitive environment variables (use --include-secrets to include)"
    fi

    # Backup Vercel environment variables (if available)
    if command -v vercel &> /dev/null; then
        log_info "Backing up Vercel environment variables..."
        vercel env ls --scope="$(cat .vercel/project.json 2>/dev/null | jq -r '.orgId' 2>/dev/null || echo '')" > "${backup_path}/environment/vercel-env.txt" 2>/dev/null || true
        log_success "Backed up Vercel environment variables"
    fi
}

# Function to backup logs and runtime data
backup_logs_and_data() {
    local backup_path="$1"

    log_info "Backing up logs and runtime data..."

    # Backup recent logs
    local log_files=(
        "${PROJECT_ROOT}/rollback.log"
        "${PROJECT_ROOT}/health-check.log"
        "${PROJECT_ROOT}/backup.log"
    )

    for log_file in "${log_files[@]}"; do
        if [ -f "${log_file}" ]; then
            cp "${log_file}" "${backup_path}/logs/"
            log_success "Backed up log file: $(basename "${log_file}")"
        fi
    done

    # Backup data files
    if [ -d "${PROJECT_ROOT}/data" ]; then
        cp -r "${PROJECT_ROOT}/data" "${backup_path}/"
        log_success "Backed up data directory"
    fi

    # Backup locales
    if [ -d "${PROJECT_ROOT}/locales" ]; then
        cp -r "${PROJECT_ROOT}/locales" "${backup_path}/"
        log_success "Backed up locales directory"
    fi
}

# Function to create backup metadata
create_backup_metadata() {
    local backup_path="$1"
    local backup_type="$2"
    local description="$3"

    local metadata_file="${backup_path}/backup-metadata.json"

    cat > "${metadata_file}" << EOF
{
  "backup_name": "$(basename "${backup_path}")",
  "backup_type": "${backup_type}",
  "description": "${description}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "created_by": "$(whoami)",
  "project_root": "${PROJECT_ROOT}",
  "backup_path": "${backup_path}",
  "system_info": {
    "hostname": "$(hostname)",
    "os": "$(uname -s)",
    "kernel": "$(uname -r)",
    "architecture": "$(uname -m)"
  },
  "git_info": {
    "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
    "remote_url": "$(git remote get-url origin 2>/dev/null || echo 'unknown')"
  },
  "backup_contents": {
    "config_files": $(ls -1 "${backup_path}/config" 2>/dev/null | wc -l),
    "deployment_files": $(ls -1 "${backup_path}/deployment" 2>/dev/null | wc -l),
    "environment_files": $(ls -1 "${backup_path}/environment" 2>/dev/null | wc -l),
    "log_files": $(ls -1 "${backup_path}/logs" 2>/dev/null | wc -l),
    "total_size_mb": "$(du -sm "${backup_path}" 2>/dev/null | cut -f1 || echo '0')"
  }
}
EOF

    log_success "Created backup metadata"
}

# Function to clean old backups
cleanup_old_backups() {
    local retention_days="${1:-${DEFAULT_RETENTION_DAYS}}"

    log_info "Cleaning up backups older than ${retention_days} days..."

    if [ ! -d "${BACKUP_DIR}" ]; then
        log_warning "Backup directory does not exist, skipping cleanup"
        return 0
    fi

    local deleted_count=0
    local current_time=$(date +%s)

    while IFS= read -r -d '' backup_dir; do
        # Extract timestamp from backup name (format: YYYYMMDD_HHMMSS)
        local backup_name=$(basename "${backup_dir}")
        if [[ "${backup_name}" =~ ([0-9]{8}_[0-9]{6}) ]]; then
            local backup_timestamp="${BASH_REMATCH[1]}"
            local backup_date=$(date -d "${backup_timestamp:0:8} ${backup_timestamp:9:2}:${backup_timestamp:11:2}:${backup_timestamp:13:2}" +%s 2>/dev/null || echo "0")

            if [ "${backup_date}" != "0" ]; then
                local age_days=$(( (current_time - backup_date) / 86400 ))

                if [ ${age_days} -gt ${retention_days} ]; then
                    log_info "Deleting old backup: ${backup_name} (${age_days} days old)"
                    rm -rf "${backup_dir}"
                    ((deleted_count++))
                fi
            fi
        fi
    done < <(find "${BACKUP_DIR}" -maxdepth 1 -type d -print0 2>/dev/null)

    log_success "Cleanup complete: ${deleted_count} old backups deleted"
}

# Function to verify backup integrity
verify_backup() {
    local backup_path="$1"

    log_info "Verifying backup integrity..."

    local issues=0

    # Check if backup directory exists
    if [ ! -d "${backup_path}" ]; then
        log_error "Backup directory does not exist: ${backup_path}"
        return 1
    fi

    # Check required files
    local required_files=(
        "backup-metadata.json"
        "config/vercel.json"
        "config/package.json"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "${backup_path}/${file}" ]; then
            log_error "Missing required file: ${file}"
            ((issues++))
        fi
    done

    # Check if files are readable
    find "${backup_path}" -type f -exec test ! -r {} \; -print | while read -r file; do
        log_error "Unreadable file: ${file}"
        ((issues++))
    done

    # Check total size
    local total_size=$(du -sm "${backup_path}" 2>/dev/null | cut -f1 || echo "0")
    if [ "${total_size}" -eq "0" ]; then
        log_error "Backup appears to be empty"
        ((issues++))
    fi

    if [ ${issues} -eq 0 ]; then
        log_success "Backup integrity verification passed"
        return 0
    else
        log_error "Backup integrity verification failed: ${issues} issues found"
        return 1
    fi
}

# Function to list available backups
list_backups() {
    log_info "Available backups:"

    if [ ! -d "${BACKUP_DIR}" ]; then
        log_warning "No backup directory found"
        return 0
    fi

    printf "%-40s %-20s %-15s %-s\n" "BACKUP NAME" "CREATED" "SIZE" "TYPE"
    printf "%-40s %-20s %-15s %-s\n" "----------------------------------------" "--------------------" "---------------" "----"

    while IFS= read -r -d '' backup_dir; do
        local backup_name=$(basename "${backup_dir}")
        local created_date=$(stat -c %y "${backup_dir}" 2>/dev/null | cut -d'.' -f1 || echo "unknown")
        local size=$(du -sh "${backup_dir}" 2>/dev/null | cut -f1 || echo "0")
        local backup_type="unknown"

        if [ -f "${backup_dir}/backup-metadata.json" ]; then
            backup_type=$(jq -r '.backup_type' "${backup_dir}/backup-metadata.json" 2>/dev/null || echo "unknown")
        fi

        printf "%-40s %-20s %-15s %-s\n" "${backup_name}" "${created_date}" "${size}" "${backup_type}"
    done < <(find "${BACKUP_DIR}" -maxdepth 1 -type d -print0 2>/dev/null | sort -z)
}

# Main backup function
main() {
    local backup_name="${1:-${DEFAULT_BACKUP_NAME}}"
    local backup_type="${2:-manual}"
    local description="${3:-Manual configuration backup}"
    local include_secrets="${4:-false}"
    local skip_cleanup="${5:-false}"
    local retention_days="${6:-${DEFAULT_RETENTION_DAYS}}"

    # Generate backup name if not provided
    if [ -z "${backup_name}" ]; then
        backup_name="backup_${backup_type}_${TIMESTAMP}"
    fi

    log_info "=== Starting Backup Process ==="
    log_info "Backup name: ${backup_name}"
    log_info "Backup type: ${backup_type}"
    log_info "Description: ${description}"
    log_info "Include secrets: ${include_secrets}"
    log_info "Timestamp: $(date)"

    # Create backup structure
    local backup_path
    backup_path=$(create_backup_structure "${backup_name}")

    # Perform backups
    backup_config_files "${backup_path}"
    backup_deployment_info "${backup_path}"
    backup_environment "${backup_path}" "${include_secrets}"
    backup_logs_and_data "${backup_path}"

    # Create metadata
    create_backup_metadata "${backup_path}" "${backup_type}" "${description}"

    # Verify backup
    if verify_backup "${backup_path}"; then
        log_success "Backup completed successfully: ${backup_path}"
    else
        log_error "Backup completed but verification failed"
        exit 1
    fi

    # Cleanup old backups (unless skipped)
    if [ "${skip_cleanup}" != "true" ]; then
        cleanup_old_backups "${retention_days}"
    fi

    log_success "=== Backup Process Completed ==="
    log_info "Backup location: ${backup_path}"
    log_info "Total size: $(du -sh "${backup_path}" | cut -f1)"
}

# Handle command line arguments
case "${1:-}" in
    "create")
        shift
        main "$@" false false 30
        ;;
    "list")
        list_backups
        ;;
    "cleanup")
        retention_days="${2:-${DEFAULT_RETENTION_DAYS}}"
        cleanup_old_backups "${retention_days}"
        ;;
    "verify")
        backup_path="${2:-}"
        if [ -z "${backup_path}" ]; then
            log_error "Backup path is required for verification"
            exit 1
        fi
        verify_backup "${backup_path}"
        ;;
    "restore")
        backup_path="${2:-}"
        if [ -z "${backup_path}" ]; then
            log_error "Backup path is required for restoration"
            exit 1
        fi
        log_info "Restoration would restore from: ${backup_path}"
        log_warning "Restore functionality not yet implemented"
        ;;
    *)
        echo "Usage: $0 {create|list|cleanup|verify|restore} [options]"
        echo ""
        echo "Commands:"
        echo "  create [name] [type] [description] [include_secrets] [skip_cleanup] [retention_days]"
        echo "         - Create a new backup"
        echo "  list   - List all available backups"
        echo "  cleanup [retention_days] - Clean up old backups"
        echo "  verify <backup_path> - Verify backup integrity"
        echo "  restore <backup_path> - Restore from backup (not implemented)"
        echo ""
        echo "Examples:"
        echo "  $0 create"
        echo "  $0 create my-backup pre-deployment 'Backup before major update'"
        echo "  $0 create my-backup pre-deployment 'Backup before major update' true true 60"
        echo "  $0 list"
        echo "  $0 cleanup 7"
        exit 1
        ;;
esac