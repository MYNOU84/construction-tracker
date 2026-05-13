import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { login, register, getProfile, updateProfile } from '../controllers/authController';
import {
  getProjects, getProject, createProject, updateProject, deleteProject,
  getProjectStats, addMember, removeMember
} from '../controllers/projectController';
import {
  getDailyReports, getDailyReport, createDailyReport, updateDailyReport, deleteDailyReport, addComment,
  getWeeklyReports, generateWeeklyReport, updateWeeklyReport, deleteWeeklyReport,
  getMonthlyReports, generateMonthlyReport, updateMonthlyReport, deleteMonthlyReport,
  getActivities, createActivity, updateActivity, deleteActivity, bulkImportActivities,
  getMilestones, createMilestone, updateMilestone,
  getRisks, createRisk, updateRisk,
  getNCRs, createNCR, updateNCR,
} from '../controllers/reportController';
import { getDocuments, uploadDocument, deleteDocument, uploadPhoto } from '../controllers/documentController';
import {
  getPlantEquipment, createPlantEquipment, updatePlantEquipment, deletePlantEquipment,
  getSiteResources, createSiteResource, updateSiteResource, deleteSiteResource,
} from '../controllers/siteController';
import { getDashboardStats, getProjectAnalytics, getUserAnalytics } from '../controllers/analyticsController';
import { getUsers, getUser, createUser, updateUser, deleteUser } from '../controllers/userController';
import { uploadDocument as uploadDocMiddleware, uploadPhoto as uploadPhotoMiddleware } from '../middleware/upload';

export const router = Router();

// Auth
router.post('/auth/login', login);
router.post('/auth/register', register);
router.get('/auth/profile', authenticate, getProfile);
router.put('/auth/profile', authenticate, updateProfile);

// Dashboard
router.get('/analytics/dashboard', authenticate, getDashboardStats);
router.get('/analytics/projects/:projectId', authenticate, getProjectAnalytics);

// Projects
router.get('/projects', authenticate, getProjects);
router.post('/projects', authenticate, createProject);
router.get('/projects/:id', authenticate, getProject);
router.put('/projects/:id', authenticate, updateProject);
router.delete('/projects/:id', authenticate, deleteProject);
router.get('/projects/:id/stats', authenticate, getProjectStats);
router.post('/projects/:id/members', authenticate, addMember);
router.delete('/projects/:id/members/:userId', authenticate, removeMember);

// Daily Reports
router.get('/projects/:projectId/reports/daily', authenticate, getDailyReports);
router.post('/projects/:projectId/reports/daily', authenticate, createDailyReport);
router.get('/projects/:projectId/reports/daily/:reportId', authenticate, getDailyReport);
router.put('/projects/:projectId/reports/daily/:reportId', authenticate, updateDailyReport);
router.delete('/projects/:projectId/reports/daily/:reportId', authenticate, deleteDailyReport);
router.post('/projects/:projectId/reports/daily/:reportId/comments', authenticate, addComment);

// Weekly Reports
router.get('/projects/:projectId/reports/weekly', authenticate, getWeeklyReports);
router.post('/projects/:projectId/reports/weekly/generate', authenticate, generateWeeklyReport);
router.put('/projects/:projectId/reports/weekly/:reportId', authenticate, updateWeeklyReport);
router.delete('/projects/:projectId/reports/weekly/:reportId', authenticate, deleteWeeklyReport);

// Monthly Reports
router.get('/projects/:projectId/reports/monthly', authenticate, getMonthlyReports);
router.post('/projects/:projectId/reports/monthly/generate', authenticate, generateMonthlyReport);
router.put('/projects/:projectId/reports/monthly/:reportId', authenticate, updateMonthlyReport);
router.delete('/projects/:projectId/reports/monthly/:reportId', authenticate, deleteMonthlyReport);

// Activities
router.get('/projects/:projectId/activities', authenticate, getActivities);
router.post('/projects/:projectId/activities/bulk', authenticate, bulkImportActivities);
router.post('/projects/:projectId/activities', authenticate, createActivity);
router.put('/projects/:projectId/activities/:activityId', authenticate, updateActivity);
router.delete('/projects/:projectId/activities/:activityId', authenticate, deleteActivity);

// Milestones
router.get('/projects/:projectId/milestones', authenticate, getMilestones);
router.post('/projects/:projectId/milestones', authenticate, createMilestone);
router.put('/projects/:projectId/milestones/:milestoneId', authenticate, updateMilestone);

// Risks
router.get('/projects/:projectId/risks', authenticate, getRisks);
router.post('/projects/:projectId/risks', authenticate, createRisk);
router.put('/projects/:projectId/risks/:riskId', authenticate, updateRisk);

// NCRs
router.get('/projects/:projectId/ncrs', authenticate, getNCRs);
router.post('/projects/:projectId/ncrs', authenticate, createNCR);
router.put('/projects/:projectId/ncrs/:ncrId', authenticate, updateNCR);

// Plant & Equipment Register
router.get('/projects/:projectId/plant', authenticate, getPlantEquipment);
router.post('/projects/:projectId/plant', authenticate, createPlantEquipment);
router.put('/projects/:projectId/plant/:itemId', authenticate, updatePlantEquipment);
router.delete('/projects/:projectId/plant/:itemId', authenticate, deletePlantEquipment);

// Site Resources (Workforce Register)
router.get('/projects/:projectId/resources', authenticate, getSiteResources);
router.post('/projects/:projectId/resources', authenticate, createSiteResource);
router.put('/projects/:projectId/resources/:itemId', authenticate, updateSiteResource);
router.delete('/projects/:projectId/resources/:itemId', authenticate, deleteSiteResource);

// Documents
router.get('/projects/:projectId/documents', authenticate, getDocuments);
router.post('/projects/:projectId/documents', authenticate, uploadDocMiddleware.single('file'), uploadDocument);
router.delete('/projects/:projectId/documents/:docId', authenticate, deleteDocument);
router.post('/photos', authenticate, uploadPhotoMiddleware.single('file'), uploadPhoto);

// Users
router.get('/users', authenticate, getUsers);
router.post('/users', authenticate, createUser);
router.get('/users/:userId', authenticate, getUser);
router.put('/users/:userId', authenticate, updateUser);
router.delete('/users/:userId', authenticate, deleteUser);
