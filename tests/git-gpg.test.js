import { expect, test } from "bun:test";
import {
  cachedFromKeyinfo,
  findOnPath,
  gpgArgs,
  parseIdentity,
  parseSignArgs,
  preferGpg,
  siblingTool,
} from "../src/git-gpg.js";

test("gpg args skip the bun script path and keep compiled argv", () => {
  expect(gpgArgs(["bun", "/src/git-gpg.js", "--verify", "a"])).toEqual(["--verify", "a"]);
  expect(gpgArgs(["bun", "/$bunfs/root/git-gpg", "--status-fd=2", "-bsau", "ABC"])).toEqual([
    "--status-fd=2",
    "-bsau",
    "ABC",
  ]);
  expect(gpgArgs(["C:/bin/git-gpg.exe", "--status-fd=2", "-bsau", "ABC"])).toEqual([
    "--status-fd=2",
    "-bsau",
    "ABC",
  ]);
});

test("sign detection ignores long options that merely contain s", () => {
  expect(parseSignArgs(["--status-fd=2", "-bsau", "FD7051CE32E62CE7"])).toEqual({
    isSign: true,
    key: "FD7051CE32E62CE7",
  });
  expect(parseSignArgs(["--status-fd=2", "--verify", "sig"])).toEqual({ isSign: false, key: "" });
  expect(parseSignArgs(["--detach-sign", "--local-user", "ABC!"])).toEqual({
    isSign: true,
    key: "ABC!",
  });
});

test("identity comes from the matching subkey, not the primary", () => {
  const colon = [
    "sec:-:4096:1:ABE9D4638BEFB78D::::::::::",
    "fpr:::::::::4242AB6F6CF6226860D0B8DAABE9D4638BEFB78D:",
    "grp:::::::::E028E226E598782B22E3D5C05EF94FAADA2E516E:",
    "uid:-::::::::ian yang <me@iany.me>:",
    "ssb:-:4096:1:FD7051CE32E62CE7::::::::::",
    "fpr:::::::::43AD80423BBCC2035986391CFD7051CE32E62CE7:",
    "grp:::::::::AF4F074874295807094E56CFEE569FF001530590:",
  ].join("\n");
  expect(parseIdentity(colon, "FD7051CE32E62CE7")).toEqual({
    grip: "AF4F074874295807094E56CFEE569FF001530590",
    email: "me@iany.me",
  });
});

test("keyinfo cache field is the seventh token", () => {
  const grip = "AF4F074874295807094E56CFEE569FF001530590";
  expect(cachedFromKeyinfo(`S KEYINFO ${grip} D - - - P - - -`, grip)).toBe(false);
  expect(cachedFromKeyinfo(`S KEYINFO ${grip} D - - 1 P - - -`, grip)).toBe(true);
});

test("windows gpg prefers GnuPG over Git's bundled gpg.exe", () => {
  expect(
    preferGpg([
      "C:/Program Files/Git/usr/bin/gpg.exe",
      "C:/Program Files (x86)/GnuPG/bin/gpg.exe",
    ]),
  ).toBe("C:/Program Files (x86)/GnuPG/bin/gpg.exe");
  expect(siblingTool("C:/Program Files (x86)/GnuPG/bin/gpg.exe", "gpg-connect-agent")).toBe(
    "C:/Program Files (x86)/GnuPG/bin/gpg-connect-agent.exe",
  );
});

test("findOnPath uses the platform separator", () => {
  const exists = (path) => path === "/usr/bin/gpg" || path === "C:/GnuPG/bin/gpg.exe";
  expect(findOnPath("/usr/bin:/bin", ["gpg"], exists, ":")).toEqual(["/usr/bin/gpg"]);
  expect(findOnPath("C:/Git/usr/bin;C:/GnuPG/bin", ["gpg.exe"], exists, ";")).toEqual([
    "C:/GnuPG/bin/gpg.exe",
  ]);
});
