# 📦 Download StitchCode QR Studio

## Latest Release: v1.2.3

### 🍎 macOS (Intel/Apple Silicon)
- **Format**: DMG Installer / ZIP archive containing `.app` bundle
- **Size**: ~132 MB (compressed)
- **Downloads**:
  - [StitchCode-1.2.3-arm64.dmg](https://github.com/RUN-APPAREL/stitchcode/releases/download/v1.2.3/StitchCode-1.2.3-arm64.dmg)
  - [StitchCode-1.2.3-arm64-mac.zip](https://github.com/RUN-APPAREL/stitchcode/releases/download/v1.2.3/StitchCode-1.2.3-arm64-mac.zip)

#### Installation Instructions:
1. Download `StitchCode-1.2.3-arm64.dmg` (or `StitchCode-1.2.3-arm64-mac.zip`)
2. Double-click to open
3. Drag `StitchCode.app` to your Applications folder
4. Right-click and select "Open" (first time only, to bypass Gatekeeper)

---

### 🪟 Windows
- **Format**: NSIS Installer (.exe)
- **Architecture**: x64
- **Download**: [StitchCode Setup 1.2.3.exe](https://github.com/RUN-APPAREL/stitchcode/releases/download/v1.2.3/StitchCode.Setup.1.2.3.exe)

#### Installation Instructions:
1. Download installer
2. Double-click to run the installer
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

---

### 🐧 Linux
Available formats:
- **AppImage** - Universal package (recommended)
- **DEB** - Debian/Ubuntu

**Download links**:
- [StitchCode-1.2.3.AppImage](https://github.com/RUN-APPAREL/stitchcode/releases/download/v1.2.3/StitchCode-1.2.3.AppImage)
- [StitchCode_1.2.3_amd64.deb](https://github.com/RUN-APPAREL/stitchcode/releases/download/v1.2.3/stitchcode-qr-studio_1.2.3_amd64.deb)

**Installation**:
```bash
# For AppImage (make executable first)
chmod +x StitchCode.AppImage
./StitchCode.AppImage

# For DEB
sudo dpkg -i StitchCode.deb

# For RPM
sudo rpm -i StitchCode.rpm
```

---

## 🛠️ Build from Source

### Prerequisites
- Node.js 22+ 
- npm 10+

### Steps
```bash
# Clone repository
git clone https://github.com/RUN-APPAREL/stitchcode.git
cd stitchcode

# Install dependencies
npm install

# Build for your platform
npm run electron:build:mac    # macOS
npm run electron:build:win    # Windows
npm run electron:build:linux  # Linux
npm run electron:build        # All platforms
```

### Output Location
Built applications are located in the `dist-electron/` directory:
- macOS: `StitchCode-1.2.3-arm64.dmg`, `StitchCode-1.2.3-arm64-mac.zip`
- Windows: `StitchCode Setup 1.2.3.exe`
- Linux: `StitchCode-1.2.3.AppImage`, `stitchcode-qr-studio_1.2.3_amd64.deb`

---

## 🌐 Web App (No Installation Required)

Use StitchCode directly in your browser:
<<<<<<< HEAD
1. Visit: https://run-apparel.github.io/stitchcode/
=======
1. Visit: https://RUN-APPAREL.github.io/stitchcode/
>>>>>>> d12ba6cc (chore: canonicalize repository identity to RUN-APPAREL/stitchcode)
2. Install as PWA (Progressive Web App):
   - **Chrome**: Click install icon in address bar
   - **Safari**: File → Add to Dock
   - **Edge**: Apps → Install this site as an app

The web app works completely offline after the first load!

---

## ✅ Security Features

- **Encrypted Storage**: All sensitive data (WiFi passwords, contacts) encrypted with AES-256-GCM
- **Hardened CSP**: Strict Content Security Policy prevents XSS attacks
- **Payload Validation**: ISO/IEC 18004:2015 compliant QR capacity limits
- **Offline-First**: Works completely offline after initial load
- **No Tracking**: Zero analytics, no accounts, no data collection

> **Note**: Current builds are not code-signed. For production use in enterprise environments, code signing is recommended to avoid security warnings.

---

## 💻 System Requirements

### macOS
- macOS 10.13 (High Sierra) or later
- Intel or Apple Silicon processor
- 200 MB free disk space

### Windows
- Windows 10 or later
- x64 architecture
- 200 MB free disk space

### Linux
- Modern 64-bit distribution
- glibc 2.28+
- 200 MB free disk space

---

## 🔧 Troubleshooting

### macOS: "App can't be opened"
Right-click the app → Open → Click "Open" in the dialog

### Windows: SmartScreen warning
Click "More info" → "Run anyway"

### Linux: AppImage won't execute
```bash
chmod +x StitchCode.AppImage
./StitchCode.AppImage
```

### General Issues
- Make sure you have Node.js 22+ installed
- Clear npm cache: `npm cache clean --force`
- Reinstall dependencies: `rm -rf node_modules && npm install`

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/RUN-APPAREL/stitchcode/issues)
- **Documentation**: See main README.md
- **Security Reports**: See SECURITY.md
- **Community Discussions**: [GitHub Discussions](https://github.com/RUN-APPAREL/stitchcode/discussions)
