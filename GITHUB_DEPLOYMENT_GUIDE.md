# 🚀 How to Publish StitchCode on GitHub for Downloads

This guide shows you how to put your app on GitHub so people can download it for Mac, Windows, and Linux.

---

## 📋 What You Need First

1. **A GitHub account** (free at github.com)
2. **Git installed** on your computer
3. **Node.js 22+** installed
4. Your StitchCode app already built and working

---

## Step 1: Create a GitHub Repository

### Option A: Create from GitHub Website (Easiest!)
1. Go to https://github.com/new
2. Fill in:
   - **Repository name**: `stitchcode`
   - **Description**: "Professional QR Code Studio with logo stitching technology"
   - Choose **Public** (so anyone can see and download)
   - ❌ Don't check "Initialize with README" (we already have one)
3. Click **"Create repository"**

### Option B: Create from Command Line
```bash
cd /path/to/your/stitchcode
git remote add origin https://github.com/YOUR_USERNAME/stitchcode.git
```

---

## Step 2: Push Your Code to GitHub

Open your terminal and run these commands:

```bash
# Go to your project folder
cd stitchcode

# Make sure Git is tracking everything
git init
git add .
git commit -m "Initial commit: StitchCode QR Studio"

# Connect to GitHub (replace YOUR_USERNAME with your actual username)
git remote add origin https://github.com/YOUR_USERNAME/stitchcode.git

# Upload your code
git push -u origin main
```

> 💡 **If you get an error about "main" vs "master":**
> ```bash
> git branch -M main
> git push -u origin main
> ```

---

## Step 3: Build the Downloadable Apps

Now let's make the actual app files people can download:

```bash
# Install all needed parts
npm install

# Build for ALL platforms at once
npm run electron:build
```

This creates files in the `dist-electron/` folder:
- 🍎 **Mac**: `StitchCode-mac.zip`
- 🪟 **Windows**: `StitchCode Setup.exe`
- 🐧 **Linux**: `StitchCode.AppImage`, `StitchCode.deb`, `StitchCode.rpm`

> ⏱️ **This takes 5-10 minutes** — go grab a snack!

---

## Step 4: Create Your First Release

### On GitHub Website:

1. Go to your repository: `https://github.com/YOUR_USERNAME/stitchcode`
2. Click **"Releases"** on the right side
3. Click **"Draft a new release"**
4. Fill in:
   - **Tag version**: `v1.2.0` (or whatever version you're on)
   - **Release title**: `StitchCode v1.2.0`
   - **Description**: 
     ```
     ## What's New
     - Professional QR Code Studio with logo stitching
     - Works completely offline
     - Available for Mac, Windows, and Linux
     
     ## Installation
     - 🍎 Mac: Download the zip, extract, drag to Applications
     - 🪟 Windows: Run the installer
     - 🐧 Linux: Use AppImage or install deb/rpm
     ```
5. **Upload Files**: Drag and drop ALL files from `dist-electron/` folder:
   - `StitchCode-mac.zip`
   - `StitchCode Setup.exe`
   - `StitchCode.AppImage`
   - `StitchCode.deb`
   - `StitchCode.rpm`
6. Check **"Set as latest release"**
7. Click **"Publish release"**

---

## Step 5: Update Your Download Links

Now update the `DOWNLOAD.md` file with your actual GitHub username:

1. Open `DOWNLOAD.md` in your code editor
2. Replace `hateem2121` with YOUR GitHub username in all these links:
   ```
   https://github.com/YOUR_USERNAME/stitchcode/releases/download/v1.2.0/...
   ```
3. Save and commit:
   ```bash
   git add DOWNLOAD.md
   git commit -m "Update download links"
   git push
   ```

---

## Step 6: Enable GitHub Pages (For Web Version)

Let people use StitchCode in their browser too!

1. Go to your repository **Settings**
2. Click **"Pages"** on the left
3. Under "Source", choose:
   - **Branch**: `main`
   - **Folder**: `/docs` (or root if you prefer)
4. Click **"Save"**

In 1-2 minutes, your web app will be live at:
```
https://YOUR_USERNAME.github.io/stitchcode/
```

---

## Step 7: Set Up Automatic Builds (Optional but Awesome!)

Make GitHub build apps automatically when you tag a release:

### Create `.github/workflows/release.yml`:

```yaml
name: Build & Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for current platform
        run: |
          npm run build
          npm run electron:build
      
      - name: Upload to Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist-electron/*
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Now whenever you tag a release:
```bash
git tag v1.2.1
git push origin v1.2.1
```

GitHub will automatically:
- ✅ Build for Mac, Windows, and Linux
- ✅ Attach all files to your release
- ✅ Email you when done!

---

## Step 8: Share Your App!

Now you can share these links:

### 📦 Download Page:
```
https://github.com/YOUR_USERNAME/stitchcode/releases
```

### 🌐 Web App:
```
https://YOUR_USERNAME.github.io/stitchcode/
```

### 📖 Main Repository:
```
https://github.com/YOUR_USERNAME/stitchcode
```

---

## 🔧 Troubleshooting

### "Permission denied" when pushing
```bash
# Use HTTPS instead of SSH
git remote set-url origin https://github.com/YOUR_USERNAME/stitchcode.git
```

### Build fails on Windows
- Make sure you have Visual C++ Redistributable installed
- Run terminal as Administrator

### Build fails on Mac
- Go to System Preferences → Security & Privacy
- Allow "Developer Tools" for Terminal

### Files too large for Git
Add to `.gitignore`:
```
node_modules/
dist-electron/
.DS_Store
```

---

## ✅ Checklist Before Publishing

- [ ] Code works locally
- [ ] All tests pass
- [ ] README.md is clear and helpful
- [ ] DOWNLOAD.md has correct links
- [ ] LICENSE file exists
- [ ] SECURITY.md exists
- [ ] Screenshots in README (optional but nice!)
- [ ] Tested on at least one platform

---

## 🎉 You Did It!

Your app is now on GitHub for the world to download! 

Next steps:
- Share on social media
- Post in relevant Reddit communities
- Add to product hunt
- Tell your friends!

---

## 📞 Need Help?

- GitHub Docs: https://docs.github.com/en/repositories
- Electron Builder: https://www.electron.build/
- Issues: https://github.com/YOUR_USERNAME/stitchcode/issues
