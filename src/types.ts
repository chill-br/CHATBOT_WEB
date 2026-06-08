export type InstitutionType = 'School' | 'College';

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  address: string;
  email: string;
  principalName: string;
  code: string; // unique code students/parents use to login
  logoText?: string;
  status: 'active' | 'inactive' | 'pending';
  departments: string[];
  createdAt: string;
}

export type UserRole = 'super_admin' | 'principal' | 'staff' | 'student_parent';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  institutionId?: string; // empty for super_admin
  department?: string; // for staff
  token?: string;
}

export type DocumentCategory =
  | 'Circulars'
  | 'Notes'
  | 'Timetable'
  | 'Exams'
  | 'Fees'
  | 'Placements'
  | 'Events'
  | 'General';

export interface AcademicDocument {
  id: string;
  name: string;
  fileType: 'pdf' | 'docx' | 'txt';
  category: DocumentCategory;
  textContent: string;
  department?: string; // Optional department restriction
  sizeKb: number;
  uploadedBy: string;
  uploadedAt: string;
  institutionId: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  category: DocumentCategory;
  department?: string;
  date: string;
  institutionId: string;
  isUrgent?: boolean;
}

export interface AcademicEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  institutionId: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  citations?: string[]; // Source file names that supported this answer
  isPending?: boolean;
}

export interface ChatHistoryItem {
  id: string;
  institutionId: string;
  userRole: string;
  question: string;
  answer: string;
  timestamp: string;
}

export interface PlatformAnalytics {
  totalInstitutions: number;
  activeInstitutions: number;
  pendingReviews: number;
  totalDocuments: number;
  totalQuestionsAnswered: number;
  documentBreakdown: { name: string; value: number }[];
  frequentQuestions: { question: string; count: number }[];
  chatsPerDay: { date: string; chats: number }[];
}

export interface AcademicAlert {
  id: string;
  title: string;
  content: string;
  type: 'urgent' | 'announcement' | 'reminder';
  date: string;
  institutionId: string;
}
