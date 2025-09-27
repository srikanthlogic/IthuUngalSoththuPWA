#!/bin/bash
# Pre-Deployment Validation Script for Chennai MTC Bus Tracker
# This script validates the project configuration before Vercel deployment

set -e

echo "=== Chennai MTC Bus Tracker - Pre-Deployment Validation ==="
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

ERRORS=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ERRORS=$((ERRORS + 1))
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}"
}

info() {
    echo -e "ℹ️  INFO: $1"
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "api" ]]; then
    error "Not in project root directory. Please run from Chennai MTC Bus Tracker root."
    exit 1
fi

echo "1. Checking .vercelignore configuration..."
if [[ -f ".vercelignore" ]]; then
    # Check for critical exclusions
    if grep -q "^dist$" .vercelignore; then
        error ".vercelignore excludes 'dist' directory (build output)"
        info "Fix: Remove 'dist' from .vercelignore or change to 'dist/src'"
    else
        success "Build output directory not excluded"
    fi

    if grep -q "^public$" .vercelignore; then
        error ".vercelignore excludes 'public' directory (static assets)"
        info "Fix: Remove 'public' from .vercelignore or use specific exclusions like 'public/*.dev.*'"
    else
        success "Static assets directory not excluded"
    fi

    # Check for API exclusions
    if grep -q "^api/" .vercelignore; then
        error ".vercelignore excludes API directory"
        info "Fix: Remove 'api/' exclusion or be more specific"
    else
        success "API directory not excluded"
    fi

    # Check if TypeScript files are unnecessarily excluded
    if grep -q "^\*\.ts$" .vercelignore && ! grep -q "!api/\*\.ts" .vercelignore; then
        warning "TypeScript files excluded but API functions need .ts files"
        info "Consider adding '!api/*.ts' exception"
    fi
else
    warning "No .vercelignore file found"
fi

echo ""
echo "2. Checking Edge Runtime compatibility..."

# Check for Node.js APIs in API functions
echo "   Scanning API functions for incompatible Node.js APIs..."
if grep -r "process\.uptime" api/ >/dev/null 2>&1; then
    error "Found process.uptime() usage in API functions (Edge Runtime incompatible)"
    info "Fix: Replace with Date.now()-based alternative"
fi

if grep -r "process\.memoryUsage" api/ >/dev/null 2>&1; then
    error "Found process.memoryUsage() usage in API functions (Edge Runtime incompatible)"
    info "Fix: Remove or replace with Edge Runtime compatible alternative"
fi

if grep -r "process\.cpuUsage" api/ >/dev/null 2>&1; then
    error "Found process.cpuUsage() usage in API functions (Edge Runtime incompatible)"
    info "Fix: Remove or replace with Edge Runtime compatible alternative"
fi

if grep -r "require(" api/ >/dev/null 2>&1; then
    error "Found CommonJS require() in API functions"
    info "Fix: Use ES6 import statements instead"
fi

# Check for unsafe process.env access
if grep -r "process\.env\." api/ | grep -v "process\.env\?" >/dev/null 2>&1; then
    warning "Direct process.env access found - may be unsafe in Edge Runtime"
    info "Consider using optional chaining: process?.env?.VAR"
fi

# Check for file system APIs
if grep -r "fs\." api/ >/dev/null 2>&1; then
    error "File system APIs found in API functions (Edge Runtime incompatible)"
    info "Fix: Use web APIs or external storage instead"
fi

success "Edge Runtime compatibility check completed"

echo ""
echo "3. Checking TypeScript import issues..."

# Check for .ts extensions in imports
TS_EXTENSION_COUNT=$(grep -r "from ['\"]\..*\.ts['\"]" api/ | wc -l || echo "0")
if [[ $TS_EXTENSION_COUNT -gt 0 ]]; then
    error "Found $TS_EXTENSION_COUNT import(s) with .ts extensions"
    info "TypeScript imports should not include file extensions"
    info "Fix: find api/ -name '*.ts' -exec sed -i \"s/\.ts'/'/'g\" {} \;"
    grep -r "from ['\"]\..*\.ts['\"]" api/ | head -5
else
    success "No .ts extensions found in imports"
fi

# Check for missing import statements
if grep -r "RateLimiter\|Logger\|AuthManager" api/ >/dev/null 2>&1; then
    if ! grep -r "import.*{.*RateLimiter" api/ >/dev/null 2>&1; then
        warning "Using utilities but imports may be missing"
    fi
