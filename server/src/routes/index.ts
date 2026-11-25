import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { requireProjectAccess, requireProjectManager, requireChildOfProject, stripProtectedFields } from '../middleware/access';
import { requireCsrfHeader, demoReadOnly, uploadsAllowed } from '../middleware/guards';
import { login, register, getProfile, updateProfile, logout, demoLogin, demoAccounts, getAuthConfig } from '../controllers/authController';
import {
  getProjects, getProject, createProject, updateProject, deleteProject,
  getProjectStats, addMember, removeMember
} from '../controllers/projectController';
import {
  getDailyReports, getDailyReport, createDailyReport, updateDailyReport, deleteDailyReport, addComment,
  getWeeklyReports, generateWeeklyReport, updateWeeklyReport, deleteWeeklyReport,
  getMonthlyReports, generateMonthlyReport, updateMonthlyReport, deleteMonthlyReport,
  getActivities, createActivity, updateActivity, deleteActivity, bulkImportActivities,
  getMilestones, createMilestone, updateMilestone, deleteMilestone,
  getRisks, createRisk, updateRisk, deleteRisk,
  getNCRs, createNCR, updateNCR, deleteNCR,
} from '../controllers/reportController';
import { getDocuments, uploadDocument, deleteDocument, uploadPhoto } from '../controllers/documentController';
import {
  getPlantEquipment, createPlantEquipment, updatePlantEquipment, deletePlantEquipment,
  getSiteResources, createSiteResource, updateSiteResource, deleteSiteResource,
} from '../controllers/siteController';
import { getDashboardStats, getProjectAnalytics, getUserAnalytics } from '../controllers/analyticsController';

import { getUsers, getUser, createUser, updateUser, deleteUser } from '../controllers/userController';
import { uploadDocument as uploadDocMiddleware, uploadPhoto as uploadPhotoMiddleware } from '../middleware/upload';
import { authLimiter, apiLimiter } from '../middleware/rateLimit';

export const router = Router();

router.use(apiLimiter);
router.use(requireCsrfHeader);
router.use(demoReadOnly);

// Shorthands
const auth = authenticate;
const P = [authenticate, requireProjectAccess];            // member of :projectId / :id (or ADMIN)
const PW = [...P, stripProtectedFields];                    // + body cannot re-target records
const child = (model: Parameters<typeof requireChildOfProject>[0], param: string) =>
  requireChildOfProject(model, param);

// Auth
router.get('/auth/config', getAuthConfig);
router.get('/auth/demo-accounts', demoAccounts);
router.post('/auth/demo', authLimiter, demoLogin);
router.post('/auth/login', authLimiter, login);
router.post('/auth/register', authLimiter, register);
router.post('/auth/logout', logout);
router.get('/auth/profile', authenticate, getProfile);
router.put('/auth/profile', authenticate, updateProfile);

// Dashboard / Analytics
router.get('/analytics/dashboard', authenticate, getDashboardStats);
router.get('/analytics/projects/:projectId', ...P, getProjectAnalytics);
router.get('/analytics/users', authenticate, authorize('ADMIN'), getUserAnalytics);

// Projects
router.get('/projects', authenticate, getProjects);
router.post('/projects', authenticate, createProject);
router.get('/projects/:id', ...P, getProject);
router.put('/projects/:id', ...P, updateProject);
router.delete('/projects/:id', auth, requireProjectManager, deleteProject);
router.get('/projects/:id/stats', ...P, getProjectStats);
router.post('/projects/:id/members', auth, requireProjectManager, addMember);
router.delete('/projects/:id/members/:userId', auth, requireProjectManager, removeMember);

// Daily Reports
router.get('/projects/:projectId/reports/daily', ...P, getDailyReports);
router.post('/projects/:projectId/reports/daily', ...PW, createDailyReport);
router.get('/projects/:projectId/reports/daily/:reportId', ...P, child('dailyReport', 'reportId'), getDailyReport);
router.put('/projects/:projectId/reports/daily/:reportId', ...PW, child('dailyReport', 'reportId'), updateDailyReport);
router.delete('/projects/:projectId/reports/daily/:reportId', ...P, child('dailyReport', 'reportId'), deleteDailyReport);
router.post('/projects/:projectId/reports/daily/:reportId/comments', ...PW, child('dailyReport', 'reportId'), addComment);

