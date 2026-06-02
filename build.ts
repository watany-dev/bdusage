const [cliResult, libResult] = await Promise.all([
  Bun.build({
    entrypoints: ["./src/cli.ts"],
    outdir: "./dist",
    format: "esm",
    target: "node",
    minify: true,
    naming: "cli.mjs",
    banner: "#!/usr/bin/env node",
    external: ["@duckdb/node-api", "@duckdb/node-bindings"],
  }),
  Bun.build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist",
    format: "esm",
    target: "node",
    minify: true,
  }),
]);

let failed = false;
for (const result of [cliResult, libResult]) {
  if (!result.success) {
    failed = true;
    console.error("Build failed:");
    for (const log of result.logs) {
      console.error(log);
    }
  }
}

if (failed) {
  process.exit(1);
}

for (const result of [cliResult, libResult]) {
  for (const output of result.outputs) {
    const name = output.path.split("/").pop();
    const sizeKB = (output.size / 1024).toFixed(1);
    console.log(`  ${name}  ${sizeKB} KB`);
  }
}
