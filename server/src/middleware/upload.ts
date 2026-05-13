import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const createStorage = (subDir: string) =>
  multer.diskStorage({
    destination: (_, __, cb) => {
      const dir = path.join(process.cwd(), 'uploads', subDir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });

export const uploadPhoto = multer({
  storage: createStorage('photos'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

export const uploadDocument = multer({
  storage: createStorage('documents'),
  limits: { fileSize: 50 * 1024 * 1024 },
});
