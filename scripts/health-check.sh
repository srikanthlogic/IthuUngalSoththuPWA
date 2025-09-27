#!/bin/bash

# Health Check Script for MTC Bus Tracker
# Performs comprehensive health checks on deployed application

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/health-check.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_TIMEOUT=30
DEFAULT_RETRIES=3
DEFAULT_DELAY=5

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

# Function to check if URL is reachable
check_url_reachable() {
    local url="$1"
    local timeout="${2:-${DEFAULT_TIMEOUT}}"
    local description="${3:-URL}"

    log_info "Checking ${description}: ${url}"

    if curl -f -s --max-time "${timeout}" --head "${url}" > /dev/null 2>&1; then
        log_success "${description} is reachable"
        return 0
    else
        log_error "${description} is not reachable"
        return 1
    fi
}

# Function to check API health endpoint
check_api_health() {
    local base_url="$1"
    local timeout="${2:-${DEFAULT_TIMEOUT}}"

    log_info "Checking API health endpoint: ${base_url}/api/health"

    if curl -f -s --max-time "${timeout}" "${base_url}/api/health" > /dev/null 2>&1; then
        log_success "API health endpoint is responding"
        return 0
    else
        log_error "API health endpoint is not responding"
        return 1
    fi
}

# Function to check API functionality
check_api_functionality() {
    local base_url="$1"
    local timeout="${2:-${DEFAULT_TIMEOUT}}"

    log_info "Checking API functionality..."

    # Test basic API endpoints
    local endpoints=(
        "/api/routes"
        "/api/stops"
        "/api/buses"
    )

    local failed_endpoints=()

    for endpoint in "${endpoints[@]}"; do
        local url="${base_url}${endpoint}"
        log_info "Testing endpoint: ${url}"

        if curl -f -s --max-time "${timeout}" "${url}" > /dev/null 2>&1; then
            log_success "Endpoint ${endpoint} is working"
        else
            log_error "Endpoint ${endpoint} failed"
            failed_endpoints+=("${endpoint}")
        fi
    done

    if [ ${#failed_endpoints[@]} -eq 0 ]; then
        log_success "All API endpoints are functional"
        return 0
    else
        log_error "Failed endpoints: ${failed_endpoints[*]}"
        return 1
    fi
}

# Function to check frontend functionality
check_frontend_functionality() {
    local base_url="$1"
    local timeout="${2:-${DEFAULT_TIMEOUT}}"

    log_info "Checking frontend functionality..."

    # Check main page loads
    if curl -f -s --max-time "${timeout}" "${base_url}" | grep -q "<!DOCTYPE html>" || \
       curl -f -s --max-time "${timeout}" "${base_url}" | grep -q "<html"; then
        log_success "Frontend page loads successfully"
        return 0
    else
        log_error "Frontend page failed to load"
        return 1
    fi
}

# Function to check performance metrics
check_performance() {
    local base_url="$1"
    local timeout="${2:-${DEFAULT_TIMEOUT}}"
    local max_response_time=5

    log_info "Checking performance metrics..."

    local start_time=$(date +%s.%3N)

    if curl -f -s --max-time "${timeout}" --output /dev/null --silent --write-out "%{time_total}" "${base_url}" > /tmp/response_time.txt 2>/dev/null; then
        local response_time=$(cat /tmp/response_time.txt)
        local end_time=$(date +%s.%3N)

        log_info "Response time: ${response_time}s"

        if (( $(echo "${response_time} <= ${max_response_time}" | bc -l) )); then
            log_success "Response time is within acceptable limits (${response_time}s)"
            return 0
        else
            log_warning "Response time is slow (${response_time}s > ${max_response_time}s)"
            return 1
        fi
    else
        log_error "Could not measure response time"
        return 1
    fi
}

# Function to check SSL certificate
check_ssl_certificate() {
    local url="$1"

    log_info "Checking SSL certificate..."

    # Extract domain from URL
    local domain=$(echo "${url}" | sed -E 's/https?:\/\///' | sed 's/\/.*//')

    if echo | openssl s_client -servername "${domain}" -connect "${domain}:443" 2>/dev/null | openssl x509 -noout -checkend 86400 > /dev/null 2>&1; then
        log_success "SSL certificate is valid"
        return 0
    else
        log_error "SSL certificate is expired or invalid"
        return 1
    fi
}

# Function to check security headers
check_security_headers() {
    local base_url="$1"
    local timeout="${2:-${DEFAULT_TIMEOUT}}"

    log_info "Checking security headers..."

    local required_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Referrer-Policy"
    )

    local missing_headers=()

    for header in "${required_headers[@]}"; do
        if curl -f -s --max-time "${timeout}" -I "${base_url}" 2>/dev/null | grep -qi "^${header}:"; then
            log_success "Security header ${header} is present"
        else
            log_error "Security header ${header} is missing"
            missing_headers+=("${header}")
        fi
    done

    if [ ${#missing_headers[@]} -eq 0 ]; then
        log_success "All required security headers are present"
        return 0
    else
        log_error "Missing security headers: ${missing_headers[*]}"
        return 1
    fi
}

# Function to run comprehensive health check
run_comprehensive_check() {
    local base_url="$1"
    local timeout="${2:-${DEFAULT_TIMEOUT}}"
    local skip_ssl="${3:-false}"

    log_info "=== Starting Comprehensive Health Check ==="
    log_info "Target URL: ${base_url}"
    log_info "Timestamp: $(date)"
    log_info "Timeout: ${timeout}s"

    local checks_performed=0
    local checks_passed=0
    local critical_failures=0

    # Basic connectivity check
    ((checks_performed++))
    if check_url_reachable "${base_url}" "${timeout}" "Main application"; then
        ((checks_passed++))
    else
        ((critical_failures++))
    fi

    # API health check
    ((checks_performed++))
    if check_api_health "${base_url}" "${timeout}"; then
        ((checks_passed++))
    else
        ((critical_failures++))
    fi

    # API functionality check
    ((checks_performed++))
    if check_api_functionality "${base_url}" "${timeout}"; then
        ((checks_passed++))
    fi

    # Frontend functionality check
    ((checks_performed++))
    if check_frontend_functionality "${base_url}" "${timeout}"; then
        ((checks_passed++))
    fi

    # Performance check
    ((checks_performed++))
    if check_performance "${base_url}" "${timeout}"; then
        ((checks_passed++))
    fi

    # SSL certificate check (if HTTPS)
    if [[ "${base_url}" =~ ^https:// ]] && [ "${skip_ssl}" != "true" ]; then
        ((checks_performed++))
        if check_ssl_certificate "${base_url}"; then
            ((checks_passed++))
        fi
    fi

    # Security headers check
    ((checks_performed++))
    if check_security_headers "${base_url}" "${timeout}"; then
        ((checks_passed++))
    fi

    # Summary
    log_info "=== Health Check Summary ==="
    log_info "Total checks performed: ${checks_performed}"
    log_info "Checks passed: ${checks_passed}"
    log_info "Checks failed: $((checks_performed - checks_passed))"
    log_info "Critical failures: ${critical_failures}"

    if [ ${critical_failures} -gt 0 ]; then
        log_error "Health check FAILED - Critical issues detected"
        return 1
    elif [ ${checks_passed} -eq ${checks_performed} ]; then
        log_success "Health check PASSED - All checks successful"
        return 0
    else
        log_warning "Health check PASSED with warnings - Some non-critical issues detected"
        return 0
    fi
}

# Function to generate health report
generate_health_report() {
    local base_url="$1"
    local output_file="${PROJECT_ROOT}/health-report-${TIMESTAMP}.json"

    log_info "Generating health report: ${output_file}"

    cat > "${output_file}" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "target_url": "${base_url}",
  "health_status": "unknown",
  "checks": {
    "connectivity": {"status": "unknown", "response_time": null},
    "api_health": {"status": "unknown"},
    "api_functionality": {"status": "unknown", "failed_endpoints": []},
    "frontend": {"status": "unknown"},
    "performance": {"status": "unknown", "response_time": null},
    "ssl_certificate": {"status": "unknown"},
    "security_headers": {"status": "unknown", "missing_headers": []}
  },
  "summary": {
    "total_checks": 0,
    "passed_checks": 0,
    "failed_checks": 0,
    "critical_failures": 0
  }
}
EOF

    echo "${output_file}"
}

# Main function
main() {
    local base_url="${1:-}"
    local timeout="${2:-${DEFAULT_TIMEOUT}}"
    local skip_ssl="${3:-false}"
    local generate_report="${4:-false}"

    if [ -z "${base_url}" ]; then
        echo "Usage: $0 <base_url> [timeout] [skip_ssl] [generate_report]"
        echo ""
        echo "Arguments:"
        echo "  base_url       - Base URL to check (required)"
        echo "  timeout        - Timeout in seconds (default: ${DEFAULT_TIMEOUT})"
        echo "  skip_ssl       - Skip SSL certificate check (default: false)"
        echo "  generate_report - Generate JSON report (default: false)"
        echo ""
        echo "Examples:"
        echo "  $0 https://myapp.vercel.app"
        echo "  $0 https://myapp.vercel.app 60 true"
        echo "  $0 https://myapp.vercel.app 30 false true"
        exit 1
    fi

    # Initialize log file
    echo "=== Health Check Log - $(date) ===" > "${LOG_FILE}"

    # Generate report if requested
    local report_file=""
    if [ "${generate_report}" = "true" ]; then
        report_file=$(generate_health_report "${base_url}")
    fi

    # Run comprehensive health check
    if run_comprehensive_check "${base_url}" "${timeout}" "${skip_ssl}"; then
        if [ -n "${report_file}" ]; then
            # Update report with success status
            sed -i 's/"health_status": "unknown"/"health_status": "healthy"/' "${report_file}"
        fi
        log_success "Health check completed successfully"
        return 0
    else
        if [ -n "${report_file}" ]; then
            # Update report with failure status
            sed -i 's/"health_status": "unknown"/"health_status": "unhealthy"/' "${report_file}"
        fi
        log_error "Health check failed"
        return 1
    fi
}

# Handle command line arguments
if [ $# -eq 0 ]; then
    echo "Error: Base URL is required"
    echo ""
    echo "Usage: $0 <base_url> [timeout] [skip_ssl] [generate_report]"
    exit 1
fi

main "$@"