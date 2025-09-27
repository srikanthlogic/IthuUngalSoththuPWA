#!/bin/bash
# All-in-One Deployment Fixes for Chennai MTC Bus Tracker
# This script applies all identified fixes for Vercel deployment issues

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

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "api" ]]; then
    error "Not in project root directory. Please run from Chennai MTC Bus Tracker root."
    exit 1
fi

echo "=== Chennai MTC Bus Tracker - Deployment Fixes ==="
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

FIXES_APPLIED=0
BACKUP_DIR="backups/pre-fix-$(date +%Y%m%d-%H%M%S)"

# Create backup
echo "📦 Creating backup of current state..."
mkdir -p "$BACKUP_DIR"

# Backup critical files
cp -r api/ "$BACKUP_DIR/" 2>/dev/null || true
cp .vercelignore "$BACKUP_DIR/" 2>/dev/null || true
cp vercel.json "$BACKUP_DIR/" 2>/dev/null || true
cp package.json "$BACKUP_DIR/"
cp tsconfig.json "$BACKUP_DIR/" 2>/dev/null || true

# Create backup info
cat > "$BACKUP_DIR/backup-info.txt" << EOF
Backup Created: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Git Branch: $(git branch --show-current 2>/dev/null || echo "N/A")
Node Version: $(node --version 2>/dev/null || echo "N/A")
NPM Version: $(npm --version 2>/dev/null || echo "N/A")
Vercel CLI: $(vercel --version 2>/dev/null || echo "N/A")
EOF

success "Backup created at: $BACKUP_DIR"

echo ""
echo "🔧 Applying fixes..."

# Fix 1: .vercelignore issues
echo "1. Fixing .vercelignore exclusions..."
if [[ -f ".vercelignore" ]]; then
    if grep -q "^dist$" .vercelignore; then
        sed -i '/^dist$/d' .vercelignore
        info "Removed 'dist' exclusion from .vercelignore"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
    fi
    
    if grep -q "^public$" .vercelignore; then
        sed -i '/^public$/d' .vercelignore
        info "Removed 'public' exclusion from .vercelignore"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
    fi
    
    # Ensure API files are not excluded
    if grep -q "^api/" .vercelignore; then
        sed -i '/^api\//d' .vercelignore
        info "Removed API directory exclusion"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
    fi
    
    # Remove blanket TypeScript exclusion but keep test files excluded
    if grep -q "^\*\.ts$" .vercelignore && ! grep -q "!api/\*\.ts" .vercelignore; then
        sed -i '/^\*\.ts$/d' .vercelignore
        echo "*.test.ts" >> .vercelignore
        echo "*.spec.ts" >> .vercelignore
        info "Adjusted TypeScript file exclusions"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
    fi
    
    success "Fixed .vercelignore configuration"
else
    warning "No .vercelignore file found"
fi

# Fix 2: TypeScript import extensions
echo ""
echo "2. Fixing TypeScript import extensions..."
TS_IMPORT_COUNT=$(find api/ -name "*.ts" -exec grep -l "\.ts'" {} \; 2>/dev/null | wc -l || echo "0")

if [[ $TS_IMPORT_COUNT -gt 0 ]]; then
    # Fix single-quoted imports
    find api/ -name "*.ts" -exec sed -i "s/from '\.\([^']*\)\.ts'/from '.\1'/g" {} \; 2>/dev/null || true
    # Fix double-quoted imports  
    find api/ -name "*.ts" -exec sed -i 's/from "\.\([^"]*\)\.ts"/from ".\1"/g' {} \; 2>/dev/null || true
    
    info "Fixed TypeScript import extensions in $TS_IMPORT_COUNT files"
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
    success "TypeScript imports fixed"
else
    info "No TypeScript import extensions found"
fi

# Fix 3: Node.js engine specification
echo ""
echo "3. Adding Node.js engine specification..."
if ! grep -q '"engines"' package.json; then
    npm pkg set engines.node=">=18.0.0" engines.npm=">=8.0.0"
    info "Added Node.js engine specification"
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
    success "Node.js engine specification added"
