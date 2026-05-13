import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

export const getDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.query;
    const docs = await prisma.document.findMany({
      where: { projectId: req.params.projectId, ...(type ? { type: String(type) } : {}) },
      include: { uploader: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
};

export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }
    const doc = await prisma.document.create({
      data: {
        projectId: req.params.projectId,
        name: req.body.name || req.file.originalname,
        description: req.body.description,
        type: req.body.type || 'OTHER',
        fileUrl: `/uploads/documents/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        revision: req.body.revision,
        tags: req.body.tags ? JSON.stringify(req.body.tags.split(',')) : '[]',
        uploadedBy: req.user!.userId,
      },
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: String(err) });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.docId } });
    if (!doc) { res.status(404).json({ message: 'Document not found' }); return; }
    const filePath = path.join(process.cwd(), doc.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.document.delete({ where: { id: req.params.docId } });
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

export const uploadPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }
    const photo = await prisma.photo.create({
      data: {
        url: `/uploads/photos/${req.file.filename}`,
        fileName: req.file.originalname,
        caption: req.body.caption,
        location: req.body.location,
        fileSize: req.file.size,
        dailyReportId: req.body.dailyReportId || null,
        ncrId: req.body.ncrId || null,
        takenAt: req.body.takenAt ? new Date(req.body.takenAt) : new Date(),
      },
    });
    res.status(201).json(photo);
  } catch (err) {
    res.status(500).json({ message: 'Photo upload failed', error: String(err) });
  }
};
