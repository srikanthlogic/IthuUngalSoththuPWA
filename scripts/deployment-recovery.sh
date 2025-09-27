#!/bin/bash
# Deployment Recovery Script for Chennai MTC Bus Tracker
# Handles failed deployments and provides recovery options

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

# Check if Vercel CLI is installed
if ! command -v vercel >/dev/null 2>&1; then
    error "Vercel CLI not found. Install with: npm install -g vercel"
    exit 1
fi

DEPLOYMENT_ID=${1:-"latest"}
RECOVERY_MODE=${2:-"analyze"}

echo "=== Chennai MTC Bus Tracker - Deployment Recovery ==="
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "Deployment ID: $DEPLOYMENT_ID"
echo "Recovery Mode: $RECOVERY_MODE"
echo ""

# Function to analyze deployment logs
analyze_deployment() {
    local deployment_id=$1
    
    echo "📋 Analyzing deployment logs for: $deployment_id"
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Fetch deployment logs
    local log_file="logs/deployment-${deployment_id}-$(date +%Y%m%d-%H%M%S).log"
    echo "Fetching deployment logs..."
    
    if vercel logs "$deployment_id" > "$log_file" 2>&1; then
        success "Logs saved to: $log_file"
    else
        error "Failed to fetch deployment logs"
        return 1
    fi
    
    # Analyze log patterns
    local analysis_file="logs/analysis-${deployment_id}-$(date +%Y%m%d-%H%M%S).txt"
    
    echo "🔍 Analyzing error patterns..."
    cat > "$analysis_file" << EOF
=== Deployment Analysis Report ===
Deployment ID: $deployment_id
Analysis Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

EOF
    
    # Critical build errors
    echo "=== CRITICAL BUILD ERRORS ===" >> "$analysis_file"
    grep -i "error\|failed\|cannot\|missing" "$log_file" | head -10 >> "$analysis_file" || echo "No critical build errors found" >> "$analysis_file"
    echo "" >> "$analysis_file"
    
    # Edge Runtime issues
    echo "=== EDGE RUNTIME ISSUES ===" >> "$analysis_file"
    grep -i "edge runtime\|process.*not defined\|unsupported.*node" "$log_file" >> "$analysis_file" || echo "No Edge Runtime issues found" >> "$analysis_file"
    echo "" >> "$analysis_file"
    
    # File resolution issues
    echo "=== MODULE RESOLUTION ERRORS ===" >> "$analysis_file"
    grep -i "cannot find module\|module not found\|\.ts.*not found" "$log_file" >> "$analysis_file" || echo "No module resolution errors found" >> "$analysis_file"
    echo "" >> "$analysis_file"
    
    # Asset issues
    echo "=== ASSET RESOLUTION ERRORS ===" >> "$analysis_file"
    grep -i "dist.*not found\|public.*not found\|index\.html.*missing" "$log_file" >> "$analysis_file" || echo "No asset resolution errors found" >> "$analysis_file"
    echo "" >> "$analysis_file"
    
    # Performance issues
    echo "=== PERFORMANCE ISSUES ===" >> "$analysis_file"
    grep -i "timeout\|memory.*limit\|cold start" "$log_file" >> "$analysis_file" || echo "No performance issues found" >> "$analysis_file"
    echo "" >> "$analysis_file"
    
    # Generate fix recommendations
    echo "=== RECOMMENDED FIXES ===" >> "$analysis_file"
    
    if grep -q "dist.*not found" "$log_file"; then
        echo "• Fix .vercelignore: Remove 'dist' exclusion" >> "$analysis_file"
        echo "  Command: sed -i '/^dist$/d' .vercelignore" >> "$analysis_file"
    fi
    
    if grep -q "process.*not defined" "$log_file"; then
        echo "• Fix Edge Runtime compatibility: Replace Node.js APIs" >> "$analysis_file"
        echo "  Command: See VERCEL_DEPLOYMENT_TROUBLESHOOTING.md for specific fixes" >> "$analysis_file"
    fi
    
    if grep -q "Cannot find module.*\.ts" "$log_file"; then
        echo "• Fix TypeScript imports: Remove .ts extensions" >> "$analysis_file"
        echo "  Command: find api/ -name '*.ts' -exec sed -i \"s/\.ts'/'/'g\" {} \;" >> "$analysis_file"
    fi
    
    if grep -q "React.*compatibility" "$log_file"; then
        echo "• Fix React compatibility: Consider downgrading to React 18.x" >> "$analysis_file"
        echo "  Command: npm install react@18.2.0 react-dom@18.2.0" >> "$analysis_file"
    fi
    
    success "Analysis complete. Report saved to: $analysis_file"
    
    # Display summary
    echo ""
    echo "📊 Error Summary:"
    local error_count=$(grep -c -i "error\|failed" "$log_file" || echo "0")
    local warning_count=$(grep -c -i "warning\|warn" "$log_file" || echo "0")
    
    echo "   Errors: $error_count"
    echo "   Warnings: $warning_count"
    
    if [[ $error_count -gt 0 ]]; then
        echo ""
        echo "🔴 Critical issues found. Top errors:"
        grep -i "error\|failed" "$log_file" | head -3
    fi
}

