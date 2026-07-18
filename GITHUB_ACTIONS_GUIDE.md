# OD Inventory Management System - GitHub Actions .EXE Build Guide

## Overview

The project is configured to automatically build Windows .exe installers using GitHub Actions CI/CD. This eliminates the need to cross-compile from macOS and ensures the native modules (better-sqlite3, argon2) are compiled correctly for Windows.

## How to Get the .EXE File

### Method 1: Automatic Release (Recommended)

1. **Create a Git Tag**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Monitor GitHub Actions**
   - Go to your repository: https://github.com/aaliyanshah33/OD---Anti-G
   - Click on the "Actions" tab
   - Watch the "Build & Release" workflow run
   - When complete, the workflow will automatically create a GitHub Release

3. **Download the .EXE**
   - Go to the "Releases" section of your repository
   - Find the matching release (e.g., v1.0.0)
   - Download `OD-IMS-Windows-Installer-*.exe`

### Method 2: Manual Build Artifacts

1. **Push Code to Main Branch**
   ```bash
   git push origin main
   ```

2. **GitHub Actions Automatically Runs**
   - The workflow is triggered on every push to `main`
   - It builds for Windows, macOS, and Linux

3. **Access Build Artifacts**
   - Go to the specific workflow run in the "Actions" tab
   - Scroll down to "Artifacts"
   - Download `OD-IMS-Windows-Installer` (contains .exe file)
   - Artifacts are available for 30 days

### Method 3: Manual Local Build (Requires Windows Machine)

If you want to build locally on a Windows machine:

```bash
# On Windows
npm install
npm run build:win

# Output: release/OD Inventory System*.exe
```

## GitHub Actions Workflow Details

The workflow file (`.github/workflows/build.yml`) does the following:

### Build Stage
- Runs on Windows, macOS, and Linux runners
- Installs Node.js dependencies
- Runs ESLint checks
- Compiles TypeScript/React with electron-vite
- Builds native modules correctly for each platform

### Windows Build
```bash
npm run build:win
```
- Creates NSIS installer
- Outputs: `release/OD Inventory System*.exe`
- **Includes**: All compiled native modules (better-sqlite3, argon2)

### Release Stage
- Triggered automatically when you push a tag (e.g., `v1.0.0`)
- Creates a GitHub Release
- Uploads installers for all platforms
- Generates release notes

## Setting Up GitHub Actions for Your Repo

The workflow is already configured! Here's what's set up:

1. **`.github/workflows/build.yml`** — Main build workflow
2. **Environment**: 
   - Node.js 18.x
   - npm for dependency management
   - Windows, macOS, Linux runners

### First-Time Setup

1. **Ensure repository settings allow Actions**:
   - Go to Settings → Actions → General
   - Ensure "Actions permissions" is set to "Allow all actions"

2. **Verify package.json scripts exist**:
   ```json
   {
     "scripts": {
       "build": "electron-vite build",
       "build:win": "npm run build && electron-builder --win",
       "lint": "eslint src --ext .ts,.tsx"
     }
   }
   ```

3. **Push a tag to trigger release workflow**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

## Workflow Stages

### On Every Push
- ✅ Install dependencies
- ✅ Run linting
- ✅ Build application
- ✅ Build platform-specific installers
- ✅ Upload artifacts (30-day retention)

### On Tag Push (Release)
- ✅ Download all artifacts
- ✅ Create GitHub Release
- ✅ Upload release assets
- ✅ Generate release notes

## Monitoring the Build

1. **During Build**:
   - Go to Actions tab
   - Click the running workflow
   - Watch real-time logs

2. **After Build**:
   - Check for ✅ (success) or ❌ (failure)
   - Download artifacts or release assets

## Troubleshooting

### Build Fails on Windows Runner

**Common Issue**: Native module compilation errors for better-sqlite3 or argon2

**Solution**: 
- GitHub Actions uses Windows Server with Build Tools
- The workflow automatically handles this
- If it fails, check:
  - `npm ci` output for dependency issues
  - See Build Tools are installed on the runner

### Missing .EXE File

**Check**:
1. Did you push to `main` branch?
2. Is the Actions workflow visible in the Actions tab?
3. Did it complete successfully (green checkmark)?

**If artifacts show 0 files**:
- The build may have failed
- Check the workflow logs for errors
- Common cause: Lint errors in TypeScript

### Can't Find Release Assets

**Make sure**:
1. You pushed a git tag: `git tag v1.0.0 && git push origin v1.0.0`
2. The release workflow completed
3. You're looking in the Releases section, not Actions artifacts

## Environment Variables (Optional)

If you need to customize the build, add secrets to GitHub:

1. Go to Settings → Secrets and variables → Actions
2. Add any secrets needed (e.g., code signing certificates for macOS)

Current workflow doesn't require secrets, but you can add:
- `APPLE_ID` for macOS code signing
- `WIN_SIGNING_CERT` for Windows code signing

## File Locations

After the build completes:

- **Windows Installer**: `release/OD Inventory System 1.0.0.exe`
- **Artifacts URL**: `https://github.com/aaliyanshah33/OD---Anti-G/actions`
- **Releases URL**: `https://github.com/aaliyanshah33/OD---Anti-G/releases`

## Next Steps

1. **Push your code**:
   ```bash
   git add .
   git commit -m "Add security features and CI/CD"
   git push origin main
   ```

2. **Create a release**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **Download .EXE**:
   - Wait for Actions workflow to complete
   - Go to Releases and download the installer

## Quick Start

```bash
# 1. Initialize git (if needed)
cd /Users/macbookpro/Desktop/OD\ IM\ Antigravity/Untitled
git init

# 2. Add all files
git add .

# 3. Commit
git commit -m "Initial commit with Argon2, encryption, and CI/CD"

# 4. Add remote (use your repo URL)
git remote add origin https://github.com/aaliyanshah33/OD---Anti-G.git

# 5. Push
git push -u origin main

# 6. Create release tag
git tag v1.0.0
git push origin v1.0.0

# 7. Monitor at: https://github.com/aaliyanshah33/OD---Anti-G/actions
```

That's it! The .EXE will be built automatically by GitHub Actions and available in the Releases section.
