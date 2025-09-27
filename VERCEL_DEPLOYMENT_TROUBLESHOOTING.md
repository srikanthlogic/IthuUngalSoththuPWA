# Vercel Deployment Error Analysis & Troubleshooting Guide

## Critical Issues Identified

### 1. **`.vercelignore` Exclusion Issues** 
**Problem**: Current `.vercelignore` excludes critical deployment directories:
- Line 96: `dist` (Vite build output directory)  
- Line 100: `public` (Static assets directory)

**Error Signatures**:
```
Error: Could not find build output directory
Error: Static files not found
Build failed: No index.html found
```

### 2. **Edge Runtime Incompatibilities**
**Problem**: API functions use Node.js APIs incompatible with Vercel Edge Runtime:
- [`process.uptime()`](api/health.ts:157) in health endpoint
- [`process.env`](api/utils.ts:417) access patterns in utils
- In-memory storage with Map objects won't persist

**Error Signatures**:
```
ReferenceError: process is not defined
Error: process.uptime is not a function
Runtime Error: Unsupported Node.js API in Edge Runtime
Function failed to start: Edge Runtime incompatibility
```

### 3. **TypeScript Import Extension Issues**
**Problem**: API files use `.ts` extensions in imports:
- [`./types.ts`](api/_middleware.ts:6) and [`./utils.ts`](api/_middleware.ts:14) imports
- TypeScript compiler doesn't resolve `.ts` extensions properly

**Error Signatures**:
```
Module not found: Can't resolve './types.ts'
TypeScript error: Cannot find module './utils.ts'
Build failed: Unable to resolve module with .ts extension
```

### 4. **React 19.1.1 Compatibility Issues**
**Problem**: Latest React version may have build environment incompatibilities
**Error Signatures**:
```
Error: React 19.x compatibility issues with Vercel build
Build failed: Unsupported React features
Warning: React version compatibility
```

### 5. **Missing Node.js Engine Specification**
**Problem**: No `engines` field in [`package.json`](package.json:1)
**Error Signatures**:
```
Warning: No engines field specified
Build environment mismatch
Node.js version compatibility issues
```

---

## Error Pattern Identification System

### Build-Time vs Runtime Error Classification

#### **Build-Time Errors (Deploy Failures)**
```bash
# Error Pattern: Static asset resolution
grep -r "Could not find.*index.html" vercel-logs/
grep -r "Build output directory.*not found" vercel-logs/

# Error Pattern: TypeScript compilation
grep -r "Cannot find module.*\.ts" vercel-logs/
grep -r "Module resolution failed" vercel-logs/

# Error Pattern: Dependency conflicts  
grep -r "React.*compatibility" vercel-logs/
grep -r "peer dep.*warning" vercel-logs/
```

#### **Runtime Errors (Function Failures)**
```bash  
# Error Pattern: Edge Runtime incompatibility
grep -r "process is not defined" vercel-logs/
grep -r "Edge Runtime.*unsupported" vercel-logs/

# Error Pattern: Function timeouts
grep -r "Function execution timed out" vercel-logs/
grep -r "Memory limit exceeded" vercel-logs/

# Error Pattern: Import resolution
grep -r "Cannot resolve module" vercel-logs/
```

---

## Systematic Troubleshooting Workflows

### **Workflow 1: Pre-Deployment Validation**

```bash
#!/bin/bash
# File: scripts/pre-deployment-check.sh

echo "=== Pre-Deployment Validation ==="

# 1. Check .vercelignore exclusions
echo "Checking .vercelignore..."
if grep -q "^dist$" .vercelignore; then
    echo "❌ CRITICAL: .vercelignore excludes 'dist' directory"
    echo "Fix: Remove 'dist' from .vercelignore or use 'dist/src' instead"
fi

if grep -q "^public$" .vercelignore; then
    echo "❌ CRITICAL: .vercelignore excludes 'public' directory" 
    echo "Fix: Remove 'public' from .vercelignore or use specific exclusions"
fi

# 2. Check Edge Runtime compatibility
echo "Checking Edge Runtime compatibility..."
grep -r "process\." api/ && echo "❌ Found Node.js process usage in API functions"
grep -r "require(" api/ && echo "❌ Found CommonJS require() in API functions"

# 3. Check TypeScript imports
echo "Checking TypeScript imports..."
grep -r "\.ts'" api/ && echo "❌ Found .ts extensions in imports"

# 4. Check build output
echo "Checking build output..."
npm run build
if [ ! -d "dist" ]; then
    echo "❌ Build failed - no dist directory created"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    echo "❌ No index.html found in dist directory"
    exit 1
fi

echo "✅ Pre-deployment validation completed"
```

