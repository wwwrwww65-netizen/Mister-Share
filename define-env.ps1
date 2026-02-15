$ErrorActionPreference = "Stop"

Write-Host "=== Setting up MisterShare Environment ===" -ForegroundColor Cyan

# 1. ANDROID_HOME
$androidHome = "J:\Android\Sdk"
if (Test-Path $androidHome) {
    $env:ANDROID_HOME = $androidHome
    $env:ANDROID_SDK_ROOT = $androidHome
    Write-Host "   [OK] ANDROID_HOME set to: $androidHome" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] ANDROID_HOME path not found: $androidHome" -ForegroundColor Red
}

# 2. JAVA_HOME
$javaHome = "C:\Java\jdk-17.0.10+7"
if (Test-Path $javaHome) {
    $env:JAVA_HOME = $javaHome
    Write-Host "   [OK] JAVA_HOME set to: $javaHome" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] JAVA_HOME path not found: $javaHome" -ForegroundColor Red
}

# 3. GRADLE_USER_HOME
$gradleHome = "K:\.gradle"
if (Test-Path "K:\") {
    if (-not (Test-Path $gradleHome)) {
        New-Item -ItemType Directory -Path $gradleHome -Force | Out-Null
        Write-Host "   [OK] Created Gradle directory: $gradleHome" -ForegroundColor Green
    }
    $env:GRADLE_USER_HOME = $gradleHome
    Write-Host "   [OK] GRADLE_USER_HOME set to: $gradleHome" -ForegroundColor Green
} else {
    Write-Host "   [WARNING] Drive K: not found. Using default GRADLE_USER_HOME." -ForegroundColor Yellow
}

# 4. UPDATE PATH
$pathsToAdd = @(
    "$androidHome\platform-tools",
    "$androidHome\emulator",
    "$androidHome\cmdline-tools\latest\bin",
    "$javaHome\bin"
)

foreach ($path in $pathsToAdd) {
    if (Test-Path $path) {
        if ($env:PATH -notlike "*$path*") {
            $env:PATH = "$path;$env:PATH"
            Write-Host "   [ADDED] To PATH: $path" -ForegroundColor Green
        } else {
            Write-Host "   [SKIP] Already in PATH: $path" -ForegroundColor Gray
        }
    } else {
        Write-Host "   [WARNING] Path does not exist, skipping: $path" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Environment Setup Complete ===" -ForegroundColor Cyan
Write-Host "Current JAVA_HOME: $env:JAVA_HOME"
Write-Host "Current ANDROID_HOME: $env:ANDROID_HOME"
