const { series } = require("gulp");
const gulp = require("gulp");
const mustache = require("mustache");
const fs = require("fs").promises;
const path = require("path");
const semver = require("semver");

const packageJson = require("./package.json");
const packageLockJson = require("./package-lock.json");

const templatesDir = "templates";
//const rootDir = "C:/Users/Admin/Desktop/bedrock-server-1.19.60.23/development_behavior_packs/dnmotd";
//const rootDir =
//  "C:/Users/Admin/AppData/Local/Packages/Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe/LocalState/games/com.mojang/development_behavior_packs/dnMOTD";
const rootDir = "C:/src/mc/build/win32_server_x64/handheld/src-server/Release/development_behavior_packs/dnmotd";
const distDir = "dist";

async function generateManifest() {
  const packageData = {
    package_name: packageJson.name,
    package_description: packageJson.description,
    package_version: packageJson.version,
    // Generate a list of Minecraft dependencies from our NPM dependencies
    pack_dependencies: Object.keys(packageLockJson.dependencies)
      .filter((x) => x.startsWith("@minecraft/"))
      .map((x) => {
        // Strip '1.1.0-beta.1.19.60-preview.23' to 1.1.0-beta'
        const npmVersion = semver.parse(packageLockJson.dependencies[x].version);
        if (npmVersion.prerelease.length > 1) {
          npmVersion.prerelease = [npmVersion.prerelease[0]];
        }

        return {
          name: x,
          version: npmVersion.format(),
        };
      })
      // Add array mustache utilities
      .map(function (val, key, array) {
        val.is_last = key == array.length - 1;
        return val;
      }),
  };
  const manifestData = await fs.readFile(path.join(templatesDir, "manifest.json.mustache"), "utf8");
  const renderedData = await mustache.render(manifestData, packageData, {});
  return fs.writeFile(path.join(distDir, "manifest.json"), renderedData);
}

function copySourceFiles() {
  return gulp.src(path.join("**/*.*"), { cwd: distDir }).pipe(gulp.dest(rootDir));
}

module.exports = {
  generate_manifest: generateManifest,
  copy_src_files: copySourceFiles,
  default: series(generateManifest, copySourceFiles),
};
