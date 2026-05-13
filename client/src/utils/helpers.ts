import { format, formatDistanceToNow, isAfter, isBefore, parseISO } from 'date-fns';
import type { ProjectStatus, ActivityStatus, MilestoneStatus, ReportStatus } from '../types';

export const parseJSON = <T>(value: T | string, fallback: T): T => {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; }
    catch { return fallback; }
  }
  return value ?? fallback;
};

export const formatDate = (date: string | Date | null | undefined, fmt = 'dd MMM yyyy'): string => {
  if (!date) return '—';
  try { return format(typeof date === 'string' ? parseISO(date) : date, fmt); }
  catch { return '—'; }
};

export const formatDateTime = (date: string | Date | null | undefined): string =>
  formatDate(date, 'dd MMM yyyy, HH:mm');

export const timeAgo = (date: string | Date): string => {
  try { return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, { addSuffix: true }); }
  catch { return '—'; }
};

export const formatCurrency = (amount: number, currency = 'USD'): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

export const formatNumber = (n: number): string => new Intl.NumberFormat().format(n);

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getProgressColor = (_progress: number): string => '';

export const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    ACTIVE: 'badge-green', COMPLETED: 'badge-blue', PLANNING: 'badge-yellow',
    ON_HOLD: 'badge-orange', CANCELLED: 'badge-red',
    DRAFT: 'badge-gray', SUBMITTED: 'badge-blue', APPROVED: 'badge-green', REJECTED: 'badge-red',
    NOT_STARTED: 'badge-gray', IN_PROGRESS: 'badge-blue', DELAYED: 'badge-red',
    PENDING: 'badge-yellow', ACHIEVED: 'badge-green', AT_RISK: 'badge-orange',
    OPEN: 'badge-red', CLOSED: 'badge-green', MITIGATED: 'badge-blue', ACCEPTED: 'badge-yellow',
    UNDER_REVIEW: 'badge-yellow', DISPUTED: 'badge-orange',
    HIGH: 'badge-red', MEDIUM: 'badge-yellow', LOW: 'badge-green', CRITICAL: 'badge-red',
  };
  return map[status] || 'badge-gray';
};

export const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    ACTIVE: 'Active', COMPLETED: 'Completed', PLANNING: 'Planning',
    ON_HOLD: 'On Hold', CANCELLED: 'Cancelled',
    DRAFT: 'Draft', SUBMITTED: 'Submitted', APPROVED: 'Approved', REJECTED: 'Rejected',
    NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', DELAYED: 'Delayed',
    PENDING: 'Pending', ACHIEVED: 'Achieved', AT_RISK: 'At Risk',
    OPEN: 'Open', CLOSED: 'Closed', MITIGATED: 'Mitigated', ACCEPTED: 'Accepted',
    UNDER_REVIEW: 'Under Review', DISPUTED: 'Disputed',
    PROJECT_MANAGER: 'Project Manager', SITE_ENGINEER: 'Site Engineer',
    CONSULTANT: 'Consultant', CONTRACTOR: 'Contractor',
    CLIENT_VIEWER: 'Client Viewer', ADMIN: 'Administrator',
  };
  return map[status] || status;
};

export const getDisciplineColor = (discipline: string): string => {
  const map: Record<string, string> = {
    STRUCTURE:     '#00d4ff',
    ARCHITECTURE:  '#fb923c',
    MECANIQUE:     '#8c3aff',
    ELECTRICITE:   '#ffb800',
    PLOMBERIE:     '#06b6d4',
    CIVIL:         '#00d68f',
    INFRASTRUCTURE:'#ff006e',
    GENERAL:       '#4a5f85',
  };
  return map[discipline] || '#4a5f85';
};

export const getRiskLevel = (score: number): string => {
  if (score >= 15) return 'CRITICAL';
  if (score >= 10) return 'HIGH';
  if (score >= 6) return 'MEDIUM';
  return 'LOW';
};

export const isOverdue = (date: string): boolean => {
  try { return isBefore(parseISO(date), new Date()); }
  catch { return false; }
};