fi

echo ""
echo "4. Checking package.json configuration..."

# Check for Node.js engine specification
if ! grep -q '"engines"' package.json; then
    warning "No Node.js engine version specified"
    info "Fix: npm pkg set engines.node=\">=18.0.0\""
else
    success "Node.js engine version specified"
fi

# Check React version
REACT_VERSION=$(node -e "console.log(require('./package.json').dependencies.react)" 2>/dev/null || echo "not found")
if [[ $REACT_VERSION == "not found" ]]; then
    error "React dependency not found"
elif [[ $REACT_VERSION == *"19."* ]]; then
    warning "React 19.x detected - may have Vercel build compatibility issues"
    info "Consider using React 18.x if issues persist"
else
    success "React version: $REACT_VERSION"
fi

echo ""
echo "5. Checking build configuration..."

# Test build process
echo "   Testing build process..."
if npm run build >/dev/null 2>&1; then
    success "Build process completed successfully"
    
    # Check build output
    if [[ -d "dist" ]]; then
        success "Build output directory (dist) created"
        
        if [[ -f "dist/index.html" ]]; then
            success "index.html found in build output"
        else
            error "index.html not found in dist directory"
        fi
        
        # Check for assets
        if ls dist/assets/*.js >/dev/null 2>&1; then
            success "JavaScript assets found in build output"
        else
            warning "No JavaScript assets found in dist/assets/"
        fi
        
        if ls dist/assets/*.css >/dev/null 2>&1; then
            success "CSS assets found in build output"
        else
            warning "No CSS assets found in dist/assets/"
        fi
    else
        error "Build output directory (dist) not created"
    fi
else
    error "Build process failed"
    info "Run 'npm run build' manually to see detailed error messages"
fi

echo ""
echo "6. Checking TypeScript configuration..."

# Check TypeScript compilation
if command -v npx >/dev/null 2>&1; then
    if npx tsc --noEmit >/dev/null 2>&1; then
        success "TypeScript compilation check passed"
    else
        error "TypeScript compilation errors found"
        info "Run 'npx tsc --noEmit' to see detailed errors"
    fi
else
    warning "TypeScript compiler not available for checking"
fi

echo ""
echo "7. Checking Vercel configuration..."

if [[ -f "vercel.json" ]]; then
    success "vercel.json configuration file found"
    
    # Check Edge Runtime configuration
    if grep -q '"@vercel/edge"' vercel.json; then
        success "Edge Runtime configuration found"
        
        # Validate that API functions are set for Edge Runtime
        if grep -q "api/\*\*/\*\.ts" vercel.json; then
            success "API functions configured for Edge Runtime"
        else
            warning "API functions may not be properly configured for Edge Runtime"
        fi
    else
        warning "No Edge Runtime configuration found in vercel.json"
    fi
else
    warning "No vercel.json file found - using Vercel defaults"
fi

echo ""
echo "8. Running security checks..."

# Check for sensitive data in environment files
if [[ -f ".env" ]]; then
    warning ".env file present - ensure it's not committed to version control"
fi

# Check for API keys in code
if grep -r "api[_-]key.*=" --include="*.ts" --include="*.js" . >/dev/null 2>&1; then
    warning "Potential hardcoded API keys found"
    info "Ensure sensitive data is in environment variables"
fi

echo ""
echo "=== Pre-Deployment Validation Summary ==="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [[ $ERRORS -eq 0 ]]; then
    if [[ $WARNINGS -eq 0 ]]; then
        echo -e "${GREEN}🎉 All checks passed! Project ready for deployment.${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Some warnings found. Review and consider fixing before deployment.${NC}"
        exit 0
    fi
else
    echo -e "${RED}🚫 Critical errors found! Fix these issues before deploying.${NC}"
    echo ""
    echo "Quick fixes:"
    echo "1. Fix .vercelignore: sed -i '/^dist$/d; /^public$/d' .vercelignore"
    echo "2. Fix TS imports: find api/ -name '*.ts' -exec sed -i \"s/\.ts'/'/'g\" {} \;"
    echo "3. Add Node engine: npm pkg set engines.node=\">=18.0.0\""
    echo ""
    echo "Run this script again after applying fixes."
    exit 1
fi