// Test script to verify real data integration configuration
import fs from 'fs';
import path from 'path';

function testRealDataIntegration() {
    console.log('🧪 Testing real data integration configuration...');

    try {
        // Check environment configuration
        const envPath = '.env.local';
        if (!fs.existsSync(envPath)) {
            console.log('❌ .env.local file not found');
            return false;
        }

        const envContent = fs.readFileSync(envPath, 'utf8');
        console.log('✅ Environment file found');

        // Check required environment variables
        const requiredVars = [
            'BACKEND_URL=https://production.zophop.com/vasudha/dispatch/chennai/mtc/bus/',
            'VITE_API_BASE_URL=/api',
            'API_KEY=mtc_edge_function_key_2024_dev_!@#$%^&*()',
            'VITE_MOCK_API=false'
        ];

        let configValid = true;
        for (const requiredVar of requiredVars) {
            if (envContent.includes(requiredVar)) {
                console.log(`✅ ${requiredVar.split('=')[0]} correctly configured`);
            } else {
                console.log(`❌ ${requiredVar.split('=')[0]} not properly configured`);
                configValid = false;
            }
        }

        // Check API service configuration
        const apiServicePath = 'services/apiService.ts';
        if (!fs.existsSync(apiServicePath)) {
            console.log('❌ API service file not found');
            return false;
        }

        const apiServiceContent = fs.readFileSync(apiServicePath, 'utf8');

        // Verify no hardcoded URLs remain (except in environment variable defaults)
        const hardcodedUrls = [
            'https://production.zophop.com/vasudha/dispatch/chennai/mtc/bus/',
            'api.codetabs.com/v1/proxy' // This is allowed as environment variable default
        ];

        let noHardcodedUrls = true;
        for (const url of hardcodedUrls) {
            // Allow the CORS proxy URL as an environment variable default
            if (url === 'api.codetabs.com/v1/proxy') {
                const lines = apiServiceContent.split('\n');
                const proxyLine = lines.find(line => line.includes('VITE_CORS_PROXY_URL'));
                if (proxyLine && proxyLine.includes(url)) {
                    console.log(`✅ CORS proxy URL found as environment variable default: ${url}`);
                    continue;
                }
            }

            if (apiServiceContent.includes(url)) {
                console.log(`❌ Hardcoded URL found: ${url}`);
                noHardcodedUrls = false;
            }
        }

        if (noHardcodedUrls) {
            console.log('✅ No hardcoded URLs found in API service');
        }

        // Verify proxy routing
        if (apiServiceContent.includes('API_BASE_URL}/proxy') &&
            apiServiceContent.includes('import.meta.env.BACKEND_URL')) {
            console.log('✅ Proxy routing correctly configured');
        } else {
            console.log('❌ Proxy routing not properly configured');
            configValid = false;
        }

        // Verify environment variable usage
        if (apiServiceContent.includes('import.meta.env.BACKEND_URL') &&
            apiServiceContent.includes('import.meta.env.VITE_API_KEY')) {
            console.log('✅ Environment variables properly used');
        } else {
            console.log('❌ Environment variables not properly used');
            configValid = false;
        }

        return configValid && noHardcodedUrls;

    } catch (error) {
        console.log('❌ Real data integration test failed:', error.message);
        return false;
    }
}

// Run the test
const success = testRealDataIntegration();
console.log(success ? '✅ Real data integration configuration test passed' : '❌ Real data integration configuration test failed');
process.exit(success ? 0 : 1);