// Weekly Reports
router.get('/projects/:projectId/reports/weekly', ...P, getWeeklyReports);
router.post('/projects/:projectId/reports/weekly/generate', ...PW, generateWeeklyReport);
router.put('/projects/:projectId/reports/weekly/:reportId', ...PW, child('weeklyReport', 'reportId'), updateWeeklyReport);
router.delete('/projects/:projectId/reports/weekly/:reportId', ...P, child('weeklyReport', 'reportId'), deleteWeeklyReport);

// Monthly Reports
router.get('/projects/:projectId/reports/monthly', ...P, getMonthlyReports);
router.post('/projects/:projectId/reports/monthly/generate', ...PW, generateMonthlyReport);
router.put('/projects/:projectId/reports/monthly/:reportId', ...PW, child('monthlyReport', 'reportId'), updateMonthlyReport);
router.delete('/projects/:projectId/reports/monthly/:reportId', ...P, child('monthlyReport', 'reportId'), deleteMonthlyReport);

// Activities
router.get('/projects/:projectId/activities', ...P, getActivities);
router.post('/projects/:projectId/activities/bulk', ...PW, bulkImportActivities);
router.post('/projects/:projectId/activities', ...PW, createActivity);
router.put('/projects/:projectId/activities/:activityId', ...PW, child('activity', 'activityId'), updateActivity);
router.delete('/projects/:projectId/activities/:activityId', ...P, child('activity', 'activityId'), deleteActivity);

// Milestones
router.get('/projects/:projectId/milestones', ...P, getMilestones);
router.post('/projects/:projectId/milestones', ...PW, createMilestone);
router.put('/projects/:projectId/milestones/:milestoneId', ...PW, child('milestone', 'milestoneId'), updateMilestone);
router.delete('/projects/:projectId/milestones/:milestoneId', ...P, child('milestone', 'milestoneId'), deleteMilestone);

// Risks
router.get('/projects/:projectId/risks', ...P, getRisks);
router.post('/projects/:projectId/risks', ...PW, createRisk);
router.put('/projects/:projectId/risks/:riskId', ...PW, child('risk', 'riskId'), updateRisk);
router.delete('/projects/:projectId/risks/:riskId', ...P, child('risk', 'riskId'), deleteRisk);

// NCRs
router.get('/projects/:projectId/ncrs', ...P, getNCRs);
router.post('/projects/:projectId/ncrs', ...PW, createNCR);
router.put('/projects/:projectId/ncrs/:ncrId', ...PW, child('nCR', 'ncrId'), updateNCR);
router.delete('/projects/:projectId/ncrs/:ncrId', ...P, child('nCR', 'ncrId'), deleteNCR);

// Plant & Equipment Register
router.get('/projects/:projectId/plant', ...P, getPlantEquipment);
router.post('/projects/:projectId/plant', ...PW, createPlantEquipment);
router.put('/projects/:projectId/plant/:itemId', ...PW, child('plantEquipment', 'itemId'), updatePlantEquipment);
router.delete('/projects/:projectId/plant/:itemId', ...P, child('plantEquipment', 'itemId'), deletePlantEquipment);

// Site Resources (Workforce Register)
router.get('/projects/:projectId/resources', ...P, getSiteResources);
router.post('/projects/:projectId/resources', ...PW, createSiteResource);
router.put('/projects/:projectId/resources/:itemId', ...PW, child('siteResource', 'itemId'), updateSiteResource);
router.delete('/projects/:projectId/resources/:itemId', ...P, child('siteResource', 'itemId'), deleteSiteResource);

// Documents
router.get('/projects/:projectId/documents', ...P, getDocuments);
router.post('/projects/:projectId/documents', ...P, uploadsAllowed, uploadDocMiddleware.single('file'), uploadDocument);
router.delete('/projects/:projectId/documents/:docId', ...P, child('document', 'docId'), deleteDocument);
router.post('/photos', authenticate, uploadsAllowed, uploadPhotoMiddleware.single('file'), uploadPhoto);

// Users
const admin = [authenticate, authorize('ADMIN')];
router.get('/users', ...admin, getUsers);
router.post('/users', ...admin, createUser);
router.get('/users/:userId', ...admin, getUser);
router.put('/users/:userId', ...admin, updateUser);
router.delete('/users/:userId', ...admin, deleteUser);
