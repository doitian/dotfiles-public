import { basename } from "node:path";

const tool = basename(process.execPath).replace(/\.exe$/, "");
const args = process.argv.slice(2);

if (tool === "fzf") {
  const rows = (await Bun.stdin.text()).split("\n").filter(Boolean);
  if (!rows.length) process.exit(1);
  console.log(rows[0]);
} else {
  console.log(args.join("\n"));
  process.exit(Number(process.env.FTV_MPV_EXIT ?? 0));
}