export const daysUntil = (date: string): number => {
  try {
    const diff = parseISO(date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch { return 0; }
};

export const cn = (...classes: (string | boolean | undefined | null)[]): string =>
  classes.filter(Boolean).join(' ');

export const DISCIPLINES = ['STRUCTURE', 'ARCHITECTURE', 'MECANIQUE', 'ELECTRICITE', 'PLOMBERIE', 'CIVIL', 'INFRASTRUCTURE', 'GENERAL'];

export const DISCIPLINE_LABELS: Record<string, string> = {
  STRUCTURE:      'Structure',
  ARCHITECTURE:   'Architecture',
  MECANIQUE:      'Mechanical',
  ELECTRICITE:    'Electrical',
  PLOMBERIE:      'Plumbing',
  CIVIL:          'Civil',
  INFRASTRUCTURE: 'Infrastructure',
  GENERAL:        'General',
};

export const getDisciplineLabel = (code: string): string =>
  DISCIPLINE_LABELS[code] || code;

const POSITION_TRANSLATIONS: Record<string, string> = {
  // Plural French → English
  'maçons': 'Masons', 'macons': 'Masons',
  'ferraileurs': 'Steel Fixers', 'ferrailleurs': 'Steel Fixers',
  'coffreurs': 'Formwork Workers',
  'plombiers': 'Plumbers',
  'électriciens': 'Electricians', 'electriciens': 'Electricians',
  'chauffeurs/engins': 'Drivers / Equipment Operators', 'chauffeurs engins': 'Drivers / Equipment Operators',
  'chauffeurs': 'Drivers',
  'manœuvres': 'Laborers', 'manoeuvres': 'Laborers',
  'peintres': 'Painters',
  'carreleurs': 'Tilers',
  'soudeurs': 'Welders',
  'grutiers': 'Crane Operators',
  'chefs de chantier': 'Site Foremen',
  'conducteurs de travaux': 'Construction Managers',
  'techniciens': 'Technicians',
  'ingénieurs': 'Engineers', 'ingenieurs': 'Engineers',
  'géomètres': 'Surveyors', 'geometres': 'Surveyors',
  'magasiniers': 'Storekeepers',
  'agents de sécurité': 'Security Guards', 'agents de securite': 'Security Guards',
  // Singular French → English
  'maçon': 'Mason', 'macon': 'Mason',
  'ferrailleur': 'Steel Fixer',
  'coffreur': 'Formwork Worker',
  'plombier': 'Plumber',
  'électricien': 'Electrician', 'electricien': 'Electrician',
  'chauffeur/engin': 'Driver / Equipment Operator', 'chauffeur engin': 'Driver / Equipment Operator',
  'chauffeur': 'Driver',
  'manœuvre': 'Laborer', 'manoeuvre': 'Laborer',
  'peintre': 'Painter',
  'carreleur': 'Tiler',
  'soudeur': 'Welder',
  'grutier': 'Crane Operator',
  'chef de chantier': 'Site Foreman',
  'conducteur de travaux': 'Construction Manager',
  'technicien': 'Technician',
  'ingénieur': 'Engineer', 'ingenieur': 'Engineer',
  'géomètre': 'Surveyor', 'geometre': 'Surveyor',
  'magasinier': 'Storekeeper',
  'agent de sécurité': 'Security Guard', 'agent de securite': 'Security Guard',
  'responsable hse': 'HSE Manager',
  'directeur de projet': 'Project Director',
  'chef de projet': 'Project Manager',
  "chef d'equipe": 'Team Leader', "chef d'équipe": 'Team Leader',
  'contremaître': 'Foreman', 'contremaite': 'Foreman', 'contremaitre': 'Foreman',
  'mécanicien': 'Mechanic', 'mecanicien': 'Mechanic',
  'mécaniciens': 'Mechanics', 'mecaniciens': 'Mechanics',
  'topographe': 'Surveyor',
  'dessinateur': 'Draughtsman',
  "conducteur d'engins": 'Equipment Operator',
  "conducteurs d'engins": 'Equipment Operators',
};

export const translatePosition = (name: string): string => {
  if (!name) return name;
  const key = name.trim().toLowerCase();
  return POSITION_TRANSLATIONS[key] ?? name;
};
export const WEATHER_OPTIONS = ['Clear', 'Sunny', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Heavy Rain', 'Windy', 'Foggy', 'Hot'];
export const DOCUMENT_TYPES = ['PHOTO', 'DRAWING', 'RFI', 'PERMIT', 'REPORT', 'CONTRACT', 'SPECIFICATION', 'OTHER'];
export const RISK_CATEGORIES = ['STRUCTURAL', 'FINANCIAL', 'ENVIRONMENTAL', 'SUPPLY_CHAIN', 'HUMAN_RESOURCES', 'REGULATORY', 'WEATHER', 'GEOTECHNICAL', 'GENERAL'];
export const USER_ROLES: { value: string; label: string }[] = [
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'SITE_ENGINEER', label: 'Site Engineer' },
  { value: 'CONSULTANT', label: 'Consultant' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'CLIENT_VIEWER', label: 'Client Viewer' },
];
