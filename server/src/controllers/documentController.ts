import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { canAccessProject, getProjectRole, projectRoleOf } from '../middleware/access';
import { can, seesInternal, ProjectRole } from '../config/permissions';

/** Internal (unissued) documents: the project team sees them all, other roles only their own. */
const documentVisibility = (role: ProjectRole | null, userId: string) =>
  seesInternal(role) ? {} : { OR: [{ status: { not: 'INTERNAL' } }, { uploadedBy: userId }] };
import { UPLOAD_ROOT, DOCUMENT_TYPES, PHOTO_TYPES, useDatabaseStorage, assignFileName } from '../middleware/upload';
import { saveStoredFile, readStoredFile, deleteStoredFile } from '../lib/fileStore';
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

/** Database storage: writes an in-memory upload to the file store. Disk storage: already written by multer. */
const persist = async (file: Express.Multer.File, kind: 'documents' | 'photos', types: Record<string, string>) => {
  if (!file.buffer) return;
  const name = assignFileName(file);
  await saveStoredFile(kind, name, file.buffer, types[path.extname(name)] || 'application/octet-stream');
};

/** Removes a stored file from the disk or from the database file store (best effort). */
const discardStored = async (url: string) => {
  const m = /^\/uploads\/(documents|photos)\/([A-Za-z0-9-]+\.[A-Za-z0-9]+)$/.exec(url);
  if (!m) return;
  if (useDatabaseStorage()) await deleteStoredFile(m[1], m[2]).catch(() => {});
  else { const abs = resolveStored(url); if (abs) await fs.promises.unlink(abs).catch(() => {}); }
};

export const getDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.query;
    const docs = await prisma.document.findMany({
      where: {
        projectId: req.params.projectId,
        ...documentVisibility(await getProjectRole(req), req.user!.userId),
        ...(type ? { type: String(type) } : {}),
      },
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
    // New documents are internal unless issued officially at upload by someone allowed to submit.
    const submit = body.status === 'SUBMITTED' && can(await getProjectRole(req), 'documents', 'submit');
    if (req.file) await persist(req.file, 'documents', DOCUMENT_TYPES);
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
        status: submit ? 'SUBMITTED' : 'INTERNAL',
        submittedAt: submit ? new Date() : null,
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
    const role = await getProjectRole(req);
    const ownInternal = doc?.uploadedBy === req.user!.userId && doc?.status === 'INTERNAL';
    if (!doc || (!seesInternal(role) && doc.status === 'INTERNAL' && !ownInternal)) { res.status(404).json({ message: 'Document not found' }); return; }
    if (!can(role, 'documents', 'delete') && !ownInternal) {
      res.status(403).json({ message: 'Only the project manager, or the uploader of an internal document, can delete it' }); return;
    }
    await prisma.document.delete({ where: { id: doc.id } });
    await discardStored(doc.fileUrl);
    res.json({ message: 'Document deleted' });
  } catch {
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

/**
 * PATCH /projects/:projectId/documents/:docId/status { status, note? }
 *   INTERNAL -> SUBMITTED            uploader or project manager, with the submit permission (official issue)
 *   SUBMITTED -> APPROVED | REJECTED approve permission (project manager, consultant, owner)
 *   REJECTED -> SUBMITTED            resubmission, as for submitting
 *   any -> INTERNAL                  project manager / owner only (withdraw an issue)
 */
export const setDocumentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const next = req.body?.status;
    const note = str(req.body?.note, 1000);
    const doc = await prisma.document.findFirst({ where: { id: req.params.docId, projectId: req.params.projectId } });
    const role = await getProjectRole(req);
    const isUploader = doc?.uploadedBy === req.user!.userId;
    if (!doc || (!seesInternal(role) && doc.status === 'INTERNAL' && !isUploader)) { res.status(404).json({ message: 'Document not found' }); return; }
    const manager = role === 'OWNER' || role === 'PROJECT_MANAGER';
    let allowed = false;
    if (next === 'SUBMITTED') allowed = ['INTERNAL', 'REJECTED'].includes(doc.status) && can(role, 'documents', 'submit') && (isUploader || manager);
    else if (next === 'APPROVED' || next === 'REJECTED') allowed = doc.status === 'SUBMITTED' && can(role, 'documents', 'approve');
    else if (next === 'INTERNAL') allowed = manager;
    else { res.status(400).json({ message: 'Invalid document status' }); return; }
    if (!allowed) { res.status(403).json({ message: 'Your role on this project cannot make this change' }); return; }
    const reviewed = next === 'APPROVED' || next === 'REJECTED';
    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: {
        status: next,
        ...(next === 'SUBMITTED' ? { submittedAt: new Date(), reviewedBy: null, reviewedAt: null, reviewNote: null } : {}),
        ...(reviewed ? { reviewedBy: req.user!.userId, reviewedAt: new Date(), reviewNote: note ?? null } : {}),
        ...(next === 'INTERNAL' ? { submittedAt: null, reviewedBy: null, reviewedAt: null, reviewNote: null } : {}),
      },
      include: { uploader: { select: { id: true, name: true } } },
    });
    res.json(updated);
  } catch (err) {
    console.error('[setDocumentStatus]', err);
    res.status(500).json({ message: 'Failed to update the document status' });
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
    const allowed = parent && await canAccessProject(req.user!, parent.projectId);
    if (!allowed) {
      removeFile(req.file);
      res.status(400).json({ message: 'Photos must be attached to a daily report or NCR you can access' });
      return;
    }
    await persist(req.file, 'photos', PHOTO_TYPES);
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
      const doc = await prisma.document.findFirst({ where: { fileUrl: url }, select: { projectId: true, status: true, uploadedBy: true } });
      if (doc?.status === 'INTERNAL' && doc.uploadedBy !== user.userId && !seesInternal(await projectRoleOf(user, doc.projectId))) {
        res.status(404).end(); return;
      }
      projectId = doc?.projectId;
    } else {
      const photo = await prisma.photo.findFirst({
        where: { url },
        select: { dailyReport: { select: { projectId: true } }, ncr: { select: { projectId: true } } },
      });
      projectId = photo?.dailyReport?.projectId ?? photo?.ncr?.projectId;
    }
    if (!projectId) { res.status(404).end(); return; }
    if (!(await canAccessProject(user, projectId))) { res.status(404).end(); return; }
    let data: Buffer | null = null;
    if (useDatabaseStorage()) {
      data = await readStoredFile(kind, file);
      if (!data) { res.status(404).end(); return; }
    } else if (!fs.existsSync(abs)) { res.status(404).end(); return; }

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
    if (data) { res.setHeader('Content-Length', String(data.length)); res.end(data); return; }
    fs.createReadStream(abs).on('error', () => res.destroy()).pipe(res);
  } catch {
    res.status(500).end();
  }
};
