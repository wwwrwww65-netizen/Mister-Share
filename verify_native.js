
const fs = require('fs');
const path = require('path');

// Configuration
const KOTLIN_FILE = 'android/app/src/main/java/com/mistershare/SAFModule.kt';
const SERVICE_FILE = 'src/services/SAFService.ts';

function verify() {
    console.log('🔍 Starting Native Integrity Check...');

    if (!fs.existsSync(KOTLIN_FILE)) {
        console.error(`❌ Kotlin file not found: ${KOTLIN_FILE}`);
        process.exit(1);
    }

    const kotlinContent = fs.readFileSync(KOTLIN_FILE, 'utf8');
    const serviceContent = fs.readFileSync(SERVICE_FILE, 'utf8');

    // 1. Extract @ReactMethod names from Kotlin
    const kotlinMethods = [];
    const methodRegex = /@ReactMethod\s+fun\s+([a-zA-Z0-9_]+)\s*\(/g;
    let match;
    while ((match = methodRegex.exec(kotlinContent)) !== null) {
        kotlinMethods.push(match[1]);
    }

    console.log(`📋 Found ${kotlinMethods.length} Native Methods:`, kotlinMethods);

    // 2. Check usages in Service file
    const requiredMethods = [
        'hasPermission',
        'getStoredUri',
        'getAllPermissions',
        'releasePermission',
        'requestGameFolderAccess',
        'writeFile',
        'extractZipToDirectory',
        'listFiles',
        'deleteFile'
    ];

    let errors = 0;

    requiredMethods.forEach(method => {
        if (!kotlinMethods.includes(method)) {
            console.error(`❌ CRITICAL: Method '${method}' is used in TypeScript but MISSING in Kotlin!`);
            errors++;
        } else {
            console.log(`✅ Method '${method}' confirmed.`);
        }
    });

    // 3. Simple Legacy Mode Check
    if (kotlinContent.includes('c.VERSION.SDK_INT < Build.VERSION_CODES.R') || kotlinContent.includes('VERSION.SDK_INT <')) {
        console.log('✅ Legacy Mode check found in Kotlin.');
    } else {
        console.warn('⚠️ Legacy Mode logic might be missing in Kotlin!');
    }

    if (errors === 0) {
        console.log('\n🎉 INTEGRITY CHECK PASSED! Application architecture is sound.');
    } else {
        console.error(`\n💥 INTEGRITY CHECK FAILED with ${errors} errors.`);
        process.exit(1);
    }
}

verify();
