# 📦 Download StitchCode QR Studio

Get the latest version from the **Releases page** — filenames carry the
version and platform, and every release ships a `checksums-sha256.txt` plus
GitHub build-provenance attestations you can verify:

```bash
gh attestation verify <downloaded-file> -R RUN-APPAREL/stitchcode
```

➡️ **[Latest release](https://github.com/RUN-APPAREL/stitchcode/releases/latest)**

### 🍎 macOS (Apple Silicon)
- **Formats**: DMG installer and ZIP (both `arm64`)
- **Install**: open the DMG → drag `StitchCode.app` to Applications →
  right-click → **Open** the first time (the app is not yet notarized —
  see [docs/RELEASE_SIGNING.md](./docs/RELEASE_SIGNING.md))
- **Requires**: macOS 13 or later (Electron 44 platform floor)

### 🪟 Windows
- **Format**: NSIS installer (`.exe`, x64)
- **Install**: run the installer → follow the wizard
- SmartScreen may warn on unsigned binaries: **More info → Run anyway**
- **Requires**: Windows 10 or later

### 🐧 Linux
- **Formats**: AppImage (recommended) and `.deb` — no RPM target is built
- **Install**:
  ```bash
  chmod +x StitchCode-*.AppImage && ./StitchCode-*.AppImage
  sudo apt install ./stitchcode-qr-studio_*_amd64.deb
  ```

---

## 🛠️ Build from Source

Requires Node.js 22+ (`package.json` engines; `.nvmrc` pins 24).

```bash
git clone https://github.com/RUN-APPAREL/stitchcode.git
cd stitchcode
npm ci
npm run electron:build:mac    # or :win / :linux
```

Output lands in `dist-electron/` — macOS `*.dmg` + `*-mac.zip`,
Windows `*.exe`, Linux `*.AppImage` + `*.deb`.

---

## 🌐 Web App (No Installation Required)

Use StitchCode directly in your browser:
1. Visit: https://run-apparel.github.io/stitchcode/
2. Install as PWA (Progressive Web App):
   - **Chrome**: Click install icon in address bar
   - **Safari**: File → Add to Dock
   - **Edge**: Apps → Install this site as an app

The web app works completely offline after the first load!

---

## ✅ Security Features

- **Local-only by design**: no server, no accounts, no telemetry — payloads
  (including Wi-Fi passwords) never leave the device
- **Encrypted history**: AES-256-GCM vault in IndexedDB; obfuscated at rest by
  default, genuinely encrypted when you set a passphrase (see SECURITY.md)
- **Hardened CSP** in both the web build and the Electron wrapper
- **Spec-safe exports**: quiet-zone and per-block error-correction gates on
  every logo merge, with a real decoder verifying the rendered output

> **Note**: Desktop builds are **not code-signed** yet — macOS Gatekeeper and
> Windows SmartScreen will warn. Upgrade paths (Apple Developer ID
> notarization, SignPath Foundation signing for OSS) are documented in
> [docs/RELEASE_SIGNING.md](./docs/RELEASE_SIGNING.md).

---

## 💻 System Requirements

| Platform | Minimum |
|---|---|
| macOS | macOS 13+ (Electron 44), Apple Silicon or Intel |
| Windows | Windows 10+, x64 |
| Linux | 64-bit distro, glibc 2.28+ |
| All | ~200 MB free disk space |

---

## 🔧 Troubleshooting

### macOS: "App can't be opened"
Right-click the app → Open → Click "Open" in the dialog (or
`xattr -dr com.apple.quarantine StitchCode.app`).

### Windows: SmartScreen warning
Click "More info" → "Run anyway".

### Linux: AppImage won't execute
```bash
chmod +x StitchCode-*.AppImage
./StitchCode-*.AppImage
```

### General Issues
- Make sure you have Node.js 22+ installed
- Clear npm cache: `npm cache clean --force`
- Reinstall dependencies: `rm -rf node_modules && npm ci`

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/RUN-APPAREL/stitchcode/issues)
- **Documentation**: See main README.md
- **Security Reports**: See SECURITY.md
- **Community Discussions**: [GitHub Discussions](https://github.com/RUN-APPAREL/stitchcode/discussions)
