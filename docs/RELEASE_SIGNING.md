# Release signing — current state and upgrade paths

## Current state (1.3.0)

Desktop builds are **unsigned**. The release pipeline already stages
everything signing needs, so adding credentials is a configuration change,
not a rewrite:

- electron-builder 26 with `hardenedRuntime` + `gatekeeperAssess` enabled
  for macOS, and `electronFuses` flipped (`runAsNode`, `nodeCliInspect`,
  `nodeOptions` off; ASAR integrity + `onlyLoadAppFromAsar` on)
- Releases are drafts with SHA-256 checksums and GitHub build-provenance
  attestations — users can verify a download came from this repo's CI:

  ```bash
  gh attestation verify StitchCode-1.3.0-arm64.dmg -R RUN-APPAREL/stitchcode
  ```

## macOS — Apple Developer ID + notarization

Requires an Apple Developer Program membership ($99/yr). electron-builder 26
has notarization built in (the old `afterSign` hook pattern is obsolete —
do not reintroduce it).

1. Add repo secrets: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`,
   `APPLE_TEAM_ID` (or `ASC_KEY`/`ASC_KEY_ID`/`ASC_PROVIDER` for the
   App Store Connect API route).
2. In `package.json` → `build.mac`, add:

   ```json
   "notarize": true
   ```

3. Remove `CSC_IDENTITY_AUTO_DISCOVERY: "false"` from
   `.github/workflows/release.yml` and provide the signing identity
   (`CSC_NAME` or a `CSC_LINK`/`CSC_KEY_PASSWORD` secret pair).

macOS **auto-update** (electron-updater) additionally requires signed builds
— it is deliberately not wired up until this lands.

## Windows — options for open source

| Option | Cost | Notes |
|---|---|---|
| [SignPath Foundation](https://signpath.org) | free for qualifying OSS | Authenticode (OV); apply at signpath.io — the standard OSS route |
| Azure Artifact Signing (formerly Trusted Signing) | ~$9.99/mo | Individual accounts must be US-based; orgs from more countries; electron-builder supports it natively via `azureSignOptions` |
| Certum Open Source cert | ~$150+ | Off-the-shelf; no hardware token |

With any of these, add the secrets and the matching `win` config
(e.g. `signingHashAlgorithms`, `rfc3161TimeStampServer`), then drop the
SmartScreen caveats from DOWNLOAD.md.

## Docker image

Already attested (SBOM + SLSA provenance mode=max) and served from an
unprivileged, digest-pinned nginx base. No signing work pending.
