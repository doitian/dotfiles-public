import { appendFileSync } from "node:fs";
import { basename } from "node:path";

const tool = basename(process.execPath).replace(/\.exe$/, "");
const args = process.argv.slice(2);
appendFileSync(process.env.PICKER_LOG, JSON.stringify({ tool, args }) + "\n");

if (tool === "tmux") {
  if (args[0] === "list-panes") console.log("=work:@1.%1\t1.shell>pwsh C:/work");
  if (args[0] === "list-windows") console.log([
    "work\t@1\tshell\t0\t1\t2 windows",
    "work\t@2\tTMUX_FZF_WIN\t1\t0\t2 windows",
    "space session\t@3\teditor\t1\t0\t1 windows",
  ].join("\n"));
  if (args[0] === "has-session") process.exit(args.at(-1) === "=work" ? 0 : 1);
} else {
  const query = args[args.indexOf("-q") + 1];
  const rows = (await new Response(Bun.stdin.stream()).text()).split("\n").filter(Boolean);
  if (args.includes("--print-query")) console.log(query);
  if (query === "brand new") process.exit(1);
  console.log(args.includes("-m") ? rows.join("\n") : rows[0]);
}
