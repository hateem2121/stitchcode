# Security Best Practices - Stitchcode QR Studio

## Overview

This document outlines the security architecture and best practices implemented in Stitchcode QR Studio as of August 2026.

## Core Security Principles

### 1. Offline-First Architecture
- **Zero external requests**: The app never sends data to any server
- **Bundled dependencies**: All libraries (fonts, decoder) are included in the build
- **Local processing**: QR encoding, logo stitching, and decode testing happen entirely in-browser

### 2. Data Protection
- **Encryption at rest**: All sensitive history items encrypted with AES-256-GCM
- **Key derivation**: PBKDF2-SHA256 with 350,000 iterations (OWASP 2026 standard)
- **Device fingerprinting**: Encryption keys derived from stable browser properties

### 3. Content Security
- **Strict CSP**: No `'unsafe-inline'` in script-src directive
- **No eval()**: Zero usage of dangerous code execution patterns
- **SVG safety**: All SVG content internally generated with proper escaping

### 4. Input Validation
- **Protocol whitelisting**: Only http/https URLs allowed
- **Payload size limits**: ISO/IEC 18004:2015 compliant capacity validation
- **Email header injection prevention**: Newline characters stripped
- **File type validation**: Magic number verification for image uploads

## Cryptographic Implementation

### Encryption Flow
```
User Data → JSON.stringify → AES-256-GCM Encrypt → Base64 → localStorage
                    ↓
            PBKDF2 Key Derivation
                    ↓
        Device Fingerprint + Random Salt
```

### Security Parameters
| Parameter | Value | Standard |
|-----------|-------|----------|
| Encryption Algorithm | AES-GCM | NIST SP 800-38D |
| Key Size | 256 bits | FIPS 197 |
| Key Derivation | PBKDF2-SHA256 | NIST SP 800-132 |
| Iterations | 350,000 | OWASP 2026 |
| Salt Length | 16 bytes | NIST recommendation |
| IV Length | 12 bytes | GCM optimal size |

## Threat Model

### Assets Protected
- WiFi passwords
- Contact information (vCards)
- Phone numbers
- Email addresses
- Custom messages
- User-uploaded logos

### Threat Actors
- Malicious websites (XSS attempts)
- Physical device access
- Network attackers (MITM)
- Compromised dependencies

### Mitigations
| Threat | Mitigation |
|--------|------------|
| XSS | Strict CSP, no eval(), output encoding |
| Data theft | Encryption, secure contexts |
| MITM | HTTPS requirement, no external requests |
| Supply chain | Bundled deps, integrity checks |

## Production Deployment Requirements

### Mandatory
1. **HTTPS Only**: Serve over TLS 1.3 with HSTS
2. **Security Headers**:
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self' blob:; ...
   X-Frame-Options: DENY
   X-Content-Type-Options: nosniff
   Permissions-Policy: camera=(), microphone=(), geolocation=()
   ```
3. **Secure Cookies**: If using any cookies (not required for this app)

### Recommended
1. Subresource Integrity for any future CDN resources
2. Regular dependency audits (`npm audit`)
3. Automated security scanning in CI/CD
4. Bug bounty program for responsible disclosure

## Electron-Specific Security

When running as desktop app:
- `nodeIntegration: false` (default)
- `contextIsolation: true` (default)
- CSP enforced via session headers
- Preload script minimal API exposure

## Compliance

This implementation aligns with:
- OWASP Top 10 (2026)
- OWASP ASVS Level 1
- GDPR Article 25 (Data Protection by Design)
- NIST Cybersecurity Framework

## Reporting Security Issues

See [SECURITY.md](../SECURITY.md) for responsible disclosure process.

---

*Last updated: August 17, 2026*
*Next review: August 2027*
