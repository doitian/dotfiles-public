#!/usr/bin/env bun
/**
 * Copy GPG key id to clipboard via gopass. Port of default/bin/gpgpass.
 */
import { $ } from "bun";

process.env.GPG_TTY =
	process.env.GPG_TTY || (process.platform !== "win32" ? "/dev/tty" : "");

async function main() {
	const emailR = await $`git config user.email`.quiet().nothrow();
	const email = {
		code: emailR.exitCode,
		stdout: (emailR.stdout?.toString() ?? "").trim(),
	};
	if (email.code !== 0 || !email.stdout) {
		console.error("git config user.email failed");
		process.exit(1);
	}
	const path = `ids/ian/gpg/${email.stdout}`;
	const r = await $`gopass show -c ${path}`.nothrow();
	process.exit(r.exitCode ?? 0);
}

main();