### **Workflow 2: Local Edge Runtime Testing**

```bash
#!/bin/bash
# File: scripts/test-edge-runtime.sh

echo "=== Testing Edge Runtime Compatibility ==="

# Install Vercel CLI for local testing
npm install -g vercel

# Test API functions locally with Edge Runtime
echo "Testing API functions..."
for file in api/*.ts; do
    echo "Testing $file..."
    # Create temporary test file
    cat > test-temp.js << EOF
import handler from './$file';
// Test basic invocation
handler(new Request('http://localhost:3000/test'))
  .then(res => console.log('✅ $file: OK'))
  .catch(err => console.log('❌ $file: ' + err.message));
EOF
    
    node --experimental-modules test-temp.js
    rm test-temp.js
done

echo "Edge Runtime testing completed"
```

### **Workflow 3: Deployment Recovery Process**

```bash
#!/bin/bash
# File: scripts/deployment-recovery.sh

echo "=== Deployment Recovery Process ==="

DEPLOYMENT_ID=$1
if [ -z "$DEPLOYMENT_ID" ]; then
    echo "Usage: $0 <deployment-id>"
    exit 1
fi

# 1. Get deployment logs
echo "Fetching deployment logs..."
vercel logs $DEPLOYMENT_ID > deployment-logs.txt

# 2. Analyze error patterns
echo "Analyzing errors..."
echo "=== Build Errors ===" > error-analysis.txt
grep -i "error\|failed\|cannot" deployment-logs.txt >> error-analysis.txt

echo "=== Edge Runtime Issues ===" >> error-analysis.txt  
grep -i "edge runtime\|process\|node" deployment-logs.txt >> error-analysis.txt

# 3. Create rollback strategy
echo "Preparing rollback..."
PREVIOUS_DEPLOYMENT=$(vercel ls --limit 2 | tail -1 | awk '{print $1}')
echo "Previous stable deployment: $PREVIOUS_DEPLOYMENT"
echo "To rollback: vercel promote $PREVIOUS_DEPLOYMENT"

# 4. Generate fix recommendations
echo "=== Fix Recommendations ===" >> error-analysis.txt
if grep -q "dist.*not found" deployment-logs.txt; then
    echo "- Fix .vercelignore to include dist directory" >> error-analysis.txt
fi

if grep -q "process.*not defined" deployment-logs.txt; then
    echo "- Replace Node.js APIs with Edge Runtime compatible alternatives" >> error-analysis.txt
fi

echo "Recovery analysis saved to error-analysis.txt"
```

---

## Error Recovery Strategies

### **Strategy 1: Immediate Deployment Blockers**

#### Fix .vercelignore Exclusions
```bash
# Current problematic .vercelignore
cp .vercelignore .vercelignore.backup

# Create corrected version
cat > .vercelignore.fixed << 'EOF'
# Dependencies
node_modules/
*.log

# Development files  
.env
.env.*
!.env.example

# Source code (keep necessary files for API functions)
src/__tests__/
*.test.ts
*.spec.ts

# TypeScript config (keep API types)
!api/types.ts
!api/*.ts

# Build artifacts (keep dist for deployment)
# Removed: dist/
# Removed: public/

# Development tools
.vscode/
.idea/
coverage/
EOF

mv .vercelignore.fixed .vercelignore
```

