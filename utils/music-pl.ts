/**
 * Standalone MP3 importer.
 *
 * Scans ./music recursively, and imports every .mp3 file found into the
 * Audio table as its own row (binary data stored as BYTEA via Prisma Bytes).
 *
 * Usage:
 *   npx tsx utils/music-pl.ts
 *
 * Optional:
 *   IMPORT_CONCURRENCY=4 npx tsx utils/music-pl.ts
 */
import { parseFile } from "music-metadata";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const prisma = new PrismaClient();

// How many files to process in parallel. Keep this small - each in-flight
// file holds at most one full buffer in memory. Default: sequential (1).
const CONCURRENCY = Math.max(
  1,
  parseInt(process.env.IMPORT_CONCURRENCY ?? "1", 10) || 1
);

const MUSIC_DIR = path.resolve(process.cwd(), "music");

interface FailedFile {
  file: string;
  error: string;
}

/**
 * Recursively walk a directory and collect all .mp3 file paths.
 * Works on Windows and POSIX systems (uses path.join / path.extname,
 * never hardcodes slashes).
 */
async function findMp3Files(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await findMp3Files(fullPath)));
    } else if (
      entry.isFile() &&
      path.extname(entry.name).toLowerCase() === ".mp3"
    ) {
      results.push(fullPath);
    }
  }

  return results;
}
async function extractCoverImage(
  filePath: string
): Promise<{ data: Buffer; mime: string } | null> {
  try {
    const metadata = await parseFile(filePath, { skipCovers: false });
    const picture = metadata.common.picture?.[0];
    if (!picture) return null;
    return { data: Buffer.from(picture.data), mime: picture.format };
  } catch {
    // Corrupt tags or no metadata - just skip the cover, not a fatal error
    return null;
  }
}
/**
 * Compute a SHA-256 hash of a file by streaming it, so we never hold the
 * whole file in memory just to hash it.
 */
function computeFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Run `fn` over `items` with a bounded concurrency limit, so we never load
 * more than `limit` files into memory at once regardless of how many total
 * files there are.
 */
async function processWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0;

  const workers = new Array(Math.min(limit, items.length))
    .fill(null)
    .map(async () => {
      while (cursor < items.length) {
        const current = items[cursor];
        cursor++;
        await fn(current);
      }
    });

  await Promise.all(workers);
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof PrismaClientKnownRequestError && err.code === "P2002"
  );
}

async function main() {
  const startTime = Date.now();

  if (!fs.existsSync(MUSIC_DIR)) {
    console.error(`Music folder not found: ${MUSIC_DIR}`);
    console.error(`Create a "music" folder next to your project root and add MP3 files to it.`);
    process.exit(1);
  }

  console.log(`Scanning ${MUSIC_DIR} for MP3 files...`);
  const files = await findMp3Files(MUSIC_DIR);
  const total = files.length;
  console.log(`Found ${total} MP3 file(s). Concurrency: ${CONCURRENCY}\n`);

  if (total === 0) {
    console.log("No MP3 files found. Nothing to do.");
    await prisma.$disconnect();
    return;
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let processedCount = 0;
  const failedFiles: FailedFile[] = [];

  await processWithConcurrency(files, CONCURRENCY, async (filePath) => {
    const filename = path.basename(filePath);
    processedCount++;
    const displayIndex = processedCount;

    try {
      // 1. Hash the file (streamed, low memory) to check for duplicates
      const hash = await computeFileHash(filePath);

      const existing = await prisma.audio.findUnique({
        where: { hash },
        select: { id: true },
      });

      if (existing) {
        skipped++;
        console.log(`[${displayIndex}/${total}] ${filename} - skipped (duplicate)`);
        return;
      }


      // 2. Only now read the full file into memory, right before we need it
      const buffer = await fs.promises.readFile(filePath);
      const cover = await extractCoverImage(filePath);

      await prisma.audio.create({
        data: {
          filename,
          mimeType: "audio/mpeg",
          data: buffer,
          hash,
          coverImage: cover?.data,
          coverMime: cover?.mime,
        },
      });

      imported++;
      console.log(`[${displayIndex}/${total}] ${filename} \u2713`);
    } catch (err) {
      // Handle a race where two files hash the same and both pass the
      // findUnique check before either insert completes.
      if (isUniqueConstraintError(err)) {
        skipped++;
        console.log(`[${displayIndex}/${total}] ${filename} - skipped (duplicate)`);
        return;
      }

      failed++;
      const message = err instanceof Error ? err.message : String(err);
      failedFiles.push({ file: filename, error: message });
      console.error(`[${displayIndex}/${total}] ${filename} \u2717 (${message})`);
    }
  });

  const durationMs = Date.now() - startTime;
  const durationSec = (durationMs / 1000).toFixed(2);

  console.log("\n----- Import summary -----");
  console.log(`Total files found:      ${total}`);
  console.log(`Successfully imported:  ${imported}`);
  console.log(`Skipped duplicates:     ${skipped}`);
  console.log(`Failed:                 ${failed}`);
  console.log(`Total time:             ${durationSec}s`);

  if (failedFiles.length > 0) {
    console.log("\nFailed files:");
    for (const f of failedFiles) {
      console.log(`  - ${f.file}: ${f.error}`);
    }
  }

  await prisma.$disconnect();

  // Non-zero exit code if anything failed, useful for CI / scripting
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(async (err) => {
  console.error("Fatal error while running importer:", err);
  await prisma.$disconnect();
  process.exit(1);
});