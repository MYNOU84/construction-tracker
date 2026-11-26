import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { requireProjectAccess, requireProjectManager, requireChildOfProject, stripProtectedFields, requirePermission as can } from '../middleware/access';
import { requireCsrfHeader } from '../middleware/guards';
import { login, register, getProfile, updateProfile, logout, demoLogin, demoAccounts, getAuthConfig } from '../controllers/authController';
import {
  getProjects, getProject, createProject, updateProject, deleteProject,
  getProjectStats, addMember, removeMember, getMemberCandidates, exportProject, getMyPermissions
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
import { getDocuments, uploadDocument, deleteDocument, setDocumentStatus, uploadPhoto, deletePhoto } from '../controllers/documentController';
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
router.get('/projects/:id/export', ...P, exportProject);
router.get('/projects/:id/permissions', ...P, getMyPermissions);
router.get('/projects/:id/member-candidates', auth, requireProjectManager, getMemberCandidates);
router.post('/projects/:id/members', auth, requireProjectManager, addMember);
router.delete('/projects/:id/members/:userId', auth, requireProjectManager, removeMember);

// Daily Reports
router.get('/projects/:projectId/reports/daily', ...P, getDailyReports);
router.post('/projects/:projectId/reports/daily', ...PW, can('daily', 'create'), createDailyReport);
router.get('/projects/:projectId/reports/daily/:reportId', ...P, child('dailyReport', 'reportId'), getDailyReport);
router.put('/projects/:projectId/reports/daily/:reportId', ...PW, child('dailyReport', 'reportId'), updateDailyReport);
router.delete('/projects/:projectId/reports/daily/:reportId', ...P, child('dailyReport', 'reportId'), deleteDailyReport);
router.post('/projects/:projectId/reports/daily/:reportId/comments', ...PW, child('dailyReport', 'reportId'), can('daily', 'review'), addComment);

// Weekly Reports
router.get('/projects/:projectId/reports/weekly', ...P, getWeeklyReports);
router.post('/projects/:projectId/reports/weekly/generate', ...PW, can('weekly', 'create'), generateWeeklyReport);
router.put('/projects/:projectId/reports/weekly/:reportId', ...PW, child('weeklyReport', 'reportId'), can('weekly', 'edit'), updateWeeklyReport);
router.delete('/projects/:projectId/reports/weekly/:reportId', ...P, child('weeklyReport', 'reportId'), can('weekly', 'delete'), deleteWeeklyReport);

// Monthly Reports
router.get('/projects/:projectId/reports/monthly', ...P, getMonthlyReports);
router.post('/projects/:projectId/reports/monthly/generate', ...PW, can('monthly', 'create'), generateMonthlyReport);
router.put('/projects/:projectId/reports/monthly/:reportId', ...PW, child('monthlyReport', 'reportId'), can('monthly', 'edit'), updateMonthlyReport);
router.delete('/projects/:projectId/reports/monthly/:reportId', ...P, child('monthlyReport', 'reportId'), can('monthly', 'delete'), deleteMonthlyReport);

// Activities
router.get('/projects/:projectId/activities', ...P, getActivities);
router.post('/projects/:projectId/activities/bulk', ...PW, can('schedule', 'create'), bulkImportActivities);
router.post('/projects/:projectId/activities', ...PW, can('schedule', 'create'), createActivity);
router.put('/projects/:projectId/activities/:activityId', ...PW, child('activity', 'activityId'), can('schedule', 'edit'), updateActivity);
router.delete('/projects/:projectId/activities/:activityId', ...P, child('activity', 'activityId'), can('schedule', 'delete'), deleteActivity);

// Milestones
router.get('/projects/:projectId/milestones', ...P, getMilestones);
router.post('/projects/:projectId/milestones', ...PW, can('schedule', 'create'), createMilestone);
router.put('/projects/:projectId/milestones/:milestoneId', ...PW, child('milestone', 'milestoneId'), can('schedule', 'edit'), updateMilestone);
router.delete('/projects/:projectId/milestones/:milestoneId', ...P, child('milestone', 'milestoneId'), can('schedule', 'delete'), deleteMilestone);

// Risks
router.get('/projects/:projectId/risks', ...P, getRisks);
router.post('/projects/:projectId/risks', ...PW, can('risks', 'create'), createRisk);
router.put('/projects/:projectId/risks/:riskId', ...PW, child('risk', 'riskId'), can('risks', 'edit'), updateRisk);
router.delete('/projects/:projectId/risks/:riskId', ...P, child('risk', 'riskId'), can('risks', 'delete'), deleteRisk);

// NCRs
router.get('/projects/:projectId/ncrs', ...P, getNCRs);
router.post('/projects/:projectId/ncrs', ...PW, can('ncrs', 'create'), createNCR);
router.put('/projects/:projectId/ncrs/:ncrId', ...PW, child('nCR', 'ncrId'), can('ncrs', 'edit'), updateNCR);
router.delete('/projects/:projectId/ncrs/:ncrId', ...P, child('nCR', 'ncrId'), can('ncrs', 'delete'), deleteNCR);

// Plant & Equipment Register
router.get('/projects/:projectId/plant', ...P, getPlantEquipment);
router.post('/projects/:projectId/plant', ...PW, can('plant', 'create'), createPlantEquipment);
router.put('/projects/:projectId/plant/:itemId', ...PW, child('plantEquipment', 'itemId'), can('plant', 'edit'), updatePlantEquipment);
router.delete('/projects/:projectId/plant/:itemId', ...P, child('plantEquipment', 'itemId'), can('plant', 'delete'), deletePlantEquipment);

// Site Resources (Workforce Register)
router.get('/projects/:projectId/resources', ...P, getSiteResources);
router.post('/projects/:projectId/resources', ...PW, can('resources', 'create'), createSiteResource);
router.put('/projects/:projectId/resources/:itemId', ...PW, child('siteResource', 'itemId'), can('resources', 'edit'), updateSiteResource);
router.delete('/projects/:projectId/resources/:itemId', ...P, child('siteResource', 'itemId'), can('resources', 'delete'), deleteSiteResource);

// Documents
router.get('/projects/:projectId/documents', ...P, getDocuments);
router.post('/projects/:projectId/documents', ...P, can('documents', 'create'), uploadDocMiddleware.single('file'), uploadDocument);
router.delete('/projects/:projectId/documents/:docId', ...P, child('document', 'docId'), deleteDocument);
router.patch('/projects/:projectId/documents/:docId/status', ...PW, child('document', 'docId'), setDocumentStatus);
router.post('/photos', authenticate, uploadPhotoMiddleware.single('file'), uploadPhoto);
router.delete('/photos/:id', authenticate, deletePhoto);

// Users
const admin = [authenticate, authorize('ADMIN')];
router.get('/users', ...admin, getUsers);
router.post('/users', ...admin, createUser);
router.get('/users/:userId', ...admin, getUser);
router.put('/users/:userId', ...admin, updateUser);
router.delete('/users/:userId', ...admin, deleteUser);
