import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import DailyReportPage from './pages/DailyReportPage';
import DailyReportFormPage from './pages/DailyReportFormPage';
import WeeklyReportPage from './pages/WeeklyReportPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import SchedulePage from './pages/SchedulePage';
import DocumentsPage from './pages/DocumentsPage';
import RisksPage from './pages/RisksPage';
import UsersPage from './pages/UsersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PlantEquipmentPage from './pages/PlantEquipmentPage';
import SiteResourcesPage from './pages/SiteResourcesPage';
import ProjectPresentationPage from './pages/ProjectPresentationPage';
import ProjectMapPage from './pages/ProjectMapPage';
import HSEPage from './pages/HSEPage';
import ContractsSubmittalsPage from './pages/ContractsSubmittalsPage';
import PerformancePage from './pages/PerformancePage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="projects/:projectId/reports/daily" element={<DailyReportPage />} />
          <Route path="projects/:projectId/reports/daily/new" element={<DailyReportFormPage />} />
          <Route path="projects/:projectId/reports/daily/:reportId" element={<DailyReportFormPage />} />
          <Route path="projects/:projectId/reports/weekly" element={<WeeklyReportPage />} />
          <Route path="projects/:projectId/reports/monthly" element={<MonthlyReportPage />} />
          <Route path="projects/:projectId/schedule" element={<SchedulePage />} />
          <Route path="projects/:projectId/documents" element={<DocumentsPage />} />
          <Route path="projects/:projectId/performance" element={<PerformancePage />} />
          <Route path="projects/:projectId/hse" element={<HSEPage />} />
          <Route path="projects/:projectId/contracts" element={<ContractsSubmittalsPage />} />
          <Route path="projects/:projectId/risks" element={<RisksPage />} />
          <Route path="projects/:projectId/plant" element={<PlantEquipmentPage />} />
          <Route path="projects/:projectId/resources" element={<SiteResourcesPage />} />
          <Route path="projects/:projectId/presentation" element={<ProjectPresentationPage />} />
          <Route path="projects/:projectId/map" element={<ProjectMapPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
