import esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: {
    background: "./src/background/index.ts",
    popup: "./src/popup/popup.ts",
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
  await ctx.dispose();
}