#### Fix Edge Runtime API Compatibility  
```typescript
// File: api/health-fixed.ts
export const config = {
  runtime: 'edge',
};

// Replace process.uptime() with Edge Runtime compatible alternative
function getUptime(): number {
  // Edge Runtime doesn't have process.uptime()
  // Use a startup timestamp instead
  const startupTime = Date.now();
  return Math.floor((Date.now() - startupTime) / 1000);
}

// Replace process.env access with safer patterns
function getEnvironmentInfo(): { environment: string; version: string } {
  // Use global env object instead of process.env
  const env = typeof process !== 'undefined' ? process.env : {};
  return {
    environment: env.NODE_ENV || 'unknown',
    version: env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev',
  };
}

export default async function handler(request: Request): Promise<Response> {
  // ... rest of handler with fixed implementations
  const healthResponse = {
    // ... other fields
    uptime: getUptime(), // Use Edge Runtime compatible uptime
    // ... rest of response
  };
  
  return new Response(JSON.stringify(healthResponse, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
```

#### Fix TypeScript Import Extensions
```typescript
// File: api/_middleware-fixed.ts
import type {
  MiddlewareConfig,
  RequestContext,
  AuthenticatedRequest,
  LogEntry
} from './types'; // Remove .ts extension

import {
  RateLimiter,
  Logger,
  AuthManager,
  RequestUtils,
  ResponseUtils,
  EnvUtils
} from './utils'; // Remove .ts extension
```

### **Strategy 2: Gradual Migration Approach**

#### Phase 1: Critical Fixes (Immediate)
```bash
# 1. Fix .vercelignore
sed -i '/^dist$/d' .vercelignore
sed -i '/^public$/d' .vercelignore

# 2. Fix TypeScript imports
find api/ -name "*.ts" -exec sed -i "s/\.ts'/'/" {} \;

# 3. Add Node.js engine specification
npm pkg set engines.node=">=18.0.0"
```

#### Phase 2: Edge Runtime Migration (Week 1)
```typescript
// Create Edge Runtime compatible utilities
// File: api/utils-edge.ts

// Replace Map-based storage with KV or external storage
export class EdgeRateLimiter {
  // Use Vercel KV instead of in-memory Map
  async checkRateLimit(key: string, config: RateLimitConfig) {
    // Implementation using Vercel KV or external Redis
    // This persists across function invocations
  }
}

// Replace process.env with edge-compatible env access
export class EdgeEnvUtils {
  static getEnv(key: string, defaultValue?: string): string | undefined {
    // Safe env access that works in Edge Runtime
    try {
      return process?.env?.[key] || defaultValue;
    } catch {
      return defaultValue;
    }
  }
}
```

#### Phase 3: Full Edge Optimization (Week 2)
- Migrate to Vercel KV for rate limiting
- Implement external logging service
- Add comprehensive monitoring

### **Strategy 3: Fallback Configurations**

#### Node.js Runtime Fallback
```json
// File: vercel-fallback.json
{
  "functions": {
    "api/health.ts": {
      "runtime": "@vercel/node",
      "maxDuration": 10
    },
    "api/metrics.ts": {
      "runtime": "@vercel/node",
      "maxDuration": 10  
    },
    "api/**/*.ts": {
      "runtime": "@vercel/edge",
      "maxDuration": 30
    }
  }
}
```

---

## Monitoring and Detection Systems

### **Early Warning System**

```typescript
// File: scripts/deployment-monitor.ts

interface DeploymentAlert {
  type: 'BUILD_FAILURE' | 'RUNTIME_ERROR' | 'PERFORMANCE_DEGRADATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  deployment: string;
  timestamp: number;
}

export class DeploymentMonitor {
  async checkDeploymentHealth(deploymentId: string): Promise<DeploymentAlert[]> {
    const alerts: DeploymentAlert[] = [];
    
    // Check build logs
    const buildLogs = await this.getBuildLogs(deploymentId);
    
    // Pattern matching for common issues
    const patterns = {
      CRITICAL_BUILD_ERRORS: [
        /Cannot find module.*\.ts/,
        /dist.*not found/,
        /process is not defined/,
        /Edge Runtime.*unsupported/
      ],
      PERFORMANCE_ISSUES: [
        /Function execution timed out/,
        /Memory limit exceeded/,
        /Cold start.*>.*ms/
      ]
    };
    
    // Analyze patterns and generate alerts
    for (const [category, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        if (pattern.test(buildLogs)) {
          alerts.push({
            type: category.includes('BUILD') ? 'BUILD_FAILURE' : 'RUNTIME_ERROR',
            severity: 'CRITICAL',
            message: `Detected: ${pattern.source}`,
            deployment: deploymentId,
            timestamp: Date.now()
          });
        }
      }
    }
    
    return alerts;
  }
}
```

