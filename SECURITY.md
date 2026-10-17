# Security Policy

RUN STITCHCODE is designed to be boring in the best way: it has **no server,
no accounts and no data leaving the device**, which keeps the attack surface
very small. Security is still taken seriously.

## What protects your saved history (honest version)

Saved builds — including Wi-Fi passwords and contact details — are stored in
an AES-256-GCM encrypted vault in your browser's IndexedDB.

- **By default** the vault key is wrapped with a random device key stored
  alongside it. This is **obfuscation, not protection**: anyone (or any
  script) with access to your browser profile can read the data. It prevents
  casual snooping in devtools and nothing more.
- **With a passphrase** (set it in the studio's history section), the vault
  key is wrapped with a key derived from your passphrase
  (PBKDF2-SHA256, 600 000 iterations, HKDF domain separation). That is real
  protection: without the passphrase the history is unreadable. There is no
  recovery — a forgotten passphrase means the data is gone.
- There is **no sync and no escrow**. History lives in this browser profile
  only. Clearing site data deletes it (that is the point).

The pre-1.3 scheme derived its key from public browser fingerprint values
(user agent, timezone…) — equivalent to obfuscation, and a browser update
silently wiped the data. It is migrated automatically on first launch of
1.3.0 where still readable.

## Desktop builds are not signed

Electron binaries are not code-signed or notarized yet, so macOS Gatekeeper
and Windows SmartScreen will show warnings. Verify downloads with the
release's `checksums-sha256.txt` and GitHub attestations:
`gh attestation verify <file> -R RUN-APPAREL/stitchcode`.
Signing upgrade paths: [docs/RELEASE_SIGNING.md](./docs/RELEASE_SIGNING.md).

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅ — receives security fixes |
| < 1.0   | ❌ — too old, please update |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

The preferred, private way:

1. Go to the repository's **Security** tab on GitHub.
2. Choose **Report a vulnerability** (private advisory).
3. Describe what you found, with steps to reproduce if you can.

If private advisories are unavailable, contact a maintainer through GitHub
direct messages and ask for a secure channel.

### What happens next

| Step | Timeframe |
|---|---|
| "We received it" reply | within **48 hours** |
| First assessment | within **7 days** |
| Fix & release (if confirmed) | as fast as safely possible |
| Public credit | in the release notes, if the reporter wants it |

## Scope notes

Because the app is fully local, typical web vulnerabilities (SQL injection,
server-side request forgery, session hijacking…) do not apply. Reports that
matter most:

- Anything that could exfiltrate user input or stored history.
- Cross-site scripting via crafted payloads rendered into the page.
- Supply-chain risks in bundled dependencies.
- Decode-test bypasses that let an unscannable code claim "✓ It works".

Thank you for helping keep the studio safe for its youngest users.
