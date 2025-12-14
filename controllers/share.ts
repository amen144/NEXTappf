import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "change_me";

// Export middleware
export const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    req.userId = Number(payload.userId);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Export handler functions (no app.get/post/delete)
export const searchUsers = async (req: any, res: any) => {
  const { q } = req.query;
  const currentUserId = req.userId;

  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: "Search query required" });
  }

  try {
    const users = await prisma.users.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 10,
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
};

export const sendFriendRequest = async (req: any, res: any) => {
  const { recipientId } = req.body;
  const currentUserId = req.userId;

  if (!recipientId) return res.status(400).json({ error: "Missing recipientId" });
  if (currentUserId === recipientId) return res.status(400).json({ error: "Cannot add yourself" });

  try {
    const recipient = await prisma.users.findUnique({ where: { id: recipientId } });
    if (!recipient) return res.status(404).json({ error: "User not found" });

    const currentUser = await prisma.users.findUnique({ where: { id: currentUserId } });
    const friendIds = currentUser?.friendIds || [];

    if (friendIds.includes(recipientId)) {
      return res.status(400).json({ error: "Already friends" });
    }

    await prisma.users.update({
      where: { id: currentUserId },
      data: { friendIds: { push: recipientId } },
    });

    await prisma.users.update({
      where: { id: recipientId },
      data: { friendIds: { push: currentUserId } },
    });

    res.json({ message: "Friend request accepted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send request" });
  }
};

export const acceptFriendRequest = async (req: any, res: any) => {
  const { friendId } = req.body;
  const currentUserId = req.userId;

  if (!friendId) return res.status(400).json({ error: "Missing friendId" });

  try {
    const currentUser = await prisma.users.findUnique({ where: { id: currentUserId } });
    const friendIds = currentUser?.friendIds || [];

    if (!friendIds.includes(friendId)) {
      await prisma.users.update({
        where: { id: currentUserId },
        data: { friendIds: { push: friendId } },
      });

      await prisma.users.update({
        where: { id: friendId },
        data: { friendIds: { push: currentUserId } },
      });
    }

    res.json({ message: "Friend added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to accept request" });
  }
};

export const getFriends = async (req: any, res: any) => {
  const currentUserId = req.userId;

  try {
    const user = await prisma.users.findUnique({
      where: { id: currentUserId },
      select: { friendIds: true },
    });

    const friends = await prisma.users.findMany({
      where: { id: { in: user?.friendIds || [] } },
      select: { id: true, name: true, email: true },
    });

    res.json(friends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
};

export const removeFriend = async (req: any, res: any) => {
  const friendId = Number(req.params.friendId);
  const currentUserId = req.userId;

  try {
    const current = await prisma.users.findUnique({ where: { id: currentUserId } });
    const friend = await prisma.users.findUnique({ where: { id: friendId } });

    if (!friend) return res.status(404).json({ error: "Friend not found" });

    const currentFriendIds = current?.friendIds || [];
    const friendFriendIds = friend?.friendIds || [];

    await prisma.users.update({
      where: { id: currentUserId },
      data: { friendIds: currentFriendIds.filter((id) => id !== friendId) },
    });

    await prisma.users.update({
      where: { id: friendId },
      data: { friendIds: friendFriendIds.filter((id) => id !== currentUserId) },
    });

    res.json({ message: "Friend removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove friend" });
  }
};

export const shareNote = async (req: any, res: any) => {
  const { noteId, userId } = req.body;

  if (!noteId || !userId) return res.status(400).json({ error: "Missing noteId or userId" });

  try {
    res.json({ message: "Note shared successfully" });
    await prisma.post.update({
      where: { id: noteId },
      data: {
        sharedWith: { push: userId },
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to share note" });
  }
};