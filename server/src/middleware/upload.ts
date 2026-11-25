import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

/**
 * Upload folder. Defaults to server/uploads (same folder from src or dist);
 * UPLOAD_DIR overrides it, e.g. so the security tests write to a temp folder.
 */
export const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));

/** Extension → Content-Type used when serving. Only these extensions are accepted. */
export const DOCUMENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.dwg': 'application/acad',
  '.dxf': 'application/dxf',
  '.mpp': 'application/vnd.ms-project',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

export const PHOTO_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

// MIME types that a browser could execute; never accepted whatever the extension.
const ACTIVE_MIME = /(html|javascript|ecmascript|svg|xml|x-sh|x-msdownload|x-executable)/i;

const createStorage = (subDir: string) =>
  multer.diskStorage({
    destination: (_, __, cb) => {
      const dir = path.join(UPLOAD_ROOT, subDir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_, file, cb) => {
      cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  });

const filterBy = (allowed: Record<string, string>, label: string) =>
  (_: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed[ext] || ACTIVE_MIME.test(file.mimetype)) {
      const err = new Error(`File type not allowed. Accepted ${label}: ${Object.keys(allowed).join(', ')}`);
      (err as any).status = 400;
      cb(err);
      return;
    }
    cb(null, true);
  };

export const uploadPhoto = multer({
  storage: createStorage('photos'),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: filterBy(PHOTO_TYPES, 'images'),
});

export const uploadDocument = multer({
  storage: createStorage('documents'),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: filterBy(DOCUMENT_TYPES, 'documents'),
});