# Function to get deployment list
get_deployments() {
    echo "📋 Recent deployments:"
    vercel ls --limit 10 | head -11
}

# Function to rollback to previous deployment
rollback_deployment() {
    echo "🔄 Preparing rollback..."
    
    # Get the previous deployment
    local previous_deployment
    previous_deployment=$(vercel ls --limit 2 | tail -1 | awk '{print $2}')
    
    if [[ -z "$previous_deployment" ]]; then
        error "No previous deployment found for rollback"
        return 1
    fi
    
    info "Previous deployment: $previous_deployment"
    
    # Confirm rollback
    echo -n "Are you sure you want to rollback to $previous_deployment? (y/N): "
    read -r confirm
    
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        echo "Rolling back to $previous_deployment..."
        if vercel promote "$previous_deployment"; then
            success "Rollback completed successfully"
            info "Current deployment is now: $previous_deployment"
        else
            error "Rollback failed"
            return 1
        fi
    else
        info "Rollback cancelled"
    fi
}

# Function to create emergency backup
create_backup() {
    local backup_dir="backups/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    echo "💾 Creating emergency backup..."
    
    # Backup critical configuration files
    cp .vercelignore "$backup_dir/" 2>/dev/null || true
    cp vercel.json "$backup_dir/" 2>/dev/null || true
    cp package.json "$backup_dir/"
    cp -r api/ "$backup_dir/" 2>/dev/null || true
    
    # Create backup info
    cat > "$backup_dir/backup-info.txt" << EOF
Emergency Backup Created: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Git Branch: $(git branch --show-current 2>/dev/null || echo "N/A")
Node Version: $(node --version 2>/dev/null || echo "N/A")
NPM Version: $(npm --version 2>/dev/null || echo "N/A")
Vercel CLI: $(vercel --version 2>/dev/null || echo "N/A")
EOF
    
    success "Backup created at: $backup_dir"
}

