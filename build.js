import esbuild from "esbuild";
import fs from "fs";
import path from "path";

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  for (const file of fs.readdirSync(src)) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: {
    background: "./src/background/index.ts",
    content: "./src/content/index.ts",
    nav: "./src/popup/nav.ts",
    activities: "./src/popup/activities.ts",
    info: "./src/popup/info.ts",
  },

  outdir: "dist",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "chrome110",
  sourcemap: true,
  logLevel: "info",
});

if (watch) {
  await ctx.watch();
  console.log("👀 Watching for changes...");
} else {
  await ctx.rebuild();

  copyDir("src/popup/views", "dist/popup/views");
  fs.copyFileSync("src/popup/popup.html", "dist/popup/popup.html");

  await ctx.dispose();
}