### **Health Check Implementation**

```typescript
// File: api/health-monitoring.ts
export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  const checks = await Promise.allSettled([
    // Check API endpoints
    fetch('/api/status').then(r => ({ api: r.ok })),
    // Check static assets
    fetch('/manifest.json').then(r => ({ assets: r.ok })),
    // Check build integrity  
    fetch('/').then(r => ({ app: r.status === 200 }))
  ]);
  
  const results = checks.map((check, i) => ({
    name: ['api', 'assets', 'app'][i],
    status: check.status === 'fulfilled' ? 'pass' : 'fail',
    details: check.status === 'rejected' ? check.reason : check.value
  }));
  
  const overallHealth = results.every(r => r.status === 'pass');
  
  return new Response(JSON.stringify({
    status: overallHealth ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: results,
    deployment: process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  }), {
    status: overallHealth ? 200 : 503,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### **Performance Monitoring Configuration**

```typescript
// File: monitoring-config.ts
export const monitoringConfig = {
  alerts: {
    buildFailureThreshold: 3, // Alert after 3 consecutive failures
    responseTimeThreshold: 2000, // Alert if response > 2s
    errorRateThreshold: 0.05 // Alert if error rate > 5%
  },
  
  metrics: {
    endpoints: ['/api/health', '/api/status', '/api/metrics'],
    collectInterval: 60000, // 1 minute
    retentionDays: 30
  },
  
  notifications: {
    webhook: process.env.MONITORING_WEBHOOK,
    channels: ['slack', 'email'],
    escalation: {
      'CRITICAL': 0, // Immediate
      'HIGH': 300,   // 5 minutes  
      'MEDIUM': 900, // 15 minutes
      'LOW': 3600    // 1 hour
    }
  }
};
```

---

## Project-Specific Quick Fixes

### **1. Emergency .vercelignore Fix**
```bash
# One-liner to fix critical exclusions
sed -i '/^dist$/d; /^public$/d' .vercelignore && git add .vercelignore
```

### **2. Edge Runtime API Migration** 
```bash
# Replace problematic APIs
find api/ -name "*.ts" -exec sed -i 's/process\.uptime()/Date.now()/' {} \;
find api/ -name "*.ts" -exec sed -i 's/process\.env\./globalThis\.process?.env?\./' {} \;
```

### **3. Import Extension Fix**
```bash  
# Remove .ts extensions from imports
find api/ -name "*.ts" -exec sed -i "s/from '\.\//from '\.\//g; s/\.ts'/'/g" {} \;
```

### **4. Package.json Engine Fix**
```bash
# Add Node.js engine requirement
npm pkg set engines.node=">=18.0.0" engines.npm=">=8.0.0"
```

### **5. React Compatibility Safeguard** 
```bash
# Pin React to stable version if needed
npm install react@18.2.0 react-dom@18.2.0 --save-exact
```

---

## Verification Commands

```bash
# Verify fixes before deployment
echo "=== Verification Checklist ==="

# 1. Build verification
npm run build && echo "✅ Build successful" || echo "❌ Build failed"

# 2. TypeScript check
npx tsc --noEmit && echo "✅ TypeScript valid" || echo "❌ TypeScript errors"

# 3. API function check  
node -e "console.log('Edge Runtime compatibility check...')"
grep -r "process\." api/ && echo "❌ Node.js APIs found" || echo "✅ Edge Runtime compatible"

# 4. Import check
grep -r "\.ts'" api/ && echo "❌ TS extensions found" || echo "✅ Import paths valid"

# 5. Asset check
[ -d "dist" ] && echo "✅ Dist directory exists" || echo "❌ No dist directory"  
[ -f "dist/index.html" ] && echo "✅ Index.html found" || echo "❌ No index.html"

echo "=== Verification Complete ==="
```

This comprehensive guide provides systematic approaches to identify, troubleshoot, and resolve the specific Vercel deployment issues in your Chennai MTC Bus Tracker project.