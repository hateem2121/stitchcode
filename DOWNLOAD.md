# 📦 Download StitchCode QR Studio

## Latest Release: v1.2.0

### macOS (Intel/Apple Silicon)
- **Format**: ZIP archive containing `.app` bundle
- **Size**: 361 MB (compressed)
- **Download**: [StitchCode-mac.zip](https://github.com/YOUR_USERNAME/stitchcode-qr-studio/releases/download/v1.2.0/StitchCode-mac.zip)

#### Installation Instructions:
1. Download `StitchCode-mac.zip`
2. Double-click to extract
3. Drag `StitchCode.app` to your Applications folder
4. Right-click and select "Open" (first time only, to bypass Gatekeeper)

---

### Windows
- **Format**: NSIS Installer (.exe)
- **Architecture**: x64
- **Build Command**: `npm run electron:build:win`

---

### Linux
Available formats:
- **AppImage** - Universal package (recommended)
- **DEB** - Debian/Ubuntu
- **RPM** - Fedora/RHEL

**Build Commands**:
```bash
npm run electron:build:linux
```

---

## Build from Source

### Prerequisites
- Node.js 22+ 
- npm 10+

### Steps
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/stitchcode-qr-studio.git
cd stitchcode-qr-studio

# Install dependencies
npm install

# Build for your platform
npm run electron:build:mac    # macOS
npm run electron:build:win    # Windows
npm run electron:build:linux  # Linux
```

### Output Location
Built applications are located in the `dist-electron/` directory.

---

## Web App (No Installation Required)

Use StitchCode directly in your browser:
1. Visit the deployed web app URL
2. Install as PWA (Progressive Web App):
   - **Chrome**: Click install icon in address bar
   - **Safari**: File → Add to Dock
   - **Edge**: Apps → Install this site as an app

---

## Security Features ✅

- **Encrypted Storage**: All sensitive data (WiFi passwords, contacts) encrypted with AES-256-GCM
- **Hardened CSP**: Strict Content Security Policy prevents XSS attacks
- **Payload Validation**: ISO/IEC 18004:2015 compliant QR capacity limits
- **Offline-First**: Works completely offline after initial load
- **No Code Signing** (current builds): For production use, code signing is recommended

---

## System Requirements

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

## Troubleshooting

### macOS: "App can't be opened"
Right-click the app → Open → Click "Open" in the dialog

### Windows: SmartScreen warning
Click "More info" → "Run anyway"

### Linux: AppImage won't execute
```bash
chmod +x StitchCode-*.AppImage
./StitchCode-*.AppImage
```

---

## Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/stitchcode-qr-studio/issues)
- **Documentation**: See main README.md
- **Security Reports**: See SECURITY_HARDENING.md
