# ✅ Production Readiness Checklist

A visual, tick-off-able list for whoever ships RUN STITCHCODE to the world.
Everything below is already wired — this is the *verification* pass.

---

## Phase 1 · Before the first push

The canonical handle is **`RUN-APPAREL/stitchcode`** — every badge, URL,
`docker run` command, CODEOWNERS entry and wiki link already points at it.

```mermaid
flowchart LR
  A["git init · first commit"] --> B["Push to GitHub"]
  B --> C["Settings → Pages<br/>Source: GitHub Actions"]
  C --> D["make wiki-init<br/>(pushes wiki/*.md)"]
  D --> E["make release<br/>(tags v1.0.0)"]
  style A fill:#fff6f0,stroke:#c22e12,stroke-width:2px
  style E fill:#eaf6ee,stroke:#132a22,stroke-width:2px
```

- [x] Every reference uses the real handle `RUN-APPAREL`
- [x] `.gitignore`, `LICENSE`, `README`, `CHANGELOG` present
- [ ] First push triggers the **CI** workflow → both Node jobs pass
- [ ] Pages source switched to **GitHub Actions** → site goes live at
      `RUN-APPAREL.github.io/stitchcode`
- [ ] Wiki initialised (one-time: create any wiki page on GitHub), then
      `make wiki-init` pushes `wiki/*.md` to `stitchcode.wiki.git`
- [ ] Social preview set: Settings → General → Social preview → upload
      `docs/assets/banner.svg` (a 1280×420 PNG export works best)

> **Forking under a different name?** One command re-points everything:
> ```bash
> grep -rl "RUN-APPAREL" . --exclude-dir=node_modules | xargs sed -i "s/RUN-APPAREL/YOUR-HANDLE/g"
> ```

## Phase 2 · First release

- [ ] `make release` — tags `v1.0.0`, pushes the tag, and the robots take over
- [ ] Release workflow publishes a **zip** (portable, relative-base) ✔
- [ ] Docker workflow publishes **ghcr.io/run-apparel/stitchcode:1.0.0** ✔
- [ ] `CHANGELOG.md` already lists 1.0.0 (it does)

## Phase 3 · Smoke-test the live studio

| # | Test | Pass when… |
|---|------|-----------|
| 1 | Load the Pages URL | studio renders, fonts load (offline bundle) |
| 2 | Build a code, watch the checks | all rows green, "✓ ready to scan" |
| 3 | **Decode test** says "It works!" | a real decoder read it back |
| 4 | Download PNG + SVG | files save & re-scan |
| 5 | Print proof → browser print dialog | only the paper prints |
| 6 | Switch all 5 themes + shuffle | recolours instantly, choice persists on reload |
| 7 | Drop a picture → Stitch at 100% | full-bleed photo QR, still decodes |
| 8 | DevTools → Network → **Offline** → reload | app still works (service worker) |
| 9 | Browser menu → **Install app** | installs, opens standalone |
| 10 | Restore a build from history | settings + stitched logo come back |

## Phase 4 · Ongoing maintenance

```
  Dependabot ──▶ bumps deps/Actions/Docker weekly (grouped, low-noise)
  Security   ──▶ private advisories, 48h ack (see SECURITY.md)
  Versions   ──▶ bump CHANGELOG + sw.js VERSION on each release
  Themes     ──▶ keep small-text contrast ≥ 4.5:1 (see docs/THEMING.md)
```

- [ ] Watch Dependabot PRs; merge after CI passes
- [ ] On every release: bump `VERSION` in `public/sw.js` so visitor caches refresh

---

## One-glance architecture

```mermaid
flowchart TD
  subgraph Browser["🌐 The visitor's browser (that's ALL of it)"]
    UI["Studio UI<br/>React + Tailwind"] --> ENG["QR engine<br/>encode · merge · render"]
    ENG --> DEC["Decode test<br/>jsQR (lazy)"]
    UI --> LS["localStorage<br/>themes · history"]
    SW["Service worker<br/>offline cache"] -.-> UI
  end
  subgraph GitHub["🐙 GitHub (build & host only)"]
    ACT["Actions: CI · Pages ·<br/>Release · Docker"] --> GHCR["ghcr.io image"]
    ACT --> PAGES["GitHub Pages site"]
    ACT --> ZIP["Release zip"]
  end
  Browser -. "nothing sent —<br/>only downloads" .-> GitHub

  style Browser fill:#eaf6ee,stroke:#132a22,stroke-width:2px
  style GitHub fill:#eef2fb,stroke:#16336f,stroke-width:2px
```

**The golden invariant:** the browser never *sends* data. GitHub is a
vending machine (it hands the app down); it never receives anything back.