# Function to apply emergency fixes
apply_emergency_fixes() {
    echo "🚨 Applying emergency fixes..."
    
    create_backup
    
    local fixes_applied=0
    
    # Fix 1: .vercelignore issues
    if grep -q "^dist$" .vercelignore 2>/dev/null; then
        warning "Fixing .vercelignore dist exclusion..."
        sed -i '/^dist$/d' .vercelignore
        fixes_applied=$((fixes_applied + 1))
        success "Fixed dist exclusion in .vercelignore"
    fi
    
    if grep -q "^public$" .vercelignore 2>/dev/null; then
        warning "Fixing .vercelignore public exclusion..."
        sed -i '/^public$/d' .vercelignore
        fixes_applied=$((fixes_applied + 1))
        success "Fixed public exclusion in .vercelignore"
    fi
    
    # Fix 2: TypeScript import extensions
    local ts_imports=$(find api/ -name "*.ts" -exec grep -l "\.ts'" {} \; 2>/dev/null | wc -l || echo "0")
    if [[ $ts_imports -gt 0 ]]; then
        warning "Fixing TypeScript import extensions..."
        find api/ -name "*.ts" -exec sed -i "s/\.ts'/'/'g" {} \; 2>/dev/null || true
        fixes_applied=$((fixes_applied + 1))
        success "Fixed TypeScript import extensions"
    fi
    
    # Fix 3: Add Node.js engine if missing
    if ! grep -q '"engines"' package.json; then
        warning "Adding Node.js engine specification..."
        npm pkg set engines.node=">=18.0.0" engines.npm=">=8.0.0"
        fixes_applied=$((fixes_applied + 1))
        success "Added Node.js engine specification"
    fi
    
    # Fix 4: Edge Runtime API compatibility (basic fix)
    if grep -r "process\.uptime()" api/ >/dev/null 2>&1; then
        warning "Attempting to fix process.uptime() usage..."
        find api/ -name "*.ts" -exec sed -i 's/process\.uptime()/0/g' {} \; 2>/dev/null || true
        fixes_applied=$((fixes_applied + 1))
        success "Applied basic process.uptime() fix"
        info "Manual review recommended for proper Edge Runtime compatibility"
    fi
    
    echo ""
    if [[ $fixes_applied -gt 0 ]]; then
        success "Applied $fixes_applied emergency fixes"
        info "Test the build before redeploying: npm run build"
        info "Run pre-deployment check: ./scripts/pre-deployment-check.sh"
    else
        info "No automatic fixes applied - manual intervention required"
    fi
}

# Function to redeploy with fixes
redeploy_with_fixes() {
    echo "🚀 Redeploying with fixes..."
    
    # Run pre-deployment check
    if [[ -f "scripts/pre-deployment-check.sh" ]]; then
        info "Running pre-deployment validation..."
        if bash scripts/pre-deployment-check.sh; then
            success "Pre-deployment validation passed"
        else
            error "Pre-deployment validation failed"
            info "Fix validation issues before redeploying"
            return 1
        fi
    fi
    
    # Build project
    info "Building project..."
    if npm run build; then
        success "Build completed successfully"
    else
        error "Build failed - cannot redeploy"
        return 1
    fi
    
    # Deploy
    echo -n "Proceed with deployment? (y/N): "
    read -r confirm
    
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        info "Deploying to Vercel..."
        if vercel --prod; then
            success "Deployment completed successfully"
        else
            error "Deployment failed"
            return 1
        fi
    else
        info "Deployment cancelled"
    fi
}

# Main recovery logic
case $RECOVERY_MODE in
    "analyze"|"analysis")
        analyze_deployment "$DEPLOYMENT_ID"
        ;;
    "list"|"deployments")
        get_deployments
        ;;
    "rollback")
        rollback_deployment
        ;;
    "backup")
        create_backup
        ;;
    "fix"|"emergency-fix")
        apply_emergency_fixes
        ;;
    "redeploy")
        redeploy_with_fixes
        ;;
    "full-recovery")
        info "Starting full recovery process..."
        analyze_deployment "$DEPLOYMENT_ID"
        create_backup
        apply_emergency_fixes
        redeploy_with_fixes
        ;;
    *)
        echo "Usage: $0 [deployment-id] [mode]"
        echo ""
        echo "Modes:"
        echo "  analyze         - Analyze deployment logs and generate report"
        echo "  list           - Show recent deployments"
        echo "  rollback       - Rollback to previous deployment"
        echo "  backup         - Create emergency backup of current state"
        echo "  fix            - Apply automatic emergency fixes"
        echo "  redeploy       - Redeploy with validation checks"
        echo "  full-recovery  - Complete recovery process (analyze + backup + fix + redeploy)"
        echo ""
        echo "Examples:"
        echo "  $0 dpl_abc123 analyze    # Analyze specific deployment"
        echo "  $0 latest rollback       # Rollback latest deployment"
        echo "  $0 latest full-recovery  # Complete recovery process"
        exit 1
        ;;
esac

echo ""
echo "=== Recovery Process Complete ==="
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"