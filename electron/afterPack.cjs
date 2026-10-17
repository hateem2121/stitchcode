/**
 * Flips Electron fuses after packaging (before signing) — the hardened
 * baseline from the Electron security checklist. The `electronFuses`
 * package.json config key does not exist in electron-builder 26.15, so this
 * uses the official @electron/fuses hook instead.
 */
const path = require("node:path");
const { flipFuses, FuseVersion, FuseV1Options } = require("@electron/fuses");

/**
 * @param {{
 *   appOutDir: string,
 *   electronPlatformName: string,
 *   packager: { appInfo: { productFilename: string } },
 * }} context
 */
exports.default = async function afterPack(context) {
  const name = context.packager.appInfo.productFilename;
  const platform = context.electronPlatformName;
  const target =
    platform === "darwin"
      ? path.join(context.appOutDir, `${name}.app`)
      : path.join(context.appOutDir, platform === "win32" ? `${name}.exe` : name);

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