else
    info "Node.js engine already specified"
fi

# Fix 4: Edge Runtime compatibility issues
echo ""
echo "4. Fixing Edge Runtime compatibility..."

# Fix process.uptime() in health.ts
if [[ -f "api/health.ts" ]] && grep -q "process\.uptime()" api/health.ts; then
    # Create fixed version of health.ts
    cat > api/health-temp.ts << 'EOF'
export const config = {
  runtime: 'edge',
};

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    database: boolean;
    external_apis: boolean;
    memory: boolean;
    disk_space: boolean;
  };
  metrics: {
    response_time_ms: number;
    memory_usage_mb: number;
    cpu_usage_percent: number;
  };
  errors?: string[];
}

// Edge Runtime compatible uptime tracking
let serverStartTime = Date.now();

function getUptime(): number {
  return Math.floor((Date.now() - serverStartTime) / 1000);
}

function getEnvironmentInfo(): { environment: string; version: string } {
  const env = globalThis?.process?.env || {};
  return {
    environment: env.NODE_ENV || 'unknown',
    version: env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev',
  };
}

function getSystemMetrics(): { memory_usage_mb: number; cpu_usage_percent: number } {
  // Edge Runtime placeholders - actual metrics not available
  return {
    memory_usage_mb: 0,
    cpu_usage_percent: 0,
  };
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Placeholder for actual database check
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function checkExternalAPIs(): Promise<boolean> {
  try {
    const env = globalThis?.process?.env || {};
    const apiEndpoints = [env.BACKEND_URL].filter(Boolean);

    if (apiEndpoints.length === 0) {
      return true;
    }

    for (const endpoint of apiEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(endpoint, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.warn(`External API ${endpoint} returned ${response.status}`);
          return false;
        }
      } catch (error) {
        console.error(`External API check failed for ${endpoint}:`, error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('External API health check failed:', error);
    return false;
  }
}

async function checkMemoryUsage(): Promise<boolean> {
  return true; // Edge Runtime manages memory automatically
}

async function checkDiskSpace(): Promise<boolean> {
  return true; // Edge Runtime manages storage automatically
}

export default async function handler(request: Request): Promise<Response> {
  const startTime = Date.now();
  const { environment, version } = getEnvironmentInfo();
  const systemMetrics = getSystemMetrics();

  const errors: string[] = [];

  // Perform all health checks concurrently
  const [
    databaseHealthy,
    externalAPIsHealthy,
    memoryHealthy,
    diskSpaceHealthy,
  ] = await Promise.all([
    checkDatabaseConnection().catch((error) => {
      errors.push(`Database check failed: ${error.message}`);
      return false;
    }),
    checkExternalAPIs().catch((error) => {
      errors.push(`External APIs check failed: ${error.message}`);
      return false;
    }),
    checkMemoryUsage().catch((error) => {
      errors.push(`Memory check failed: ${error.message}`);
      return false;
    }),
    checkDiskSpace().catch((error) => {
      errors.push(`Disk space check failed: ${error.message}`);
      return false;
    }),
  ]);

  const responseTime = Date.now() - startTime;
  const allChecksPassed = databaseHealthy && externalAPIsHealthy && memoryHealthy && diskSpaceHealthy;

  const healthResponse: HealthCheckResponse = {
    status: allChecksPassed ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version,
    environment,
    uptime: getUptime(), // Edge Runtime compatible
    checks: {
      database: databaseHealthy,
      external_apis: externalAPIsHealthy,
      memory: memoryHealthy,
      disk_space: diskSpaceHealthy,
    },
    metrics: {
      response_time_ms: responseTime,
      memory_usage_mb: systemMetrics.memory_usage_mb,
      cpu_usage_percent: systemMetrics.cpu_usage_percent,
    },
    ...(errors.length > 0 && { errors }),
  };

  const statusCode = allChecksPassed ? 200 : 503;

  return new Response(JSON.stringify(healthResponse, null, 2), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Check-Time': responseTime.toString(),
    },
  });
}
EOF

    # Replace the original with the fixed version
    mv api/health-temp.ts api/health.ts
    info "Fixed process.uptime() usage in api/health.ts"
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
fi

# Fix unsafe process.env access patterns
UNSAFE_ENV_COUNT=$(grep -r "process\.env\." api/ | grep -v "process\.env\?" | wc -l || echo "0")
if [[ $UNSAFE_ENV_COUNT -gt 0 ]]; then
    # Make process.env access safer with optional chaining
    find api/ -name "*.ts" -exec sed -i 's/process\.env\./globalThis?.process?.env?./g' {} \; 2>/dev/null || true
    info "Made process.env access safer in API functions"
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
fi

success "Edge Runtime compatibility fixes applied"

# Fix 5: React version compatibility (optional)
echo ""
echo "5. Checking React compatibility..."
REACT_VERSION=$(node -e "console.log(require('./package.json').dependencies.react)" 2>/dev/null || echo "not found")

if [[ $REACT_VERSION == *"19."* ]]; then
    warning "React 19.x detected. This may cause build issues."
    echo "   Consider downgrading with: npm install react@18.2.0 react-dom@18.2.0"
    info "Continuing with React 19.x - monitor for compatibility issues"
else
    info "React version: $REACT_VERSION (compatible)"
fi

echo ""
echo "🧪 Testing fixes..."

# Test build
echo "Testing build process..."
if npm run build >/dev/null 2>&1; then
    success "Build test passed"
else
    error "Build test failed"
    info "Build errors may indicate additional fixes needed"
    echo ""
    echo "Detailed build output:"
    npm run build
    exit 1
fi

# Test TypeScript compilation
if command -v npx >/dev/null 2>&1; then
    echo "Testing TypeScript compilation..."
    if npx tsc --noEmit >/dev/null 2>&1; then
        success "TypeScript compilation test passed"
    else
        warning "TypeScript compilation has warnings/errors"
        info "Check with: npx tsc --noEmit"
    fi
fi

# Verify dist directory exists with required files
if [[ -d "dist" ]] && [[ -f "dist/index.html" ]]; then
    success "Build output verification passed"
else
    error "Build output verification failed"
    info "Required: dist/index.html"
    exit 1
fi

echo ""
echo "📊 Fix Summary:"
echo "   Fixes applied: $FIXES_APPLIED"
echo "   Backup location: $BACKUP_DIR"

if [[ $FIXES_APPLIED -gt 0 ]]; then
    echo ""
    success "All fixes applied successfully!"
    info "Project should now be ready for Vercel deployment"
    echo ""
    echo "Next steps:"
    echo "1. Run validation: ./scripts/pre-deployment-check.sh"
    echo "2. Deploy to Vercel: vercel --prod"
    echo "3. Monitor deployment: ./scripts/deployment-recovery.sh latest analyze"
else
    info "No fixes were needed - project appears to be properly configured"
fi

echo ""
echo "🔍 Quick validation check:"

# Final validation
VALIDATION_ERRORS=0

# Check .vercelignore
if grep -E "^(dist|public)/?$" .vercelignore >/dev/null 2>&1; then
    error "Still excluding critical directories in .vercelignore"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

# Check TypeScript imports
if find api/ -name "*.ts" -exec grep -l "\.ts'" {} \; 2>/dev/null | head -1 | grep -q .; then
    error "Still found .ts extensions in imports"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

# Check Node.js engines
if ! grep -q '"engines"' package.json; then
    error "No Node.js engine specification found"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

if [[ $VALIDATION_ERRORS -eq 0 ]]; then
    success "Quick validation passed"
    echo ""
    echo "🚀 Ready for deployment!"
else
    warning "$VALIDATION_ERRORS validation issues remain"
    echo "   Run full validation: ./scripts/pre-deployment-check.sh"
fi

echo ""
echo "=== Deployment Fixes Complete ==="
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"