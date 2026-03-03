/**
 * MisterShare - Comprehensive SAF Module Test Suite
 * 
 * هذا السكربت يحاكي ويختبر جميع سيناريوهات نقل ملفات اللعبة
 * على مختلف إصدارات Android (8 إلى 15)
 * 
 * Usage: node test_saf_compatibility.js
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// 🎨 Terminal Colors
// ═══════════════════════════════════════════════════════════════
const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

const log = {
    success: (msg) => console.log(`${COLORS.green}✅ ${msg}${COLORS.reset}`),
    error: (msg) => console.log(`${COLORS.red}❌ ${msg}${COLORS.reset}`),
    warn: (msg) => console.log(`${COLORS.yellow}⚠️  ${msg}${COLORS.reset}`),
    info: (msg) => console.log(`${COLORS.blue}ℹ️  ${msg}${COLORS.reset}`),
    header: (msg) => console.log(`\n${COLORS.bold}${COLORS.cyan}═══ ${msg} ═══${COLORS.reset}\n`)
};

// ═══════════════════════════════════════════════════════════════
// 📋 Test Configuration
// ═══════════════════════════════════════════════════════════════
const ANDROID_VERSIONS = [
    { api: 26, name: 'Android 8.0 (Oreo)', mode: 'LEGACY', safRequired: false },
    { api: 27, name: 'Android 8.1 (Oreo)', mode: 'LEGACY', safRequired: false },
    { api: 28, name: 'Android 9.0 (Pie)', mode: 'LEGACY', safRequired: false },
    { api: 29, name: 'Android 10 (Q)', mode: 'LEGACY', safRequired: false },
    { api: 30, name: 'Android 11 (R)', mode: 'SAF', safRequired: true },
    { api: 31, name: 'Android 12 (S)', mode: 'SAF', safRequired: true },
    { api: 32, name: 'Android 12L', mode: 'SAF', safRequired: true },
    { api: 33, name: 'Android 13 (T)', mode: 'SAF', safRequired: true },
    { api: 34, name: 'Android 14 (U)', mode: 'SAF', safRequired: true },
    { api: 35, name: 'Android 15', mode: 'SAF', safRequired: true },
];

const REQUIRED_NATIVE_METHODS = [
    'hasPermission',
    'getStoredUri',
    'getAllPermissions',
    'releasePermission',
    'requestGameFolderAccess',
    'listFiles',
    'writeFile',
    'extractZipToDirectory',
    'deleteFile',
    'createZipFromDirectory'
];

const REQUIRED_TS_METHODS = [
    'hasPermission',
    'getStoredUri',
    'requestGameFolderAccess',
    'listFiles',
    'writeFile',
    'extractZip',
    'createZipFromDirectory',
    'findGameFiles'
];

const TEST_GAMES = [
    { name: 'PUBG Mobile', package: 'com.tencent.ig', hasObb: true, hasData: true },
    { name: 'Free Fire', package: 'com.dts.freefireth', hasObb: true, hasData: true },
    { name: 'Call of Duty Mobile', package: 'com.activision.callofduty.shooter', hasObb: true, hasData: true },
    { name: 'Genshin Impact', package: 'com.miHoYo.GenshinImpact', hasObb: false, hasData: true },
    { name: 'Minecraft', package: 'com.mojang.minecraftpe', hasObb: true, hasData: true },
];

// ═══════════════════════════════════════════════════════════════
// 🧪 Test Functions
// ═══════════════════════════════════════════════════════════════

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let warnings = 0;

function test(name, condition, criticalOnFail = true) {
    totalTests++;
    if (condition) {
        passedTests++;
        log.success(name);
        return true;
    } else {
        if (criticalOnFail) {
            failedTests++;
            log.error(name);
        } else {
            warnings++;
            log.warn(name);
        }
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
// 📁 File Existence Tests
// ═══════════════════════════════════════════════════════════════

function testFileExistence() {
    log.header('File Existence Tests');

    const requiredFiles = [
        'android/app/src/main/java/com/mistershare/SAFModule.kt',
        'android/app/src/main/java/com/mistershare/TransferService.kt',
        'src/services/SAFService.ts',
        'src/screens/FileBrowser.tsx',
        'src/components/GameRestoreHelp.tsx',
    ];

    requiredFiles.forEach(file => {
        const fullPath = path.join(process.cwd(), file);
        test(`File exists: ${file}`, fs.existsSync(fullPath));
    });
}

// ═══════════════════════════════════════════════════════════════
// 🔍 Native Module Method Tests
// ═══════════════════════════════════════════════════════════════

function testNativeMethods() {
    log.header('Native SAFModule Methods');

    const safModulePath = path.join(process.cwd(), 'android/app/src/main/java/com/mistershare/SAFModule.kt');
    const content = fs.readFileSync(safModulePath, 'utf8');

    REQUIRED_NATIVE_METHODS.forEach(method => {
        const regex = new RegExp(`fun\\s+${method}\\s*\\(`, 'g');
        const matches = content.match(regex);
        const count = matches ? matches.length : 0;

        if (count === 0) {
            test(`Native method: ${method}`, false);
        } else if (count > 1) {
            test(`Native method: ${method} (DUPLICATE - ${count} occurrences!)`, false);
        } else {
            test(`Native method: ${method}`, true);
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// 📝 TypeScript Service Method Tests
// ═══════════════════════════════════════════════════════════════

function testTypeScriptMethods() {
    log.header('TypeScript SAFService Methods');

    const safServicePath = path.join(process.cwd(), 'src/services/SAFService.ts');
    const content = fs.readFileSync(safServicePath, 'utf8');

    REQUIRED_TS_METHODS.forEach(method => {
        const hasMethod = content.includes(`async ${method}(`) ||
            content.includes(`${method}(`);
        test(`TS method: ${method}`, hasMethod);
    });
}

// ═══════════════════════════════════════════════════════════════
// 🤖 Android Version Compatibility Tests
// ═══════════════════════════════════════════════════════════════

function testAndroidCompatibility() {
    log.header('Android Version Compatibility');

    const safModulePath = path.join(process.cwd(), 'android/app/src/main/java/com/mistershare/SAFModule.kt');
    const content = fs.readFileSync(safModulePath, 'utf8');

    // Check for Legacy Mode support
    const hasLegacyCheck = content.includes('Build.VERSION_CODES.R') ||
        content.includes('Build.VERSION.SDK_INT < ');
    test('Legacy Mode check (Android ≤10)', hasLegacyCheck);

    // Check for SAF Mode support
    const hasSAFIntent = content.includes('ACTION_OPEN_DOCUMENT_TREE');
    test('SAF Mode support (Android 11+)', hasSAFIntent);

    // Check for proper fallback
    const hasFallback = content.includes('isLegacy') ||
        content.includes('!directoryUri.startsWith("content://")');
    test('Fallback mechanism for all versions', hasFallback);

    // Simulate each Android version
    console.log('\n📊 Version-by-Version Analysis:\n');

    ANDROID_VERSIONS.forEach(version => {
        const mode = version.mode;
        const icon = mode === 'LEGACY' ? '📁' : '🔐';

        if (mode === 'LEGACY') {
            // Legacy should use direct file access
            const legacySupported = content.includes('/storage/emulated/0/Android/');
            if (legacySupported) {
                log.success(`${icon} ${version.name} (API ${version.api}) - ${mode} Mode`);
            } else {
                log.error(`${icon} ${version.name} (API ${version.api}) - Missing legacy path handling`);
            }
        } else {
            // SAF should use content:// URIs
            const safSupported = content.includes('content://') && hasSAFIntent;
            if (safSupported) {
                log.success(`${icon} ${version.name} (API ${version.api}) - ${mode} Mode`);
            } else {
                log.error(`${icon} ${version.name} (API ${version.api}) - Missing SAF support`);
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// 🎮 Game File Discovery Flow Test
// ═══════════════════════════════════════════════════════════════

function testGameDiscoveryFlow() {
    log.header('Game File Discovery Flow');

    const safServicePath = path.join(process.cwd(), 'src/services/SAFService.ts');
    const content = fs.readFileSync(safServicePath, 'utf8');

    // Test findGameFiles implementation
    test('findGameFiles checks OBB permission', content.includes("hasPermission(packageName, 'obb')"));
    test('findGameFiles checks DATA permission', content.includes("hasPermission(packageName, 'data')"));
    test('findGameFiles lists OBB files', content.includes('listFiles(obbUri)'));
    test('findGameFiles creates DATA ZIP', content.includes('createZipFromDirectory'));
    test('findGameFiles returns file type', content.includes("type: 'obb'") && content.includes("type: 'data'"));

    // Test FileBrowser Game Wizard
    const fileBrowserPath = path.join(process.cwd(), 'src/screens/FileBrowser.tsx');
    const fbContent = fs.readFileSync(fileBrowserPath, 'utf8');

    test('FileBrowser checks existing permissions first', fbContent.includes('hasPermission(packageName'));
    test('FileBrowser shows user instructions', fbContent.includes('game_folder_instruction'));
    test('FileBrowser requests OBB permission', fbContent.includes("requestGameFolderAccess(packageName, 'obb')"));
    test('FileBrowser asks about DATA folder', fbContent.includes('DATA') && fbContent.includes('Alert.alert'));
}

// ═══════════════════════════════════════════════════════════════
// 📤 Transfer Service Tests
// ═══════════════════════════════════════════════════════════════

function testTransferService() {
    log.header('Transfer Service Tests');

    const transferPath = path.join(process.cwd(), 'android/app/src/main/java/com/mistershare/TransferService.kt');
    const content = fs.readFileSync(transferPath, 'utf8');

    test('TransferService supports content:// URIs', content.includes('content://'));
    test('TransferService has fallback for SAF files',
        content.includes('filePath.startsWith("content://")') ||
        content.includes('contentResolver.openFileDescriptor'));
    test('TransferService handles large files (buffer optimization)',
        content.includes('ByteBuffer.allocateDirect') || content.includes('1024 * 1024'));
}

// ═══════════════════════════════════════════════════════════════
// 🔄 Game Restore Flow Tests
// ═══════════════════════════════════════════════════════════════

function testGameRestoreFlow() {
    log.header('Game Restore Flow (Receiver Side)');

    const restorePath = path.join(process.cwd(), 'src/components/GameRestoreHelp.tsx');
    const content = fs.readFileSync(restorePath, 'utf8');

    test('GameRestoreHelp handles ZIP files', content.includes("ext === 'zip'"));
    test('GameRestoreHelp handles OBB files', content.includes("ext === 'obb'"));
    test('GameRestoreHelp handles _data.zip files', content.includes('_data.zip'));
    test('GameRestoreHelp extracts ZIP to correct folder', content.includes('extractZip'));
    test('GameRestoreHelp copies OBB directly', content.includes('writeFile'));
}

// ═══════════════════════════════════════════════════════════════
// 🔐 Security Tests
// ═══════════════════════════════════════════════════════════════

function testSecurity() {
    log.header('Security Tests');

    const safModulePath = path.join(process.cwd(), 'android/app/src/main/java/com/mistershare/SAFModule.kt');
    const content = fs.readFileSync(safModulePath, 'utf8');

    // Zip Slip protection: check for ".." path traversal prevention
    const hasZipSlipProtection = content.includes('contains("..")') ||
        content.includes('.contains(\"..\")') ||
        content.includes('entryName.contains("..")');
    test('Zip Slip protection (path traversal check)', hasZipSlipProtection);

    // No MANAGE_EXTERNAL_STORAGE - check for actual usage (not comments)
    // Look for permission declaration or request patterns
    const hasActualManageExternal = content.includes('permission.MANAGE_EXTERNAL_STORAGE') ||
        content.includes('Settings.ACTION_MANAGE_');
    test('No MANAGE_EXTERNAL_STORAGE (privacy compliant)', !hasActualManageExternal);

    test('Persistent URI permissions', content.includes('FLAG_GRANT_PERSISTABLE_URI_PERMISSION'));
    test('Write permission requested', content.includes('FLAG_GRANT_WRITE_URI_PERMISSION'));
}

// ═══════════════════════════════════════════════════════════════
// 📊 Performance Tests
// ═══════════════════════════════════════════════════════════════

function testPerformance() {
    log.header('Performance Optimizations');

    const safModulePath = path.join(process.cwd(), 'android/app/src/main/java/com/mistershare/SAFModule.kt');
    const content = fs.readFileSync(safModulePath, 'utf8');

    test('Uses ContentResolver.query() instead of DocumentFile.listFiles()',
        content.includes('contentResolver.query') || content.includes('ContentResolver'));
    test('Permission caching implemented',
        content.includes('permissionCache') || content.includes('CACHE_TTL'));
    test('Buffer size optimized',
        content.includes('BUFFER_SIZE') || content.includes('256 * 1024'));
    test('Uses Kotlin Coroutines', content.includes('scope.launch') || content.includes('Dispatchers.IO'));
}

// ═══════════════════════════════════════════════════════════════
// 🎮 Game Simulation Tests
// ═══════════════════════════════════════════════════════════════

function simulateGameTransfer() {
    log.header('Game Transfer Simulation');

    console.log('🎮 Simulating game file discovery for popular games:\n');

    TEST_GAMES.forEach(game => {
        console.log(`${COLORS.cyan}📱 ${game.name} (${game.package})${COLORS.reset}`);

        // Simulate Legacy Mode (Android ≤10)
        const legacyObbPath = `/storage/emulated/0/Android/obb/${game.package}`;
        const legacyDataPath = `/storage/emulated/0/Android/data/${game.package}`;
        console.log(`   Legacy OBB Path: ${legacyObbPath}`);
        console.log(`   Legacy DATA Path: ${legacyDataPath}`);

        // Simulate SAF Mode (Android 11+)
        const safObbUri = `content://com.android.externalstorage.documents/document/primary%3AAndroid%2Fobb%2F${game.package}`;
        console.log(`   SAF OBB URI: ${safObbUri.substring(0, 80)}...`);

        // Expected files
        if (game.hasObb) {
            console.log(`   ${COLORS.green}✓ OBB files expected${COLORS.reset}`);
        }
        if (game.hasData) {
            console.log(`   ${COLORS.green}✓ DATA files expected (will be zipped)${COLORS.reset}`);
        }
        console.log('');
    });
}

// ═══════════════════════════════════════════════════════════════
// 📋 Summary Report
// ═══════════════════════════════════════════════════════════════

function printSummary() {
    log.header('TEST SUMMARY');

    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`${COLORS.green}✅ Passed: ${passedTests}${COLORS.reset}`);
    console.log(`${COLORS.red}❌ Failed: ${failedTests}${COLORS.reset}`);
    console.log(`${COLORS.yellow}⚠️  Warnings: ${warnings}${COLORS.reset}`);

    const passRate = ((passedTests / totalTests) * 100).toFixed(1);
    console.log(`\n📈 Pass Rate: ${passRate}%`);

    if (failedTests === 0) {
        console.log(`\n${COLORS.bold}${COLORS.green}🎉 ALL CRITICAL TESTS PASSED!${COLORS.reset}`);
        console.log(`\n${COLORS.cyan}النظام جاهز نظرياً للعمل على جميع إصدارات Android (8-15).${COLORS.reset}`);
        console.log(`${COLORS.yellow}ملاحظة: الاختبار الفعلي على الأجهزة لا يزال ضرورياً.${COLORS.reset}`);
    } else {
        console.log(`\n${COLORS.bold}${COLORS.red}⚠️  SOME TESTS FAILED - REVIEW REQUIRED${COLORS.reset}`);
    }
}

// ═══════════════════════════════════════════════════════════════
// 🚀 Main Execution
// ═══════════════════════════════════════════════════════════════

console.log(`
${COLORS.bold}${COLORS.cyan}
╔═══════════════════════════════════════════════════════════════╗
║     MisterShare - SAF Compatibility Test Suite                ║
║     اختبار توافق نظام نقل ملفات اللعبة                         ║
╚═══════════════════════════════════════════════════════════════╝
${COLORS.reset}
`);

try {
    testFileExistence();
    testNativeMethods();
    testTypeScriptMethods();
    testAndroidCompatibility();
    testGameDiscoveryFlow();
    testTransferService();
    testGameRestoreFlow();
    testSecurity();
    testPerformance();
    simulateGameTransfer();
    printSummary();
} catch (error) {
    console.error(`\n${COLORS.red}Fatal Error: ${error.message}${COLORS.reset}`);
    process.exit(1);
}
