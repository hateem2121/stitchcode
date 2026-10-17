/**
 * Flips Electron fuses after packaging (before signing) — the hardened
 * baseline from the Electron security checklist. The `electronFuses`
 * package.json config key does not exist in electron-builder 26.15, so this
 * uses the official @electron/fuses hook instead.
 */
const fs = require("node:fs");
const path = require("node:path");
const { flipFuses, FuseVersion, FuseV1Options } = require("@electron/fuses");

/**
 * @param {{
 *   appOutDir: string,
 *   electronPlatformName: string,
 *   packager: { appInfo: { productFilename: string, executableName?: string } },
 * }} context
 */
exports.default = async function afterPack(context) {
  const name = context.packager.appInfo.productFilename;
  const platform = context.electronPlatformName;
  let target;
  if (platform === "darwin") {
    target = path.join(context.appOutDir, `${name}.app`);
  } else {
    /* the executable name is sanitised per-platform (e.g. linux lowercases
       the product name) — resolve it from the output directory instead of
       guessing */
    const exec = context.packager.appInfo.executableName || "stitchcode";
    const wanted = platform === "win32" ? `${exec}.exe` : exec;
    const hit = fs
      .readdirSync(context.appOutDir)
      .find((f) => f.toLowerCase() === wanted);
    if (!hit)
      throw new Error(
        `afterPack: no '${wanted}' in ${context.appOutDir} — have: ${fs.readdirSync(context.appOutDir).join(", ")}`,
      );
    target = path.join(context.appOutDir, hit);
  }

  await flipFuses(target, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    // electron-builder injects the ASAR integrity hashes into Info.plist for
    // mac builds; validation without them would brick the app
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    resetAdHocDarwinSignature: platform === "darwin",
  });
};
