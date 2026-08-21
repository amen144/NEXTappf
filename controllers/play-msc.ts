import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { parseFile } from "music-metadata";
const prisma = new PrismaClient();

const FRONTEND_URL = process.env.FRONTEND_URL || "http:/myapp11.ddns.net";

export const GetMusicById=async (req: Request, res: Response) => {
  const audioId = parseInt(req.params.id, 10);

  if (isNaN(audioId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const song = await prisma.audio.findUnique({ where: { id: audioId } });

    if (!song) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const fileBuffer = Buffer.from(song.data);
    const fileSize = fileBuffer.length;
    const range = req.headers.range;

    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/);
      const start = match ? parseInt(match[1], 10) : 0;
      const end = match && match[2] ? parseInt(match[2], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": song.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          song.filename
        )}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      });

      res.end(fileBuffer.subarray(start, end + 1));
      return;
    }

    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": song.mimeType,
      "Accept-Ranges": "bytes",
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        song.filename
      )}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    });

    res.end(fileBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to stream song" });
  }}
export const GetAllMusic= async (_req: Request, res: Response) => {
  try {
    const songs = await prisma.audio.findMany({
      select: {
        id: true,
        filename: true,
        mimeType: true,
        createdAt: true,
        coverMime: true, // tells the frontend whether a cover exists
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(songs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch songs" });
  }
}
export const GetCoverById= async (req: Request, res: Response) => {
  const audioId = parseInt(req.params.id, 10);

  if (isNaN(audioId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const song = await prisma.audio.findUnique({
      where: { id: audioId },
      select: { coverImage: true, coverMime: true },
    });

    if (!song || !song.coverImage) {
      res.status(404).json({ error: "No cover image" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": song.coverMime ?? "image/jpeg",
      "Content-Length": song.coverImage.length,
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    res.end(Buffer.from(song.coverImage));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch cover" });
  }
}