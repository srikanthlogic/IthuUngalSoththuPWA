// Test script to verify security configuration
import fs from 'fs';

function testSecurityValidation() {
    console.log('🔒 Testing security configuration...');

    try {
        // Check that no secret URLs are exposed in client-side code
        const clientFiles = [
            'App.tsx',
            'services/apiService.ts',
            'components/*.tsx',
            'context/*.tsx'
        ];

        let securityValid = true;

        // Check client-side files for hardcoded URLs
        for (const pattern of clientFiles) {
            let filesToCheck = [];

            if (pattern.includes('*')) {
                // Handle glob patterns
                const pathParts = pattern.split('/');
                const dir = pathParts.slice(0, -1).join('/');
                const ext = pathParts[pathParts.length - 1].split('.')[1];

                if (fs.existsSync(dir)) {
                    const files = fs.readdirSync(dir);
                    filesToCheck = files
                        .filter(file => file.endsWith(`.${ext}`))
                        .map(file => `${dir}/${file}`);
                }
            } else if (fs.existsSync(pattern)) {
                filesToCheck = [pattern];
            }

            for (const file of filesToCheck) {
                if (fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf8');

                    // Check for hardcoded backend URLs
                    const secretUrls = [
                        'https://production.zophop.com/vasudha/dispatch/chennai/mtc/bus/'
                    ];

                    for (const url of secretUrls) {
                        if (content.includes(url)) {
                            console.log(`❌ Secret URL found in client code: ${url} in ${file}`);
                            securityValid = false;
                        }
                    }

                    // Check for hardcoded CORS proxy (allow as environment variable default)
                    if (content.includes('api.codetabs.com') && !content.includes('VITE_CORS_PROXY_URL')) {
                        console.log(`❌ Hardcoded CORS proxy found in client code: ${file}`);
                        securityValid = false;
                    }
                }
            }
        }

        // Check API service for proper authentication
        const apiServicePath = 'services/apiService.ts';
        if (fs.existsSync(apiServicePath)) {
            const apiServiceContent = fs.readFileSync(apiServicePath, 'utf8');

            // Verify API requests use proper authentication headers
            if (apiServiceContent.includes('X-API-Key') &&
                apiServiceContent.includes('import.meta.env.VITE_API_KEY')) {
                console.log('✅ API requests use proper authentication headers');
            } else {
                console.log('❌ API requests missing proper authentication');
                securityValid = false;
            }

            // Verify all external API calls go through proxy
            if (apiServiceContent.includes('API_BASE_URL}/proxy') &&
                apiServiceContent.includes('fetch(')) {
                console.log('✅ All external API calls route through proxy');
            } else {
                console.log('❌ External API calls not properly routed through proxy');
                securityValid = false;
            }
        }

        // Check environment configuration security
        const envPath = '.env.local';
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');

            // Verify API key is configured
            if (envContent.includes('API_KEY=mtc_edge_function_key_2024_dev_!@#$%^&*()')) {
                console.log('✅ API key properly configured');
            } else {
                console.log('❌ API key not properly configured');
                securityValid = false;
            }

            // Verify CORS proxy is configurable
            if (envContent.includes('VITE_CORS_PROXY_URL')) {
                console.log('✅ CORS proxy properly configured');
            } else {
                console.log('ℹ️ CORS proxy uses default configuration');
            }
        }

        // Check .gitignore to ensure secrets are not committed
        const gitignorePath = '.gitignore';
        if (fs.existsSync(gitignorePath)) {
            const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

            if (gitignoreContent.includes('*.local')) {
                console.log('✅ Environment files properly excluded from git (*.local pattern)');
            } else {
                console.log('❌ Environment files not properly excluded from git');
                securityValid = false;
            }
        }

        return securityValid;

    } catch (error) {
        console.log('❌ Security validation test failed:', error.message);
        return false;
    }
}

// Run the test
const success = testSecurityValidation();
console.log(success ? '✅ Security validation test passed' : '❌ Security validation test failed');
process.exit(success ? 0 : 1);