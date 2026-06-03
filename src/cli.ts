import { runCli } from "./cli/run.js";

const code = await runCli(process.argv);
process.exit(code);
