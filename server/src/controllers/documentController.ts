import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { isProjectMember } from '../middleware/access';
import { UPLOAD_ROOT, DOCUMENT_TYPES, PHOTO_TYPES } from '../middleware/upload';
import path from 'path';
import fs from 'fs';

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

/** Accepts a JSON array string, a comma-separated string or an array. */
const parseTags = (raw: unknown): string => {
  let tags: unknown[] = [];
  if (Array.isArray(raw)) tags = raw;
  else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      tags = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      tags = raw.split(',');
    }
  }
  return JSON.stringify(tags.map(t => String(t).trim().slice(0, 60)).filter(Boolean).slice(0, 20));
};

/** Resolves a stored "/uploads/<kind>/<file>" URL to an absolute path inside UPLOAD_ROOT, or null. */
const resolveStored = (url: string): string | null => {
  const m = /^\/uploads\/(documents|photos)\/([A-Za-z0-9-]+\.[A-Za-z0-9]+)$/.exec(url);
  if (!m) return null;
  const abs = path.join(UPLOAD_ROOT, m[1], m[2]);
  return abs.startsWith(UPLOAD_ROOT + path.sep) ? abs : null;
};

const removeFile = (file?: Express.Multer.File) => {
  if (file?.path) fs.promises.unlink(file.path).catch(() => {});
};

export const getDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.query;
    const docs = await prisma.document.findMany({
      where: { projectId: req.params.projectId, ...(type ? { type: String(type) } : {}) },
      include: { uploader: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(docs);
  } catch {
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
};

/**
 * Creates a document. With a file it stores the upload; without one, the
 * contracts/submittals register may record a metadata-only entry (fileUrl "#").
 */
export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body ?? {};
    if (!req.file && body.fileUrl !== '#') { res.status(400).json({ message: 'No file uploaded' }); return; }
    const name = str(body.name, 200) || req.file?.originalname || str(body.fileName, 200);
    if (!name) { removeFile(req.file); res.status(400).json({ message: 'A document name is required' }); return; }
    const doc = await prisma.document.create({
      data: {
        projectId: req.params.projectId,
        name,
        description: str(body.description, 2000),
        type: str(body.type, 40) || 'OTHER',
        fileUrl: req.file ? `/uploads/documents/${req.file.filename}` : '#',
        fileName: req.file ? req.file.originalname.slice(0, 255) : (str(body.fileName, 255) || name),
        fileSize: req.file?.size,
        mimeType: req.file ? DOCUMENT_TYPES[path.extname(req.file.filename)] : undefined,
        revision: str(body.revision, 20),
        tags: parseTags(body.tags),
        uploadedBy: req.user!.userId,
      },
    });
    res.status(201).json(doc);
  } catch (err) {
    removeFile(req.file);
    console.error('[uploadDocument]', err);
    res.status(500).json({ message: 'Upload failed' });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doc = await prisma.document.findFirst({ where: { id: req.params.docId, projectId: req.params.projectId } });
    if (!doc) { res.status(404).json({ message: 'Document not found' }); return; }
    const filePath = resolveStored(doc.fileUrl);
    await prisma.document.delete({ where: { id: doc.id } });
    if (filePath) await fs.promises.unlink(filePath).catch(() => {});
    res.json({ message: 'Document deleted' });
  } catch {
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

/** Photo must be linked to a daily report or NCR in a project the user can access. */
export const uploadPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }
    const dailyReportId = str(req.body?.dailyReportId, 40);
    const ncrId = str(req.body?.ncrId, 40);
    const parent = dailyReportId
      ? await prisma.dailyReport.findUnique({ where: { id: dailyReportId }, select: { projectId: true } })
      : ncrId ? await prisma.nCR.findUnique({ where: { id: ncrId }, select: { projectId: true } }) : null;
    const allowed = parent && (req.user!.role === 'ADMIN' || await isProjectMember(req.user!.userId, parent.projectId));
    if (!allowed) {
      removeFile(req.file);
      res.status(400).json({ message: 'Photos must be attached to a daily report or NCR you can access' });
      return;
    }
    const photo = await prisma.photo.create({
      data: {
        url: `/uploads/photos/${req.file.filename}`,
        fileName: req.file.originalname.slice(0, 255),
        caption: str(req.body.caption, 500),
        location: str(req.body.location, 200),
        fileSize: req.file.size,
        dailyReportId: dailyReportId || null,
        ncrId: dailyReportId ? null : ncrId || null,
        takenAt: req.body.takenAt ? new Date(req.body.takenAt) : new Date(),
      },
    });
    res.status(201).json(photo);
  } catch (err) {
    removeFile(req.file);
    console.error('[uploadPhoto]', err);
    res.status(500).json({ message: 'Photo upload failed' });
  }
};

/**
 * GET /uploads/:kind/:file — serves an uploaded file only to an authenticated
 * user who can access the owning project. Files are never executed in the
 * app's origin: nosniff, a sandboxing CSP, and attachment for non-previewable types.
 */
export const serveUpload = async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthRequest).user!;
  const { kind, file } = req.params;
  const url = `/uploads/${kind}/${file}`;
  const abs = resolveStored(url);
  if (!abs) { res.status(404).end(); return; }
  try {
    let projectId: string | undefined;
    if (kind === 'documents') {
      projectId = (await prisma.document.findFirst({ where: { fileUrl: url }, select: { projectId: true } }))?.projectId;
    } else {
      const photo = await prisma.photo.findFirst({
        where: { url },
        select: { dailyReport: { select: { projectId: true } }, ncr: { select: { projectId: true } } },
      });
      projectId = photo?.dailyReport?.projectId ?? photo?.ncr?.projectId;
    }
    if (!projectId) { res.status(404).end(); return; }
    if (user.role !== 'ADMIN' && !(await isProjectMember(user.userId, projectId))) { res.status(404).end(); return; }
    if (!fs.existsSync(abs)) { res.status(404).end(); return; }

    const ext = path.extname(abs).toLowerCase();
    const types = kind === 'photos' ? PHOTO_TYPES : DOCUMENT_TYPES;
    const contentType = types[ext] || 'application/octet-stream';
    const inline = contentType === 'application/pdf' || contentType.startsWith('image/');
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Chrome's PDF viewer does not load inside a sandboxed document, so PDFs get a CSP without `sandbox`.
    res.setHeader('Content-Security-Policy', contentType === 'application/pdf'
      ? "default-src 'none'; object-src 'self'; plugin-types application/pdf"
      : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${path.basename(abs)}"`);
    fs.createReadStream(abs).on('error', () => res.destroy()).pipe(res);
  } catch {
    res.status(500).end();
  }
};
