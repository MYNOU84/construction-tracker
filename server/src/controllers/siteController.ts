import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// ─── Plant & Equipment ─────────────────────────────────────────────────────────

export const getPlantEquipment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const items = await prisma.plantEquipment.findMany({
      where: {
        projectId: req.params.projectId,
        ...(status ? { status: String(status) } : {}),
      },
      orderBy: { dateOnSite: 'desc' },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch plant equipment', error: String(err) });
  }
};

export const createPlantEquipment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const item = await prisma.plantEquipment.create({
      data: {
        ...data,
        projectId: req.params.projectId,
        dateOnSite: new Date(data.dateOnSite),
        dateOffSite: data.dateOffSite ? new Date(data.dateOffSite) : undefined,
        certExpiry: data.certExpiry ? new Date(data.certExpiry) : undefined,
        lastInspection: data.lastInspection ? new Date(data.lastInspection) : undefined,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create equipment', error: String(err) });
  }
};

export const updatePlantEquipment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    if (data.dateOnSite) data.dateOnSite = new Date(data.dateOnSite);
    if (data.dateOffSite) data.dateOffSite = new Date(data.dateOffSite);
    if (data.certExpiry) data.certExpiry = new Date(data.certExpiry);
    if (data.lastInspection) data.lastInspection = new Date(data.lastInspection);
    const item = await prisma.plantEquipment.update({ where: { id: req.params.itemId }, data });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update equipment', error: String(err) });
  }
};

export const deletePlantEquipment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.plantEquipment.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Equipment deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete equipment' });
  }
};

// ─── Site Resources (Workforce Register) ──────────────────────────────────────

export const getSiteResources = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, type } = req.query;
    const items = await prisma.siteResource.findMany({
      where: {
        projectId: req.params.projectId,
        ...(status ? { status: String(status) } : {}),
        ...(type ? { type: String(type) } : {}),
      },
      orderBy: { fullName: 'asc' },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch site resources', error: String(err) });
  }
};

export const createSiteResource = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const item = await prisma.siteResource.create({
      data: {
        ...data,
        projectId: req.params.projectId,
        inductionDate: data.inductionDate ? new Date(data.inductionDate) : undefined,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create resource', error: String(err) });
  }
};

export const updateSiteResource = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    if (data.inductionDate) data.inductionDate = new Date(data.inductionDate);
    const item = await prisma.siteResource.update({ where: { id: req.params.itemId }, data });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update resource', error: String(err) });
  }
};

export const deleteSiteResource = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.siteResource.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete resource' });
  }
};
