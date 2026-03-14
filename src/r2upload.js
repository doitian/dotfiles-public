#!/usr/bin/env bun
/**
 * Upload files to R2 bucket via rclone with date-based organization.
 * Uploads to r2:blog/uploads with prefix: YYYYMM/random_hex/filename
 * Prints the public URL after successful upload.
 */
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { $ } from "bun";

const files = process.argv.slice(2);
if (files.length === 0) {
    console.error("Usage: r2upload <file> [file2 ...]");
    process.exit(1);
}

if (!Bun.which("rclone")) {
    console.error("rclone is not installed or not in PATH");
    process.exit(1);
}

function getRandomHex(bytes = 3) {
    return randomBytes(bytes).toString("hex");
}

async function uploadToR2(filePath) {
    const resolved = resolve(filePath);
    if (!existsSync(resolved)) {
        console.error(`File not found: ${filePath}`);
        return false;
    }

    const fileName = basename(resolved);
    const now = new Date();
    const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `${datePrefix}/${getRandomHex()}`;
    const r2Path = `r2:blog/uploads/${prefix}/`;

    console.log(`Uploading ${fileName}...`);
    console.log(`  Source: ${resolved}`);
    console.log(`  Destination: ${r2Path}${fileName}`);

    const r = await $`rclone copy ${resolved} ${r2Path} --progress --s3-no-check-bucket`
        .nothrow();

    if (r.exitCode === 0) {
        const escapedFileName = encodeURIComponent(fileName);
        const publicUrl = `https://blog.iany.me/uploads/${prefix}/${escapedFileName}`;
        console.log(`\n  Upload successful!\n  URL: ${publicUrl}\n`);
        return true;
    }

    console.error(`\n  Upload failed for ${fileName}\n`);
    return false;
}

console.log("=== R2 Upload Script ===\n");

let failCount = 0;
let successCount = 0;

for (const file of files) {
    if (await uploadToR2(file)) {
        successCount++;
    } else {
        failCount++;
    }
}

console.log("=== Summary ===");
console.log(`  Successful: ${successCount}`);
console.log(`  Failed: ${failCount}\n`);

if (failCount > 0) process.exit(1);
