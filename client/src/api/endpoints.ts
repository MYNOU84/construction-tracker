import api from './client';
import type { Project, DailyReport, WeeklyReport, MonthlyReport, Activity, Milestone, Document, Risk, NCR, User, DashboardStats, ProjectAnalytics } from '../types';

// Auth
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: object) => api.post('/auth/register', data),
  getProfile: () => api.get<User>('/auth/profile'),
  updateProfile: (data: object) => api.put<User>('/auth/profile', data),
};

// Projects
export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: object) => api.post<Project>('/projects', data),
  update: (id: string, data: object) => api.put<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  getStats: (id: string) => api.get(`/projects/${id}/stats`),
  addMember: (id: string, data: object) => api.post(`/projects/${id}/members`, data),
  removeMember: (id: string, userId: string) => api.delete(`/projects/${id}/members/${userId}`),
};

// Daily Reports
export const dailyReportsApi = {
  list: (projectId: string, params?: object) => api.get<DailyReport[]>(`/projects/${projectId}/reports/daily`, { params }),
  get: (projectId: string, reportId: string) => api.get<DailyReport>(`/projects/${projectId}/reports/daily/${reportId}`),
  create: (projectId: string, data: object) => api.post<DailyReport>(`/projects/${projectId}/reports/daily`, data),
  update: (projectId: string, reportId: string, data: object) => api.put<DailyReport>(`/projects/${projectId}/reports/daily/${reportId}`, data),
  delete: (projectId: string, reportId: string) => api.delete(`/projects/${projectId}/reports/daily/${reportId}`),
  addComment: (projectId: string, reportId: string, data: object) => api.post(`/projects/${projectId}/reports/daily/${reportId}/comments`, data),
};

// Weekly Reports
export const weeklyReportsApi = {
  list: (projectId: string) => api.get<WeeklyReport[]>(`/projects/${projectId}/reports/weekly`),
  generate: (projectId: string, data: object) => api.post<WeeklyReport>(`/projects/${projectId}/reports/weekly/generate`, data),
  update: (projectId: string, reportId: string, data: object) => api.put<WeeklyReport>(`/projects/${projectId}/reports/weekly/${reportId}`, data),
  delete: (projectId: string, reportId: string) => api.delete(`/projects/${projectId}/reports/weekly/${reportId}`),
};

// Monthly Reports
export const monthlyReportsApi = {
  list: (projectId: string) => api.get<MonthlyReport[]>(`/projects/${projectId}/reports/monthly`),
  generate: (projectId: string, data: object) => api.post<MonthlyReport>(`/projects/${projectId}/reports/monthly/generate`, data),
  update: (projectId: string, reportId: string, data: object) => api.put<MonthlyReport>(`/projects/${projectId}/reports/monthly/${reportId}`, data),
  delete: (projectId: string, reportId: string) => api.delete(`/projects/${projectId}/reports/monthly/${reportId}`),
};

// Activities
export const activitiesApi = {
  list: (projectId: string) => api.get<Activity[]>(`/projects/${projectId}/activities`),
  create: (projectId: string, data: object) => api.post<Activity>(`/projects/${projectId}/activities`, data),
  update: (projectId: string, activityId: string, data: object) => api.put<Activity>(`/projects/${projectId}/activities/${activityId}`, data),
  delete: (projectId: string, activityId: string) => api.delete(`/projects/${projectId}/activities/${activityId}`),
  bulkImport: (projectId: string, activities: object[]) => api.post<{ count: number }>(`/projects/${projectId}/activities/bulk`, { activities }),
};

// Milestones
export const milestonesApi = {
  list: (projectId: string) => api.get<Milestone[]>(`/projects/${projectId}/milestones`),
  create: (projectId: string, data: object) => api.post<Milestone>(`/projects/${projectId}/milestones`, data),
  update: (projectId: string, milestoneId: string, data: object) => api.put<Milestone>(`/projects/${projectId}/milestones/${milestoneId}`, data),
};

// Documents
export const documentsApi = {
  list: (projectId: string, type?: string) => api.get<Document[]>(`/projects/${projectId}/documents`, { params: type ? { type } : {} }),
  upload: (projectId: string, formData: FormData) => api.post<Document>(`/projects/${projectId}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (projectId: string, docId: string) => api.delete(`/projects/${projectId}/documents/${docId}`),
};

// Photos
export const photosApi = {
  upload: (formData: FormData) => api.post('/photos', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Plant & Equipment Register
export const plantApi = {
  list: (projectId: string, status?: string) => api.get(`/projects/${projectId}/plant`, { params: status ? { status } : {} }),
  create: (projectId: string, data: object) => api.post(`/projects/${projectId}/plant`, data),
  update: (projectId: string, itemId: string, data: object) => api.put(`/projects/${projectId}/plant/${itemId}`, data),
  delete: (projectId: string, itemId: string) => api.delete(`/projects/${projectId}/plant/${itemId}`),
};

// Site Resources (Workforce Register)
export const resourcesApi = {
  list: (projectId: string, params?: { status?: string; type?: string }) => api.get(`/projects/${projectId}/resources`, { params }),
  create: (projectId: string, data: object) => api.post(`/projects/${projectId}/resources`, data),
  update: (projectId: string, itemId: string, data: object) => api.put(`/projects/${projectId}/resources/${itemId}`, data),
  delete: (projectId: string, itemId: string) => api.delete(`/projects/${projectId}/resources/${itemId}`),
};

// Risks
export const risksApi = {
  list: (projectId: string) => api.get<Risk[]>(`/projects/${projectId}/risks`),
  create: (projectId: string, data: object) => api.post<Risk>(`/projects/${projectId}/risks`, data),
  update: (projectId: string, riskId: string, data: object) => api.put<Risk>(`/projects/${projectId}/risks/${riskId}`, data),
};

// NCRs
export const ncrsApi = {
  list: (projectId: string) => api.get<NCR[]>(`/projects/${projectId}/ncrs`),
  create: (projectId: string, data: object) => api.post<NCR>(`/projects/${projectId}/ncrs`, data),
  update: (projectId: string, ncrId: string, data: object) => api.put<NCR>(`/projects/${projectId}/ncrs/${ncrId}`, data),
};

// Analytics
export const analyticsApi = {
  dashboard: () => api.get<DashboardStats>('/analytics/dashboard'),
  project: (projectId: string, period?: number) => api.get<ProjectAnalytics>(`/analytics/projects/${projectId}`, { params: { period } }),
};

// Users
export const usersApi = {
  list: () => api.get<User[]>('/users'),
  get: (userId: string) => api.get<User>(`/users/${userId}`),
  create: (data: object) => api.post<User>('/users', data),
  update: (userId: string, data: object) => api.put<User>(`/users/${userId}`, data),
  delete: (userId: string) => api.delete(`/users/${userId}`),
};
