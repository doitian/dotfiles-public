import { appendFileSync } from "node:fs";
import { basename } from "node:path";

const tool = basename(process.execPath).replace(/\.exe$/, "");
const args = process.argv.slice(2);
if (tool !== "fzf") appendFileSync(process.env.PICKER_LOG, JSON.stringify({ tool, args }) + "\n");

if (tool === "fzf") {
  const output = await new Response(Bun.stdin.stream()).text();
  appendFileSync(process.env.PICKER_LOG, JSON.stringify({ tool, args, input: output }) + "\n");
  if (process.env.PICKER_FZF_SELECTION !== undefined) {
    console.log(process.env.PICKER_FZF_SELECTION);
    process.exit(0);
  }
  const rows = output.split("\n").slice(args.includes("--header-lines=1") ? 1 : 0).filter(Boolean);
  if (!rows.length) process.exit(1);
  console.log(rows[0]);
} else if (args[0] === "models" || args[0] === "--list-models") {
  let models = JSON.parse(process.env.PICKER_MODELS);
  if (tool === "pi") {
    if (args[1]) models = models.filter((model) => model.toLowerCase().includes(args[1].toLowerCase()));
    console.log("provider  model  context  max-out  thinking  images");
    for (const model of models) console.log(model.replace("/", "  ") + "  200K  64K  yes  yes");
    console.log("");
  } else {
    console.log(models.join("\n"));
  }
}
