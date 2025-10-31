import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient

import  { Request, Response } from "express";
import * as dotenv from "dotenv";

dotenv.config();


// Get all notes (optionally filtered by userID)
export const getNotes = async (req: Request, res: Response):Promise<any>=> {
  try {
    const { userID } = req.params;
    if (!userID) {
      return res.status(400).json({ message: "Missing userID in request params" });
    }
    const notes = await prisma.post.findMany({
      where: { userID: Number(userID) },
      include: { users: true }, // Include related user info
    });
    return res.status(200).json(notes);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Add a new note for a specific user
export const addNote = async (req: Request, res: Response) => {

  const { title, content ,userID} = req.body;

  if (!title || !content || !userID) {  
    return res.status(400).json({ message: "Missing required fields" });

  }

  try {
    const note = await prisma.post.create({
      data: {
        title,
        content,
        users: { connect: { id: Number(userID) } }, // Connect to existing user
      },
      include: { users: true },
    });
    return res.status(201).json(note);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Update a note
export const updateNote = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const note = await prisma.post.update({
      where: { id },
      data: { title, content },
      include: { users: true },
    });
    return res.status(200).json(note);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Delete a note
export const deleteNote = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    await prisma.post.delete({ where: { id } });
    return res.status(200).json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const getNoteById = async (req:Request, res:Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "Missing id" });
  try {
    const note = await prisma.post.findUnique({ where: { id: Number(id) } });
    if (!note) return res.status(404).json({ message: "Note not found" });
    return res.json(note);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}