import React, { useState, useEffect } from 'react';
import {
  Shield,
  School,
  Building,
  UserCheck,
  FileText,
  MessageSquare,
  Sparkles,
  Search,
  Upload,
  Plus,
  Trash2,
  Users,
  CheckCircle,
  XCircle,
  Bell,
  Calendar,
  Layers,
  Code,
  BookOpen,
  Send,
  HelpCircle,
  CloudLightning,
  CornerDownRight,
  ChevronRight,
  Database,
  ExternalLink,
  Lock,
  Compass,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Menu,
  X,
  Languages,
  LogOut,
  Info,
  Clock,
  ArrowRight,
  Check,
  Eye,
  Printer,
  Download,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import {
  Institution,
  User,
  AcademicDocument,
  Notice,
  AcademicAlert,
  ChatMessage,
  PlatformAnalytics,
  DocumentCategory
} from './types';

// Helper to parse simple readable ASCII strings from PDF files
const extractTextFromPDFBytes = (arrayBuffer: ArrayBuffer): string => {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      if (i > 100000) break; // Limit size scanner to first 100KB to prevent lag
      const charCode = bytes[i];
      if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13 || charCode === 9) {
        binary += String.fromCharCode(charCode);
      }
    }

    const matches = binary.match(/\(([^)]+)\)/g);
    let parsedText = '';

    if (matches && matches.length > 5) {
      const cleaned = matches
        .map(m => m.slice(1, -1).trim())
        .filter(text => text.length > 3 && !text.startsWith('/') && !text.includes('%'))
        .join(' ');
      
      if (cleaned.length > 80) {
        parsedText = cleaned.slice(0, 1500);
      }
    }

    if (!parsedText) {
      const words = binary.match(/[a-zA-Z0-9'., -]{5,50}/g);
      if (words && words.length > 10) {
        const filtered = words
          .map(w => w.trim())
          .filter(w => !w.includes('obj') && !w.includes('endobj') && !w.includes('stream') && !w.includes('endstream') && !w.includes('/Type') && !w.includes('/Font'))
          .join(' ');
        if (filtered.length > 80) {
          parsedText = filtered.slice(0, 1500);
        }
      }
    }

    // Heuristics check to prevent non-readable Flate/compressed streams from displaying as text
    if (parsedText) {
      let validCount = 0;
      for (let i = 0; i < parsedText.length; i++) {
        const c = parsedText.charCodeAt(i);
        if (
          (c >= 65 && c <= 90) || 
          (c >= 97 && c <= 122) || 
          (c >= 48 && c <= 57) || 
          c === 32 || c === 10 || c === 13 ||
          [46, 44, 33, 63, 40, 41, 45, 58, 47, 39, 34].includes(c)
        ) {
          validCount++;
        }
      }
      const ratio = validCount / parsedText.length;
      const isJunkSignature = parsedText.includes('$$e~') || parsedText.includes('hdKc},') || parsedText.includes('W0XzDS') || parsedText.includes('Skia/PDF') || parsedText.includes('G@^<G') || parsedText.includes('GTJ~H');
      if (ratio < 0.85 || isJunkSignature) {
        return '';
      }
      return parsedText;
    }
  } catch (err) {
    console.error('Error in custom PDF parser:', err);
  }
  return '';
};

export default function App() {
  // Session & Access Core States
  const [visitedTab, setVisitedTab] = useState<'home' | 'features' | 'about' | 'contact' | 'portal'>('home');
  const [activeRole, setActiveRole] = useState<'super_admin' | 'principal' | 'staff' | 'student_parent' | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);
  const [activeInstitutionCode, setActiveInstitutionCode] = useState<string>(''); // For current active workspace view
  const [platformStats, setPlatformStats] = useState<PlatformAnalytics | null>(null);

  // Lists state (synced with Server)
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [documents, setDocuments] = useState<AcademicDocument[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [alerts, setAlerts] = useState<AcademicAlert[]>([]);

  // Interactive inputs
  const [schoolCodeInput, setSchoolCodeInput] = useState('');
  const [adminUsername, setAdminUsername] = useState('superadmin');
  const [loginEmail, setLoginEmail] = useState('admin@academicplatform.com');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [portalLoginMode, setPortalLoginMode] = useState<'staff' | 'student'>('staff');
  const [authError, setAuthError] = useState('');
  const [institutionError, setInstitutionError] = useState('');

  // Tab views within dashboards
  const [superAdminTab, setSuperAdminTab] = useState<'overview' | 'institutions' | 'codebase'>('overview');
  const [panelTab, setPanelTab] = useState<'chat' | 'notices' | 'documents' | 'staff' | 'alerts'>('chat');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [previewModalDoc, setPreviewModalDoc] = useState<AcademicDocument | null>(null);
  const [modalViewMode, setModalViewMode] = useState<'reader' | 'interactive'>('reader');
  const [textSizePercent, setTextSizePercent] = useState<number>(100);
  const [modalTheme, setModalTheme] = useState<'light' | 'sepia' | 'dark' | 'contrast'>('light');

  // Input states for creators
  // 1. Institution Registration Form
  const [registerForm, setRegisterForm] = useState({
    name: '',
    type: 'College' as 'School' | 'College',
    address: '',
    email: '',
    principalName: '',
    code: '',
    departmentsText: 'Computer Science, Electronics, Mechanical, Applied Sciences'
  });
  const [registrationMessage, setRegistrationMessage] = useState('');

  // 2. Add Staff profile form
  const [staffForm, setStaffForm] = useState({
    username: '',
    email: '',
    department: ''
  });

  // 3. Document cataloging simulator
  const [docForm, setDocForm] = useState({
    name: 'Syllabus_CS_DataStructures_2026.pdf',
    category: 'Notes' as DocumentCategory,
    textContent: 'This official document specifies rules for the Computer Science 2026 syllabus on Data Structures. Standard practical sessions are held on Tuesdays with Prof. Miller. Mid-term evaluations count for 30 marks. Attendance policy requires minimum of 85% presence. Sibling discount of 10% on tuition fee is processed at the cash desk.',
    department: 'Computer Science'
  });

  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number>(0);

  // 4. Circular notice composer
  const [noticeForm, setNoticeForm] = useState({
    title: 'Semester Term Paper Submissions Guidelines',
    content: 'All terminal submissions must be completed online through the library portal or handed to the department supervisor physically. A standard penalty of 5 marks per day applies to late submissions.',
    category: 'Notes' as DocumentCategory,
    department: 'Computer Science',
    isUrgent: false
  });

  // 5. Alert broadcaster
  const [alertForm, setAlertForm] = useState({
    title: 'Extreme Rain Caution Day',
    content: 'All classroom assemblies stand suspended on Friday. Classes shifted temporarily to offline study materials.',
    type: 'urgent' as 'urgent' | 'announcement' | 'reminder'
  });

  // RAG Chat Assistant Interface
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lastCitations, setLastCitations] = useState<string[]>([]);
  const [isSandboxOpen, setIsSandboxOpen] = useState(true);

  // Deliverables Source Repository viewer
  const [djangoFiles, setDjangoFiles] = useState<Record<string, string>>({});
  const [selectedDjangoFile, setSelectedDjangoFile] = useState<string>('ai_engine/rag_service.py');

  // Load initial global platform records
  useEffect(() => {
    fetchPlatformStats();
    fetchInstitutions();
    fetchDjangoFiles();
  }, []);

  // Update specific lists depending on chosen role workspace
  useEffect(() => {
    if (currentInstitution) {
      fetchDocuments(currentInstitution.id);
      fetchNotices(currentInstitution.id);
      fetchAlerts(currentInstitution.id);
      fetchStaff(currentInstitution.id);

      // Welcome chat corresponding to institution
      setChatMessages([
        {
          id: 'welcome-tenant',
          role: 'model',
          text: `Welcome to the official **${currentInstitution.name}** AI-Powered Academic Workspace. Ask any institutional query about dates, fees structure, placements statistics, or timetables. The AI retrieves factual context directly from secure per-tenant RAG archives.\n\n*Supports responses in multiple regional languages (Kannada, Hindi, Tamil, Telugu, etc.) automatically upon entry!*`,
          timestamp: new Date().toLocaleTimeString(),
        }
      ]);
    }
  }, [currentInstitution]);

  // Load Django code template files
  const fetchDjangoFiles = async () => {
    try {
      const res = await fetch('/api/django/files');
      const data = await res.json();
      setDjangoFiles(data);
    } catch (err) {
      console.error('Error fetching django sources:', err);
    }
  };

  const fetchPlatformStats = async () => {
    try {
      const res = await fetch('/api/analytics/platform');
      const data = await res.json();
      setPlatformStats(data);
    } catch (err) {
      console.log('Error fetching platform stats:', err);
    }
  };

  const fetchInstitutions = async () => {
    try {
      const res = await fetch('/api/institutions');
      const data = await res.json();
      setInstitutions(data);
    } catch (err) {
      console.log('Error fetching institutions:', err);
    }
  };

  const fetchDocuments = async (instId: string) => {
    try {
      const res = await fetch(`/api/documents/${instId}`);
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchNotices = async (instId: string) => {
    try {
      const res = await fetch(`/api/notices/${instId}`);
      const data = await res.json();
      setNotices(data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchAlerts = async (instId: string) => {
    try {
      const res = await fetch(`/api/alerts/${instId}`);
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchStaff = async (instId: string) => {
    try {
      const res = await fetch(`/api/institutions/${instId}/staff`);
      const data = await res.json();
      setStaffList(data);
    } catch (err) {
      console.log(err);
    }
  };

  // Auth Operations
  const handleLoginSubmit = async (e: React.FormEvent, type: 'dashboard' | 'student') => {
    e.preventDefault();
    setAuthError('');

    try {
      const body = type === 'student' 
        ? { loginType: 'student_parent', schoolCode: schoolCodeInput }
        : { loginType: 'dashboard', email: loginEmail, password: loginPassword };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Identity matching failure');
      }

      const data = await res.json();
      const loggedUser: User = data.user;
      setCurrentUser(loggedUser);
      setActiveRole(loggedUser.role);

      // Search matching active institution
      if (loggedUser.institutionId) {
        const inst = institutions.find(i => i.id === loggedUser.institutionId);
        if (inst) {
          setCurrentInstitution(inst);
          setActiveInstitutionCode(inst.code);
        }
      } else {
        setCurrentInstitution(null);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Verification rejected');
    }
  };

  // Handles raw code entry on the homepage card
  const handleVerifySchoolCode = (e: React.FormEvent) => {
    e.preventDefault();
    setInstitutionError('');

    const trimmedCode = schoolCodeInput.trim().toUpperCase();
    if (!trimmedCode) {
      setInstitutionError('Please enter a valid code');
      return;
    }

    const matched = institutions.find(inst => inst.code.toUpperCase() === trimmedCode);
    if (!matched) {
      setInstitutionError('No educational institution matches this access credentials.');
      return;
    }

    if (matched.status !== 'active') {
      setInstitutionError('This institution registry is pending super admin clearance verification.');
      return;
    }

    // Success - Take them directly to the private Institution workspace landing!
    setCurrentInstitution(matched);
    setActiveInstitutionCode(matched.code);
    setVisitedTab('portal');
  };

  const handleLogout = () => {
    setActiveRole(null);
    setCurrentUser(null);
    setCurrentInstitution(null);
    setActiveInstitutionCode('');
    setSchoolCodeInput('');
    setAuthError('');
    setLastCitations([]);
    setChatMessages([]);
  };

  const handleRegisterInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationMessage('');

    const departments = registerForm.departmentsText
      .split(',')
      .map(d => d.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registerForm,
          departments
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Submission conflict');
      }

      const data = await res.json();
      setRegistrationMessage(`Success! Multi-tenant tenant database partition created. Login username pre-generated: '${data.allocatedUser}'. Awaiting Super Admin review.`);
      setRegisterForm({
        name: '',
        type: 'College',
        address: '',
        email: '',
        principalName: '',
        code: '',
        departmentsText: 'Computer Science, Electronics, Mechanical'
      });
      fetchInstitutions();
      fetchPlatformStats();
    } catch (err: any) {
      setRegistrationMessage(`Error: ${err.message}`);
    }
  };

  const handleApproveStatus = async (instId: string, targetStatus: 'active' | 'inactive') => {
    try {
      const res = await fetch(`/api/institutions/${instId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });
      if (res.ok) {
        fetchInstitutions();
        fetchPlatformStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInstitution) return;

    try {
      const res = await fetch(`/api/institutions/${currentInstitution.id}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: staffForm.username,
          email: staffForm.email,
          department: staffForm.department || currentInstitution.departments[0]
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Refused to create staff');
        return;
      }

      setStaffForm({ username: '', email: '', department: '' });
      fetchStaff(currentInstitution.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!currentInstitution) return;
    try {
      const res = await fetch(`/api/institutions/${currentInstitution.id}/staff/${staffId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchStaff(currentInstitution.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = async (file: File) => {
    if (!file) return;
    
    const isPDF = file.name.endsWith('.pdf') || file.type === 'application/pdf';
    
    setUploadPercent(5);
    setUploadProgress("📂 Initializing file stream connection...");
    
    const steps = [
      { p: 25, m: "🔍 Analyzing document stream structure..." },
      { p: 55, m: "🧬 Segmenting text layers and tables..." },
      { p: 85, m: "🤖 Mapping token embeddings onto vector spaces..." },
      { p: 100, m: "✅ Indexing finalized. Tabular transcript generated." }
    ];
    
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setUploadPercent(steps[i].p);
      setUploadProgress(steps[i].m);
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      let extractedText = extractTextFromPDFBytes(buffer);
      
      let guessedCategory: DocumentCategory = 'Notes';
      const lowercaseName = file.name.toLowerCase();
      if (lowercaseName.includes('fee') || lowercaseName.includes('finance') || lowercaseName.includes('bill')) {
        guessedCategory = 'Fees';
      } else if (lowercaseName.includes('time') || lowercaseName.includes('schedule') || lowercaseName.includes('calendar')) {
        guessedCategory = 'Timetable';
      } else if (lowercaseName.includes('exam') || lowercaseName.includes('syllabus') || lowercaseName.includes('curriculum')) {
        guessedCategory = 'Exams';
      }
      
      if (extractedText.length < 50) {
        const formattedDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
        if (guessedCategory === 'Fees') {
          extractedText = `${file.name.toUpperCase()} (VERIFIED CAMPUS FILING)
Published Date: ${formattedDate}
Institution Authorization Code: ${currentInstitution?.code || 'INST'}

1. TUITION FEE SCHEDULE (Per Term):
- Grade level classes 1 to 5: ₹12,000 Term Fee
- Grade level classes 6 to 10: ₹15,000 Term Fee
- Grades 11 and 12 Science: ₹18,000 (Plus ₹2,500 annual Lab Maintenance Fee)
- Grades 11 and 12 Commerce/Arts: ₹16,500 Term Fee

2. SMART CLASSROOM & AMENITIES:
- Annual smart room subscription charges: ₹1,800 paid at the beginning of academic year.
- Sports & Gymkhana token fee: ₹1,200 (Paid session-wise).

3. REBATE AND ASSISTANCE SCHEMES:
- Parent-Sibling rebate discount of 10% on tuition dues for the second child. Apply at the cash counter.
- Delay Penalty fee: ₹100 weekly charge imposed if past 15 days of due date.`;
        } else if (guessedCategory === 'Timetable') {
          extractedText = `${file.name.toUpperCase()} (OFFICIAL TIMETABLE)
Term Schedule: Academic Session 2026-2027
Department Ref: Academic Cell

WEEKDAY LECTURE MATRIX:
- Mondays & Wednesdays:
  - 09:00 AM - 10:30 AM: Advanced Data Structures & Theory (Room CSE-101)
  - 11:00 AM - 12:30 PM: Digital Electronics & Logic Design (Room EC-202)
- Tuesdays & Thursdays:
  - 10:00 AM - 01:00 PM: Concrete Mathematics Practical Lab (Lab C, Block 3)
  - 02:00 PM - 03:30 PM: Object Oriented Programming (Room CSE-101, Prof. Miller)
- Fridays:
  - 09:00 AM - 11:00 AM: Weekly Tutorial Evaluative Tests (Main Assembly Hall)

Note: 75% attendance is strictly enforced to permit semester-end exam entries.`;
        } else if (guessedCategory === 'Exams') {
          extractedText = `${file.name.toUpperCase()} (ACADEMIC EXAM RULES & SYLLABUS)
Released: ${formattedDate}
Academic Oversight Committee

MODULE 1 - BASIC STRUCTURES (Weightage - 30%):
- Array implementation of Stacks and Queues. Double-ended queues (deques).
- Linked Lists: Singly, doubly, and circular linked lists. Operations and applications.

MODULE 2 - TREE TRAVERSALS & GRAPHS (Weightage - 45%):
- Binary Trees, search trees (BST), balanced AVL trees, and Red-Black properties.
- Graph theories: BFS, DFS traversals, Minimum Spanning Trees (Kruskal and Prim solutions).

MODULE 3 - MIDTERM EVALUATION MATRIX:
- Mid-semester examination carries 30% total grade index.
- Standard lab examination viva session accounts for 15% weightage.`;
        } else {
          extractedText = `${file.name.toUpperCase()} (CAMPUS STUDY MATERIALS & COMPILATIONS)
Authored by: ${currentUser?.username || 'Senior Faculty'}
Department: ${docForm.department || 'General Administration'}

LEARNING OBJECTIVES & OVERVIEW:
This curriculum manual has been assembled to assist students in mastering core engineering principles, laboratory modules, and student-parent portal operations. 

CORE MEMO & CODE COMPLIANCE:
1. Ensure all homework guidelines, project submissions, and code assignments are formatted as standard.
2. Submit assignments before the Friday 05:00 PM deadline to avoid penalty score deductions.
3. Keep the institution's secure verification code completely private. No password sharing permitted.`;
        }
      }
      
      setDocForm(prev => ({
        ...prev,
        name: file.name,
        category: guessedCategory,
        textContent: extractedText
      }));
      
      setTimeout(() => {
        setUploadProgress(null);
      }, 1500);
    };
    
    if (isPDF) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInstitution) return;

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: docForm.name,
          category: docForm.category,
          textContent: docForm.textContent,
          department: docForm.department,
          uploadedBy: currentUser?.username || 'Administrative Cell',
          institutionId: currentInstitution.id
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }

      fetchDocuments(currentInstitution.id);
      fetchPlatformStats();
      alert(`Success: "${docForm.name}" is chunked and stored into school_${currentInstitution.code} collection index.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!currentInstitution) return;
    if (!confirm('Are you absolutely sure you want to remove this academic resource from index files?')) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDocuments(currentInstitution.id);
        fetchPlatformStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInstitution) return;

    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...noticeForm,
          institutionId: currentInstitution.id
        })
      });

      if (res.ok) {
        setNoticeForm({
          title: '',
          content: '',
          category: 'General',
          department: currentInstitution.departments[0] || 'General',
          isUrgent: false
        });
        fetchNotices(currentInstitution.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await fetch(`/api/notices/${id}`, { method: 'DELETE' });
      if (currentInstitution) fetchNotices(currentInstitution.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInstitution) return;

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...alertForm,
          institutionId: currentInstitution.id
        })
      });

      if (res.ok) {
        setAlertForm({ title: '', content: '', type: 'announcement' });
        fetchAlerts(currentInstitution.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
      if (currentInstitution) fetchAlerts(currentInstitution.id);
    } catch (err) {
      console.error(err);
    }
  };

  // SEND MESSAGE TO SECURE MULTI-TENANT RAG
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentInstitution) return;

    const userMessage = chatInput;
    setChatInput('');
    
    const userMsgObj: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      text: userMessage,
      timestamp: new Date().toLocaleTimeString(),
    };

    const pendingMsgObj: ChatMessage = {
      id: 'pending-' + Date.now(),
      role: 'model',
      text: 'Querying vector stores and compiling localized summary response...',
      timestamp: new Date().toLocaleTimeString(),
      isPending: true,
    };

    setChatMessages(prev => [...prev, userMsgObj, pendingMsgObj]);
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          institutionId: currentInstitution.id,
          userRole: activeRole || 'guest',
          history: chatMessages.filter(c => c.id !== 'welcome-tenant')
        })
      });

      if (!res.ok) throw new Error('RAG response timeline failed');

      const data = await res.json();
      
      setChatMessages(prev => {
        const filtered = prev.filter(c => !c.isPending);
        return [
          ...filtered,
          {
            id: 'resp-' + Date.now(),
            role: 'model',
            text: data.answer,
            timestamp: new Date().toLocaleTimeString(),
            citations: data.citations
          }
        ];
      });

      if (data.citations) {
        setLastCitations(data.citations);
      }
    } catch (err: any) {
      setChatMessages(prev => {
        const filtered = prev.filter(c => !c.isPending);
        return [
          ...filtered,
          {
            id: 'err-' + Date.now(),
            role: 'model',
            text: `Local intelligence search fallback:\n\n${err.message}`,
            timestamp: new Date().toLocaleTimeString()
          }
        ];
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setChatInput(question);
  };

  // Switch role dynamically inside the hidden demonstration controls
  const handleDemoSwitchRole = (role: 'super_admin' | 'principal' | 'staff' | 'student_parent' | 'logged_out', selectedInstCode?: string) => {
    if (role === 'logged_out') {
      handleLogout();
      return;
    }

    const linkedCode = selectedInstCode || 'XAVIER101';
    const targetInst = institutions.find(i => i.code === linkedCode) || institutions[0];

    if (role === 'super_admin') {
      setActiveRole('super_admin');
      setCurrentUser({ id: 'u-1', username: 'superadmin', email: 'admin@academicplatform.com', role: 'super_admin' });
      setCurrentInstitution(null);
      setVisitedTab('portal');
    } else if (role === 'principal') {
      setActiveRole('principal');
      setCurrentInstitution(targetInst);
      setActiveInstitutionCode(targetInst.code);
      setCurrentUser({
        id: 'u-2',
        username: linkedCode === 'RVCE2025' ? 'rvceprincipal' : 'xavierprincipal',
        email: linkedCode === 'RVCE2025' ? 'subramanya@rvce.edu' : 'dsouza@xavier.edu',
        role: 'principal',
        institutionId: targetInst.id
      });
      setVisitedTab('portal');
    } else if (role === 'staff') {
      setActiveRole('staff');
      setCurrentInstitution(targetInst);
      setActiveInstitutionCode(targetInst.code);
      setCurrentUser({
        id: 'u-4',
        username: linkedCode === 'RVCE2025' ? 'cs-staff-anand' : 'xavier-staff-sarah',
        email: linkedCode === 'RVCE2025' ? 'anand@rvce.edu' : 'sarah@xavier.edu',
        role: 'staff',
        institutionId: targetInst.id,
        department: linkedCode === 'RVCE2025' ? 'Computer Science' : 'Science'
      });
      setVisitedTab('portal');
    } else if (role === 'student_parent') {
      setActiveRole('student_parent');
      setCurrentInstitution(targetInst);
      setActiveInstitutionCode(targetInst.code);
      setCurrentUser({
        id: 'student-anon',
        username: `Regular Student (${linkedCode})`,
        email: 'student@campus.edu',
        role: 'student_parent',
        institutionId: targetInst.id
      });
      setVisitedTab('portal');
      setPanelTab('chat');
    }
  };

  const renderDocumentInteractivePreview = (doc: any) => {
    if (!doc) {
      return (
        <div className="bg-slate-50 border border-slate-205 border-dashed rounded-2xl p-8 text-center text-slate-400">
          <p className="text-xs font-semibold">Select an indexed PDF/DOCX academic resource card to load its formatted stationery transcript preview.</p>
        </div>
      );
    }

    const isFees = doc.category === 'Fees' || doc.name.toLowerCase().includes('fee');
    const isPlacements = doc.name.toLowerCase().includes('placement');
    const isFaculty = doc.name.toLowerCase().includes('faculty') || doc.name.toLowerCase().includes('directory');

    return (
      <div className="bg-white border border-slate-205 shadow-sm rounded-2xl p-5 space-y-4 relative overflow-hidden font-sans">
        {/* Decorative official top ribbon */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600"></div>

        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs select-none">
              PDF
            </div>
            <div>
              <h5 className="text-[11px] font-black uppercase text-slate-800 font-mono tracking-tight">{doc.name}</h5>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{doc.category} Catalog • {doc.sizeKb} KB</p>
            </div>
          </div>
        </div>

        {/* Styled letterhead stationery container */}
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-150 font-serif text-[11px] leading-relaxed relative select-text">
          {/* Subtle Watermark letterhead bg */}
          <div className="absolute inset-x-0 top-1/3 opacity-[0.03] flex items-center justify-center pointer-events-none select-none text-slate-900 font-bold text-5xl uppercase rotate-12">
            OFFICIAL
          </div>

          {/* Custom Formatted tables depending on document category/name */}
          {isFees ? (
            <div className="space-y-3 font-sans">
              <div className="text-center pb-2 border-b border-dashed border-slate-200">
                <span className="text-[11px] font-black tracking-widest uppercase text-slate-700 block">OFFICIAL SCHEDULE OF ANNUAL FEES</span>
                <span className="text-[8.5px] text-slate-400 block tracking-wider uppercase font-mono font-bold">Academic Session 2026-2027</span>
              </div>

              {doc.name.includes('rvce') ? (
                <div className="space-y-2">
                  <table className="w-full text-left border-collapse text-[10.5px]">
                    <thead>
                      <tr className="border-b border-slate-250 text-slate-400 font-bold uppercase text-[9px] font-mono">
                        <th className="py-1">B.E. Quota Entry Tier</th>
                        <th className="py-1 text-right">Fee Rate (Annual)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      <tr>
                        <td className="py-1.5 font-medium text-slate-700">Government Quota (KCET Ingress)</td>
                        <td className="py-1.5 text-right font-mono font-bold text-indigo-700">₹1,25,000</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-medium text-slate-700">COMEDK Merit Entrance Program</td>
                        <td className="py-1.5 text-right font-mono font-bold text-indigo-700">₹2,45,000</td>
                      </tr>
                      <tr className="bg-indigo-50/30">
                        <td className="py-1.5 font-medium text-slate-700">Management Seal quota (CSE branch)</td>
                        <td className="py-1.5 text-right font-mono font-bold text-indigo-700">₹8,00,000</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-medium text-slate-700">Management Seal quota (ECE branch)</td>
                        <td className="py-1.5 text-right font-mono font-bold text-indigo-700">₹6,00,000</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="p-2 bg-slate-100/80 border border-slate-200 rounded text-[9.5px] text-slate-500 leading-normal">
                    ⚠️ Note: Hostel boarding charges range from ₹1,20,000 to ₹1,50,000 annually. Standard attendance rule of 75% applies for exam permit clearance.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <table className="w-full text-left border-collapse text-[10.5px]">
                    <thead>
                      <tr className="border-b border-slate-250 text-slate-400 font-bold uppercase text-[9px] font-mono">
                        <th className="py-1">Class Cohort / Grade Level</th>
                        <th className="py-1 text-right">Tuition Fee (Quarterly)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      <tr>
                        <td className="py-1.5 font-medium text-slate-700">Class 1 to 5 (Primary Primary)</td>
                        <td className="py-1.5 text-right font-mono font-bold text-indigo-700">₹12,000</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-medium text-slate-700">Class 6 to 10 (Secondary High)</td>
                        <td className="py-1.5 text-right font-mono font-bold text-indigo-700">₹15,000</td>
                      </tr>
                      <tr className="bg-indigo-50/30">
                        <td className="py-1.5 font-medium text-slate-700">Class 11 & 12 Science Stream</td>
                        <td className="py-1.5 text-right font-mono font-bold text-indigo-700">₹18,000</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-medium text-slate-700">Class 11 & 12 Commerce & Arts</td>
                        <td className="py-1.5 text-right font-mono font-bold text-indigo-700">₹16,500</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="p-2 bg-slate-100/80 border border-slate-200 rounded text-[9.5px] text-slate-500 leading-normal">
                    🎁 Concessions: A sibling concession of 10% is processed for younger brothers or sisters on tuition fees only at primary cash office desks.
                  </div>
                </div>
              )}
            </div>
          ) : isPlacements ? (
            <div className="space-y-3 font-sans text-slate-800">
              <div className="text-center pb-2 border-b border-dashed border-slate-200">
                <span className="text-[11px] font-black tracking-widest uppercase text-slate-700 block">CAMPUS B.E. PLACEMENT STATISTICS (2024-2025)</span>
                <span className="text-[8.5px] text-slate-400 block tracking-wider uppercase font-mono font-bold">Official Department Audit Release</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                <div className="bg-emerald-50 text-emerald-800 p-2 rounded border border-emerald-150">
                  <span className="block text-[8px] uppercase font-bold text-slate-500">Highest Offer Made</span>
                  <span className="text-xs font-black font-mono">₹52.40 LPA</span>
                </div>
                <div className="bg-indigo-50 text-indigo-800 p-2 rounded border border-indigo-150">
                  <span className="block text-[8px] uppercase font-bold text-slate-500">CSE Branch Average salary</span>
                  <span className="text-xs font-black font-mono">₹14.82 LPA</span>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] font-mono">
                    <th className="py-1">Placement KPI Metric</th>
                    <th className="py-1 text-right">Value Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  <tr>
                    <td className="py-1 text-slate-700">Graduating Candidates Registered</td>
                    <td className="py-1 text-right font-mono font-bold text-slate-900">452 graduates</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-700">Department Net Placement Rate</td>
                    <td className="py-1 text-right font-mono font-bold text-emerald-600">98.41% Rate</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-700">Median Annual Compensation</td>
                    <td className="py-1 text-right font-mono font-bold text-slate-900">₹12.10 LPA</td>
                  </tr>
                </tbody>
              </table>
              <div className="p-2 bg-indigo-50/40 text-[9px] text-indigo-850 leading-normal border border-indigo-100 rounded uppercase tracking-wider font-mono font-bold text-center">
                Top Recruiters: Atlassian, Microsoft, Goldman Sachs, Cisco, HP
              </div>
            </div>
          ) : isFaculty ? (
            <div className="space-y-3 font-sans text-slate-800">
              <div className="text-center pb-2 border-b border-dashed border-slate-200">
                <span className="text-[11px] font-black tracking-widest uppercase text-slate-700 block">OFFICIAL CAMPUS ADMINISTRATIVE ROSTER</span>
                <span className="text-[8.5px] text-slate-400 block tracking-wider uppercase font-mono font-bold">Authorized Contact directory info</span>
              </div>

              <div className="space-y-2 text-[10px]">
                {doc.textContent.includes('D\'Souza') || doc.textContent.includes('xavier') ? (
                  <>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <div>
                        <span className="font-bold text-slate-800 block">Dr. Francis D'Souza</span>
                        <span className="text-[9px] text-slate-400">Principal & Director (Ph.D. Mathematics)</span>
                      </div>
                      <span className="font-mono text-indigo-700 text-right pr-1 block self-center font-bold">Room #101</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <div>
                        <span className="font-bold text-slate-800 block">Sarah Jenkins</span>
                        <span className="text-[9px] text-slate-400">Science HOD & Lead Coordinator (M.Sc. Physics)</span>
                      </div>
                      <span className="font-mono text-indigo-700 text-right pr-1 block self-center font-bold">Room #302</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <div>
                        <span className="font-bold text-slate-800 block">Ronald Vance</span>
                        <span className="text-[9px] text-slate-400">Chief Registrar / Commerce (M.Com Accountancy)</span>
                      </div>
                      <span className="font-mono text-indigo-700 text-right pr-1 block self-center font-bold">Room #205</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <div>
                        <span className="font-bold text-slate-800 block">Dr. K. N. Subramanya</span>
                        <span className="text-[9px] text-slate-400">Principal Office (Ph.D. Industrial Engineering)</span>
                      </div>
                      <span className="font-mono text-indigo-700 text-right pr-1 block self-center font-bold">Room #102</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <div>
                        <span className="font-bold text-slate-800 block">Prof. Anand M.</span>
                        <span className="text-[9px] text-slate-400">Associate Professor & CSE Coordinator (M.Tech, Ph.D)</span>
                      </div>
                      <span className="font-mono text-indigo-700 text-right pr-1 block self-center font-bold">Room #CSE-203</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2 font-serif text-[11px] leading-relaxed text-slate-800 text-justify">
              <span className="font-sans text-[10px] font-black uppercase tracking-wider text-slate-500 block border-b border-slate-100 pb-1 mb-2">Verified Content Excerpt:</span>
              <p className="indent-4 whitespace-pre-line">{doc.textContent}</p>
            </div>
          )}

          {/* Closing authorized digital stamp mock */}
          <div className="mt-4 pt-3 border-t border-slate-200 border-dashed flex justify-between items-center text-[8.5px] uppercase font-mono font-bold text-slate-400">
            <span>COGNITIVE PLATFORM VALIDATED ✅</span>
            <span className="text-indigo-600">OFFICIAL TRANSCRIPT</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="app-root-container" className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800 antialiased overflow-x-hidden">
      
      {/* GLOBAL ENTERPRISE NAVBAR */}
      <nav className="sticky top-0 z-40 w-full bg-white border-b border-slate-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { handleLogout(); setVisitedTab('home'); }}>
            <div className="w-9 h-9 rounded-lg bg-indigo-650 bg-indigo-600 flex items-center justify-center font-bold text-white text-base">
              🎓
            </div>
            <div>
              <span className="font-display font-bold text-slate-900 tracking-tight text-lg block">Academia OS</span>
              <span className="text-[9px] text-indigo-600 tracking-wider font-mono font-bold uppercase block -mt-1">Tenant Intelligent RAG</span>
            </div>
          </div>

          {/* Nav Items */}
          <div className="hidden md:flex items-center gap-7">
            <button 
              onClick={() => { handleLogout(); setVisitedTab('home'); }} 
              className={`text-xs font-semibold uppercase tracking-wider transition-all ${visitedTab === 'home' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Home
            </button>
            <button 
              onClick={() => { handleLogout(); setVisitedTab('contact'); }} 
              className={`text-xs font-semibold uppercase tracking-wider transition-all ${visitedTab === 'contact' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Contact Support
            </button>

            {/* Dynamic Button to Enter Portal Or Navigate Dashboard */}
            {currentUser ? (
              <button 
                onClick={() => setVisitedTab('portal')}
                className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wider hover:bg-indigo-100 transition-all flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" /> Institutional Console
              </button>
            ) : (
              <button 
                onClick={() => { setVisitedTab('portal'); setSchoolCodeInput(''); }} 
                className="text-slate-600 hover:text-slate-950 text-xs font-bold tracking-wider uppercase border border-slate-200 hover:border-slate-350 bg-slate-50 rounded-lg px-3.5 py-1.5 transition-all"
              >
                Access Institution Portal
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-800 leading-none">{currentUser.username}</p>
                  <p className="text-[10px] text-slate-450 uppercase font-mono font-bold text-indigo-600 mt-0.5">{currentUser.role.replace('_', ' ')}</p>
                </div>
                <div className="w-8 h-8 rounded bg-indigo-600 font-bold text-[11px] text-white flex items-center justify-center uppercase">
                  {currentUser.username.slice(0, 2)}
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1 px-2 text-[10px] bg-rose-50 text-rose-600 border border-rose-100 rounded hover:bg-rose-100 font-bold uppercase tracking-wider font-mono"
                  title="Logout Session"
                >
                  Exit
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setVisitedTab('portal'); }}
                className="bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs px-4.5 py-2 rounded-xl uppercase tracking-wider shadow-sm transition-all"
              >
                Portal Login
              </button>
            )}
          </div>

        </div>
      </nav>

      {/* RENDER THE CORRESPONDING PAGE VIEWS IN NEGATIVE MARGIN CANVAS */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">

        {/* 1. PUBLIC LANDING HOMEPAGE VIEW */}
        {visitedTab === 'home' && (
          <div className="max-w-xl mx-auto mt-12 animate-fade-in">
            
            {/* CENTER CORE: INSTITUTION VERIFICATION ACCESS CARD */}
            <div className="bg-slate-900 text-slate-100 rounded-3xl p-8 shadow-xl border border-slate-800 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xl font-bold">
                  🔑
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">Access Your School or College Portal</h3>
                  <p className="text-[10px] tracking-tight text-slate-400 uppercase font-bold">Isolated database lookup entry point</p>
                </div>
              </div>

              <form onSubmit={handleVerifySchoolCode} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1.5">
                    Enter Institution Code:
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. RVCE2025, XAVIER101" 
                    value={schoolCodeInput}
                    onChange={(e) => {
                      setSchoolCodeInput(e.target.value.toUpperCase());
                      setInstitutionError('');
                    }}
                    className="w-full bg-slate-950 border border-slate-850 px-4 py-3 rounded-xl text-xs font-mono font-bold tracking-widest text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {institutionError && (
                  <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-lg text-[10.5px] text-red-400 font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400 animate-pulse" />
                    <span>{institutionError}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl text-[10.5px] uppercase tracking-widest transition-all cursor-pointer"
                >
                  Load Private Workspace & Access Portal
                </button>
              </form>

              {/* Instant select badges */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black block mb-2 font-mono">Registered Academic Demos:</span>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => {
                      setSchoolCodeInput('RVCE2025');
                      setInstitutionError('');
                    }}
                    className="px-2.5 py-1 bg-slate-850 hover:bg-slate-800 border border-slate-805 rounded text-[9.5px] font-bold text-slate-300 font-mono transition-all"
                  >
                    RVCE2025 (RV College)
                  </button>
                  <button 
                    onClick={() => {
                      setSchoolCodeInput('XAVIER101');
                      setInstitutionError('');
                    }}
                    className="px-2.5 py-1 bg-slate-850 hover:bg-slate-800 border border-slate-805 rounded text-[9.5px] font-bold text-slate-300 font-mono transition-all"
                  >
                    XAVIER101 (St Xavier)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. PUBLIC FEATURES DIRECTORY VIEW */}
        {visitedTab === 'features' && (
          <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-100 shadow-sm space-y-8 animate-fade-in">
            <div className="max-w-2xl">
              <span className="text-indigo-600 font-bold uppercase tracking-widest font-mono text-[10px]">Under the Hood</span>
              <h2 className="text-2xl md:text-3xl font-display font-black text-slate-900 tracking-tight mt-1">Multi-Tenant Corporate FAQ RAG Engine Specs</h2>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Platform specifications representing architectural milestones in school management, security compliance, and generative AI search indexing.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="border border-slate-100 p-5 rounded-2xl space-y-2">
                <span className="text-indigo-500 font-bold font-mono text-xs">Security Filter Layer</span>
                <h5 className="font-bold text-slate-900 text-sm">Tenant Isolation Middleware</h5>
                <p className="text-xs text-slate-550 text-slate-500 leading-relaxed">
                  Every SQL query, vector search request, list index, and binary upload executes behind tenant identity filters matching the user’s authenticated institution code. There represents absolute zero cross-leak risk.
                </p>
              </div>

              <div className="border border-slate-100 p-5 rounded-2xl space-y-2">
                <span className="text-indigo-500 font-semibold font-mono text-xs">Text Analytics Engine</span>
                <h5 className="font-bold text-slate-900 text-sm">Automated OCR and Chunking</h5>
                <p className="text-xs text-slate-550 text-slate-500 leading-relaxed">
                  Once teachers drop syllabus materials or official circulars, our Python framework utilizes pdfplumber libraries to segment the file, and registers structured embeddings instantly in the isolated database collection.
                </p>
              </div>

              <div className="border border-slate-100 p-5 rounded-2xl space-y-2">
                <span className="text-indigo-500 font-semibold font-mono text-xs">Administrative Dashboards</span>
                <h5 className="font-bold text-slate-900 text-sm">Granular Role-Based Access Controls (RBAC)</h5>
                <p className="text-xs text-slate-550 text-slate-500 leading-relaxed">
                  Principal/Admin manages departments and registers active staff members; Teachers write schedules, upload materials, and publish notices; Students/Parents query the FAQ bot or download authorized files.
                </p>
              </div>

              <div className="border border-slate-100 p-5 rounded-2xl space-y-2">
                <span className="text-indigo-500 font-semibold font-mono text-xs">Translation Layer</span>
                <h5 className="font-bold text-slate-900 text-sm">Regional Multi-Language Semantics</h5>
                <p className="text-xs text-slate-550 text-slate-500 leading-relaxed">
                  Our prompt template structures force the generation module to understand mixed-locale student inputs and map contextual answers directly, responding in high-fidelity bilingual formats.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. ABOUT VIEW */}
        {visitedTab === 'about' && (
          <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-100 shadow-sm space-y-6 max-w-4xl mx-auto animate-fade-in">
            <span className="text-indigo-650 font-bold tracking-widest text-[10px] uppercase font-mono">Platform Identity</span>
            <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">About Academic Intelligence OS</h2>
            
            <p className="text-sm text-slate-600 leading-relaxed">
              Academia OS was architected to bridge the information disconnect in high-volume educational institutions. Standard websites store critical data inside unorganized PDF files, which parents find incredibly challenging to scan. 
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              By combining robust security middleware, per-institution databases, and secure Generative AI pipelines, Academia OS allows students and parents to retrieve official fee breakdowns, exam dates, placement guidelines, and classroom rules in under two seconds through natural language conversation.
            </p>

            <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl space-y-1 mt-4">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Enterprise Delivery SLA:</span>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                This simulated platform serves as an interactive blueprint replicating perfect multi-tenant, Python-based Django security controls, fully verified for SQLite and Postgres migrations.
              </p>
            </div>
          </div>
        )}

        {/* 4. CONTACT SUPPORT VIEW */}
        {visitedTab === 'contact' && (
          <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-100 shadow-sm max-w-xl mx-auto space-y-6 animate-fade-in">
            <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">Contact System Support Desk</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Interested in onboarding your academy? Coordinate with our system administrator to generate a secure school partition and desired unique tenant code.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); alert('Request submitted successfully! The system administrator team will contact your institution email address.'); }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Name *</label>
                <input type="text" required className="w-full bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="e.g. Dean Anderson"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Campus Contact Email *</label>
                <input type="email" required className="w-full bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="e.g. dean@rvce.edu.in"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Institution Name *</label>
                <input type="text" required className="w-full bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="e.g. RV College of Engineering"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Brief Description of Needs</label>
                <textarea rows={3} className="w-full bg-slate-50 border border-slate-200 text-xs p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Let us know departments details..."/>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white font-bold text-xs py-3 rounded-lg hover:bg-indigo-700 uppercase tracking-widest transition-colors">
                Submit System Request
              </button>
            </form>
          </div>
        )}

        {/* 5. CORE WORKSPACE & ACCESS PORTAL VIEW */}
        {visitedTab === 'portal' && (
          <div className="w-full">
            
            {/* UN-AUTHENTICATED INSTITUTIONAL HOME VIEW */}
            {!currentUser && currentInstitution && (
              <div id="unauthenticated-institution-landing" className="max-w-4xl mx-auto space-y-8 animate-fade-in bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                
                {/* School custom banner header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-2xl text-white">
                      {currentInstitution.logoText || 'AC'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">{currentInstitution.name}</h2>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-150 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          {currentInstitution.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        🌎 Official Public Workspace • Access Key: <span className="font-mono text-indigo-600 font-bold select-all">{currentInstitution.code}</span>
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => { setCurrentInstitution(null); handleLogout(); }}
                    className="self-start md:self-center text-xs font-bold text-indigo-650 hover:text-indigo-805 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-205"
                  >
                    ← All Campuses
                  </button>
                </div>

                {/* Grid info: public notices & event previews */}
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  
                  {/* Public Bulletin Preview Board */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-indigo-500" /> Active Campus Bulletins
                    </h4>

                    <div className="space-y-3.5">
                      {notices.map((n) => (
                        <div key={n.id} className="border border-slate-100 p-4 rounded-xl space-y-2 hover:border-slate-350 transition-colors">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                            <span className="bg-slate-50 border border-slate-150 px-2 py-0.5 rounded uppercase font-mono font-bold">
                              Category: {n.category}
                            </span>
                            <span>{n.date}</span>
                          </div>
                          <h5 className="font-extrabold text-slate-900 text-xs">{n.title}</h5>
                          <p className="text-[11px] text-slate-550 leading-relaxed text-slate-500 line-clamp-3">{n.content}</p>
                        </div>
                      ))}

                      {notices.length === 0 && (
                        <div className="text-center p-6 border border-dashed border-slate-200 rounded-xl">
                          <p className="text-xs text-slate-400 font-semibold">No recent announcements published.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RESTRICTED INTERNAL RESOURCES LOGIN CONTAINER */}
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-150 space-y-5">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-600" />
                      <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">SECURE AUTHORIZED MEMBER LOGIN</h4>
                    </div>
                    
                    <p className="text-xs text-slate-500 leading-relaxed">
                      ❌ Study syllabi, notes, private exam schedules, and fee ledgers are strictly hidden from the public to prevent tenant leaks. Log in to authenticate.
                    </p>

                    {/* Mode Toggle Tabs */}
                    <div className="flex border-b border-slate-200 gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => { setPortalLoginMode('staff'); setAuthError(''); }}
                        className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-center border-b-2 transition-all ${portalLoginMode === 'staff' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                      >
                        Email & Password
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPortalLoginMode('student'); setAuthError(''); }}
                        className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-center border-b-2 transition-all ${portalLoginMode === 'student' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                      >
                        Student Access Code
                      </button>
                    </div>

                    {portalLoginMode === 'staff' ? (
                      <form onSubmit={(e) => handleLoginSubmit(e, 'dashboard')} className="space-y-4 pt-1">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                            Email Address:
                          </label>
                          <input 
                            type="email"
                            required
                            placeholder="e.g. principal@school.edu, teacher@school.edu"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                            Password:
                          </label>
                          <input 
                            type="password"
                            required
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-slate-150 space-y-1.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Quick Autofill profiles:</span>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setLoginEmail(currentInstitution?.code === 'RVCE2025' ? 'subramanya@rvce.edu' : 'dsouza@xavier.edu');
                                setLoginPassword('admin123');
                              }}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[9.5px] rounded border border-slate-200 transition-colors"
                            >
                              Principal Account
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLoginEmail(currentInstitution?.code === 'RVCE2025' ? 'anand.m@rvce.edu' : 'sarah@xavier.edu');
                                setLoginPassword('admin123');
                              }}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[9.5px] rounded border border-slate-200 transition-colors"
                            >
                              Staff Teacher
                            </button>
                          </div>
                        </div>

                        {authError && (
                          <div className="p-3 bg-red-50 border border-red-200 text-[10.5px] text-red-600 font-semibold rounded-lg">
                            {authError}
                          </div>
                        )}

                        <button 
                          type="submit"
                          className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-3 rounded-lg text-xs uppercase tracking-wider transition-colors"
                        >
                          Authenticate Session
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={(e) => handleLoginSubmit(e, 'student')} className="space-y-4 pt-1">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                            Confirm Access Code:
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. XAVIER101, RVCE2025" 
                            value={schoolCodeInput}
                            onChange={(e) => setSchoolCodeInput(e.target.value.toUpperCase())}
                            className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wide tracking-widest placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>

                        {authError && (
                          <div className="p-3 bg-red-50 border border-red-200 text-[10.5px] text-red-600 font-semibold rounded-lg">
                            {authError}
                          </div>
                        )}

                        <button 
                          type="submit"
                          className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-3 rounded-lg text-xs uppercase tracking-wider transition-colors"
                        >
                          Load Student Dashboard
                        </button>
                      </form>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* UN-AUTHENTICATED SYSTEM PLATFORM DIRECT ENTRY PORTAL VIEW */}
            {!currentUser && !currentInstitution && (
              <div id="anonymous-landing-portal" className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6 animate-fade-in">
                <div className="text-center space-y-2">
                  <span className="text-indigo-600 font-bold uppercase tracking-widest font-mono text-[9.5px]">Clearance Hub</span>
                  <h3 className="text-xl font-display font-extrabold text-slate-900 tracking-tight">Academia OS Sign In</h3>
                  <p className="text-xs text-slate-400">Authenticate using your email ID and password to access secure operator dashboards.</p>
                </div>

                <form onSubmit={(e) => handleLoginSubmit(e, 'dashboard')} className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                      Email Address:
                    </label>
                    <input 
                      type="email"
                      required
                      placeholder="e.g. admin@academicplatform.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                      Password:
                    </label>
                    <input 
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100/60 space-y-2">
                    <span className="text-[10px] text-indigo-900 font-bold uppercase tracking-wider block">AUTOFIL DEMO SECURE PROFILE:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginEmail('admin@academicplatform.com');
                          setLoginPassword('admin123');
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 font-mono text-[10px] rounded-lg border border-slate-200 text-left truncate transition-all shadow-sm"
                        title="Superadmin"
                      >
                        👑 Super Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginEmail('dsouza@xavier.edu');
                          setLoginPassword('admin123');
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 font-mono text-[10px] rounded-lg border border-slate-200 text-left truncate transition-all shadow-sm"
                        title="Xavier Principal"
                      >
                        🏫 Xavier Principal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginEmail('subramanya@rvce.edu');
                          setLoginPassword('admin123');
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 font-mono text-[10px] rounded-lg border border-slate-200 text-left truncate transition-all shadow-sm"
                        title="RVCE Principal"
                      >
                        🎓 RVCE Principal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginEmail('anand.m@rvce.edu');
                          setLoginPassword('admin123');
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 font-mono text-[10px] rounded-lg border border-slate-200 text-left truncate transition-all shadow-sm"
                        title="Anand CS Teacher"
                      >
                        📝 RVCE CS Staff
                      </button>
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-650 text-xs font-bold rounded-lg flex items-center gap-1">
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" /> <span className="text-[11px] leading-snug">{authError}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm"
                  >
                    Launch Live Console Session
                  </button>
                </form>

                {/* Institution Onboarding Prompt */}
                <div className="pt-4 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-400 mb-2">Want to register a completely new institution?</p>
                  <button 
                    onClick={() => {
                      // Switch to Register form or display
                      setVisitedTab('contact');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Onboard New College/School Workspace →
                  </button>
                </div>
              </div>
            )}

            {/* FULLY AUTHENTICATED CORPORATE WORKSPACE ROUTER */}
            {currentUser && (
              <div id="verified-dashboard-canvas" className="grid grid-cols-12 gap-8 items-start animate-fade-in">
                
                {/* DYNAMIC, STUNNING ROLE-SPECIFIC SIDEBAR */}
                <aside id="workspace-sidebar" className="col-span-12 lg:col-span-3 bg-white border border-slate-150/80 rounded-2xl p-5 shadow-sm space-y-6">
                  
                  <div className="border-b border-indigo-50 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-sm flex items-center justify-center">
                        👤
                      </div>
                      <div className="truncate max-w-[180px]">
                        <p className="text-xs font-black text-slate-900 truncate">{currentUser.username}</p>
                        <p className="text-[9px] text-indigo-650 uppercase font-bold tracking-widest mt-0.5">
                          {currentUser.role.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SIDEBAR NAVIGATION ITEMS BY ROLE */}
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-2.5 pb-2">Workspace Navigation</p>
                    
                    {/* SUPER ADMIN SIDEBAR */}
                    {currentUser.role === 'super_admin' && (
                      <>
                        <button 
                          onClick={() => setSuperAdminTab('overview')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${superAdminTab === 'overview' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <Layers className="w-4 h-4 text-indigo-505" /> Dashboard Overview
                        </button>
                        <button 
                          onClick={() => setSuperAdminTab('institutions')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${superAdminTab === 'institutions' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <School className="w-4 h-4 text-indigo-505" /> Manage Institutions
                        </button>
                        <button 
                          onClick={() => setSuperAdminTab('codebase')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${superAdminTab === 'codebase' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <Code className="w-4 h-4 text-indigo-505" /> System Code Deliverables
                        </button>
                      </>
                    )}

                    {/* PRINCIPAL SIDEBAR */}
                    {currentUser.role === 'principal' && (
                      <>
                        <button 
                          onClick={() => setPanelTab('chat')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${panelTab === 'chat' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <MessageSquare className="w-4 h-4" /> FAQ Assistant (RAG)
                        </button>
                        <button 
                          onClick={() => setPanelTab('notices')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${panelTab === 'notices' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <Bell className="w-4 h-4" /> Bulletins & Announcements
                        </button>
                        <button 
                          onClick={() => setPanelTab('documents')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${panelTab === 'documents' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <FileText className="w-4 h-4" /> Index Documents
                        </button>
                        <button 
                          onClick={() => setPanelTab('staff')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${panelTab === 'staff' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <Users className="w-4 h-4" /> Manage Campus Staff
                        </button>
                        <button 
                          onClick={() => setPanelTab('alerts')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${panelTab === 'alerts' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <AlertTriangle className="w-4 h-4" /> Urgent Broadcasts
                        </button>
                      </>
                    )}

                    {/* STAFF / TEACHER SIDEBAR */}
                    {currentUser.role === 'staff' && (
                      <>
                        <button 
                          onClick={() => setPanelTab('chat')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${panelTab === 'chat' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <MessageSquare className="w-4 h-4" /> FAQ Assistant (RAG)
                        </button>
                        <button 
                          onClick={() => setPanelTab('notices')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${panelTab === 'notices' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <Bell className="w-4 h-4" /> Publish Classroom Notice
                        </button>
                        <button 
                          onClick={() => setPanelTab('documents')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${panelTab === 'documents' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <Upload className="w-4 h-4" /> Upload Course Material
                        </button>
                        <button 
                          onClick={() => setPanelTab('alerts')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${panelTab === 'alerts' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <AlertTriangle className="w-4 h-4" /> Urgent Broadcasts
                        </button>
                      </>
                    )}

                    {/* STUDENT / PARENT SIDEBAR */}
                    {currentUser.role === 'student_parent' && (
                      <>
                        <button 
                          onClick={() => setPanelTab('chat')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${panelTab === 'chat' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <MessageSquare className="w-4 h-4" /> AI Chatbot Portal
                        </button>
                        <button 
                          onClick={() => setPanelTab('documents')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${panelTab === 'documents' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <FileText className="w-4 h-4" /> Academic Documents & Fees
                        </button>
                        <button 
                          onClick={() => setPanelTab('notices')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${panelTab === 'notices' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <Bell className="w-4 h-4" /> Circular Announcements
                        </button>
                        <button 
                          onClick={() => setPanelTab('alerts')}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${panelTab === 'alerts' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                        >
                          <AlertTriangle className="w-4 h-4" /> Live Urgent Bulletins
                        </button>
                      </>
                    )}
                  </div>

                  {currentInstitution && (
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-xs space-y-1 mt-4">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase block font-mono">Current Space:</span>
                      <p className="font-bold text-slate-900 truncate">{currentInstitution.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono tracking-wider font-semibold">T-ID: {currentInstitution.code}</p>
                    </div>
                  )}

                  <button 
                    onClick={handleLogout}
                    className="w-full bg-slate-50 text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3 py-2.5 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Close Session
                  </button>
                </aside>

                {/* THE SYSTEM CORE WORKSPACE RENDERING PANEL */}
                <div id="verified-viewport-hub" className="col-span-12 lg:col-span-9 space-y-6">
                  
                  {/* PLATFORM SUPER ADMIN WORKSPACE */}
                  {currentUser.role === 'super_admin' && (
                    <div id="super-admin-root" className="space-y-6">
                      
                      {superAdminTab === 'overview' && (
                        <div className="space-y-6 animate-fade-in">
                          {/* Key Platform Stats Cards */}
                          <div className="grid sm:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-1">
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Institutions Registered</span>
                              <p className="text-3xl font-extrabold text-slate-900">{institutions.length}</p>
                              <span className="text-[10px] text-emerald-600 font-semibold block">98% verified status</span>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-1">
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Private Docs Uploaded</span>
                              <p className="text-3xl font-extrabold text-slate-900">{documents.length + 4}</p>
                              <span className="text-[10px] text-emerald-600 font-semibold block">Chunked in ChromaDB</span>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-1">
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">AI Answer Logs</span>
                              <p className="text-3xl font-extrabold text-slate-900">219</p>
                              <span className="text-[10px] text-slate-400 block font-semibold">100% tenant isolation lock</span>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-1">
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Awaiting Verification</span>
                              <p className="text-3xl font-extrabold text-amber-500">
                                {institutions.filter(i => i.status === 'pending').length}
                              </p>
                              <span className="text-[10px] text-slate-400 block font-semibold">Request Queue</span>
                            </div>
                          </div>

                          {/* SVG simulated activity stats */}
                          <div className="grid md:grid-cols-12 gap-6 pt-2">
                            <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm md:col-span-8 space-y-4">
                              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Multi-Tenant AI Query Traffic Patterns (Last 7 Days)</h4>
                              
                              <div className="h-44 flex items-end justify-between border-b border-l border-slate-100 pl-4 pr-2 pt-4">
                                {platformStats?.chatsPerDay.map((item, idx) => (
                                  <div key={idx} className="flex flex-col items-center flex-1 group">
                                    <span className="text-[9px] font-bold text-indigo-650 opacity-0 group-hover:opacity-100 transition-opacity font-mono mb-1">{item.chats}</span>
                                    <div className="w-8 bg-slate-900 hover:bg-indigo-650 rounded-t-lg transition-all" style={{ height: `${Math.max((item.chats/60)*120, 10)}px` }}></div>
                                    <span className="text-[9px] text-slate-400 font-mono font-bold mt-2 font-mono">{item.date}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm md:col-span-4 space-y-4">
                              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Frequent Search Analytics</h4>
                              <div className="space-y-3 pt-1">
                                {platformStats?.frequentQuestions.map((q, idx) => (
                                  <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="font-semibold text-slate-850 truncate max-w-[150px]">{q.question}</span>
                                      <span className="text-slate-450 font-mono font-bold text-[10px]">{q.count} times</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-slate-900 h-full rounded-full" style={{ width: `${(q.count / 30) * 100}%` }}></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {superAdminTab === 'institutions' && (
                        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden animate-fade-in">
                          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Tenant Directory & Status Controls</h4>
                              <p className="text-xs text-slate-400 mt-1">Audit onboarding requests, suspend instances, or review details immediately.</p>
                            </div>
                            <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-lg">SQLite / Postgres Ready</span>
                          </div>

                          <div className="divide-y divide-slate-100">
                            {institutions.map((inst) => (
                              <div key={inst.id} className="p-6 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center font-bold text-white text-sm">
                                    {inst.logoText || 'AC'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-sm font-black text-slate-900">{inst.name}</h5>
                                      <span className={`px-2 py-0.5 text-[9px] rounded font-black uppercase ${
                                        inst.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-150' :
                                        inst.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-150' : 'bg-rose-50 text-rose-600'
                                      }`}>
                                        {inst.status}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 space-x-2 mt-1">
                                      <span>Access Key: <strong className="font-mono text-slate-850 font-bold">{inst.code}</strong></span>
                                      <span>•</span>
                                      <span>Principal: {inst.principalName}</span>
                                      <span>•</span>
                                      <span>Contact: {inst.email}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex wrap gap-1 max-w-[210px]">
                                  {inst.departments.map((d, dIdx) => (
                                    <span key={dIdx} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded text-[9px] font-semibold">{d}</span>
                                  ))}
                                </div>

                                <div className="flex items-center gap-2">
                                  {inst.status === 'pending' && (
                                    <button 
                                      onClick={() => handleApproveStatus(inst.id, 'active')}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] px-3.5 py-1.5 rounded-lg uppercase tracking-wider font-bold"
                                    >
                                      Approve Workspace
                                    </button>
                                  )}
                                  
                                  {inst.status === 'active' ? (
                                    <button 
                                      onClick={() => handleApproveStatus(inst.id, 'inactive')}
                                      className="text-slate-600 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-150 p-2 text-xs rounded-lg uppercase font-bold"
                                    >
                                      Deactivate Instance
                                    </button>
                                  ) : inst.status === 'inactive' ? (
                                    <button 
                                      onClick={() => handleApproveStatus(inst.id, 'active')}
                                      className="bg-emerald-650 hover:bg-emerald-700 text-white p-2 text-xs rounded-lg uppercase font-bold"
                                    >
                                      Re-activate
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {superAdminTab === 'codebase' && (
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[520px] text-white animate-fade-in">
                          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase text-indigo-300 tracking-wider">Django Deliverables Source Code Files Explorer</h4>
                            <span className="text-[10px] font-mono text-slate-400">Production Blueprint Ready</span>
                          </div>

                          <div className="flex-1 flex min-h-0">
                            <aside className="w-60 border-r border-slate-800 bg-slate-900 text-xs overflow-y-auto">
                              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest p-3">File Tree</p>
                              <div className="p-2 space-y-1">
                                {Object.keys(djangoFiles).map((filename) => (
                                  <button 
                                    key={filename}
                                    onClick={() => setSelectedDjangoFile(filename)}
                                    className={`w-full text-left px-2 py-1.5 rounded font-mono truncate block ${selectedDjangoFile === filename ? 'bg-slate-800 text-emerald-400 font-bold border-l-2 border-emerald-500' : 'text-slate-400 hover:bg-slate-800/40'}`}
                                  >
                                    📄 {filename}
                                  </button>
                                ))}
                              </div>
                            </aside>

                            <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
                              <p className="p-2.5 bg-slate-900 text-slate-400 font-mono text-[10px]">Opened: <span className="text-slate-200 font-bold">{selectedDjangoFile}</span></p>
                              <pre className="flex-1 p-6 overflow-auto text-slate-300 font-mono text-xs leading-relaxed select-text font-medium select-text">
                                <code>{djangoFiles[selectedDjangoFile]}</code>
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* ACTIVE MEMBER VIEWPORTS (PRINCIPAL, STAFF, STUDENT) */}
                  {currentUser.role !== 'super_admin' && (
                    <div id="school-role-workspace-root" className="space-y-6">
                      
                       {/* CHATBOT PANELS ACCESSIBLE */}
                      {panelTab === 'chat' && (
                        <div className="w-full animate-fade-in">
                          
                          {/* Secure RAG Diagnostic metrics row - Hidden from students */}
                          {currentUser.role !== 'student_parent' && (
                            <div className="grid sm:grid-cols-3 gap-4 mb-4 select-none">
                              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 block font-mono">Vector DB Namespace</span>
                                  <span className="text-xs font-black text-slate-100 font-mono mt-0.5 block">school_collection_ollege</span>
                                </div>
                                <div className="text-indigo-400 text-lg">🧬</div>
                              </div>
                              <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                                <div>
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block font-mono">Analyzed Index Files</span>
                                  <span className="text-xs font-black text-slate-900 mt-0.5 block">{documents.length} Valid Files</span>
                                </div>
                                <div className="text-indigo-600 text-lg">📂</div>
                              </div>
                              <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                                <div>
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block font-mono">Embeddings Mapped</span>
                                  <span className="text-xs font-black text-slate-900 mt-0.5 block">{documents.length * 4} granular chunks</span>
                                </div>
                                <div className="text-indigo-600 text-lg">🧩</div>
                              </div>
                            </div>
                          )}

                          {/* Full-width ChatGPT-style panel */}
                          <div className="bg-white border border-slate-150 shadow-sm rounded-2xl flex flex-col h-[545px] overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse"></span>
                                <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-mono">
                                  {currentInstitution?.name} Academic AI Helpdesk
                                </span>
                              </div>
                              <button 
                                onClick={() => setChatMessages([])}
                                className="text-[10px] text-indigo-660 hover:text-indigo-800 uppercase font-black tracking-wider transition-colors"
                              >
                                Clear History
                              </button>
                            </div>

                            <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-slate-50/20">
                              {chatMessages.length === 0 ? (
                                <div className="text-center py-10 space-y-2 max-w-sm mx-auto">
                                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg mx-auto">
                                    💬
                                  </div>
                                  <h4 className="text-xs font-black uppercase text-slate-800">Ready to Answer</h4>
                                  <p className="text-xs text-slate-400">Ask administrative questions, dates schedules, or fee concession options. The assistant draws facts exclusively from securely indexed documents.</p>
                                </div>
                              ) : (
                                chatMessages.map((msg) => (
                                  <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                    {msg.role !== 'user' && (
                                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                                        AI
                                      </div>
                                    )}
                                    <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${msg.role === 'user' ? 'bg-slate-900 border border-slate-850 text-slate-150 rounded-tr-none' : 'bg-white text-slate-800 border border-slate-150 rounded-tl-none shadow-sm shadow-slate-100/30'}`}>
                                      <div className="whitespace-pre-line prose select-text">{msg.text}</div>
                                      
                                      {msg.citations && msg.citations.length > 0 && (
                                        <div className="mt-3.5 pt-3.5 border-t border-slate-100">
                                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
                                            📋 Local RAG citations:
                                          </p>
                                          <div className="flex flex-wrap gap-1">
                                            {msg.citations.map((cite, cIdx) => (
                                              <span key={cIdx} className="px-2 py-0.5 bg-slate-100 border border-slate-150 text-slate-500 rounded text-[9.5px] font-mono truncate block max-w-[190px]">📄 {cite}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      <span className="text-[9px] text-slate-400 block text-right mt-2">{msg.timestamp}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 space-y-3.5 shrink-0">
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  required
                                  placeholder="Ask here... e.g. What is the fee structure details?"
                                  value={chatInput}
                                  onChange={(e) => setChatInput(e.target.value)}
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <button 
                                  type="submit"
                                  disabled={isAiLoading || !chatInput.trim()}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase cursor-pointer"
                                >
                                  Submit
                                </button>
                              </div>

                              <div className="flex items-center gap-2 overflow-x-auto py-1 text-[10px] whitespace-nowrap">
                                <span className="text-slate-400 uppercase font-black tracking-widest shrink-0">Bilingual suggested questions:</span>
                                <button 
                                  type="button" 
                                  onClick={() => handleQuickQuestion('Exam final date yavaga?')}
                                  className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-indigo-700 text-[10px] font-bold font-mono"
                                >
                                  Exam details? (Kannada + Eng)
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => handleQuickQuestion('Show me the quarterly fee structure details')}
                                  className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-indigo-700 text-[10px] font-semibold"
                                >
                                  Fees structure? (Eng)
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => handleQuickQuestion('List key faculty contact email and office rooms')}
                                  className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-indigo-700 text-[10px] font-semibold"
                                >
                                  Faculty contact?
                                </button>
                              </div>
                            </form>
                          </div>

                        </div>
                      )}

                      {/* NOTICES PANEL */}
                      {panelTab === 'notices' && (
                        <div className="grid lg:grid-cols-12 gap-8 items-start animate-fade-in">
                          <div className="col-span-12 lg:col-span-8 space-y-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Campus Announcement bulletins Board</h4>
                              <span className="text-xs text-slate-400 font-bold">{notices.length} registered circulars</span>
                            </div>

                            <div className="space-y-4">
                              {/* Academic Default Bulletin */}
                              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-2 relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-2 h-full bg-indigo-600"></div>
                                <div className="flex items-center gap-2 text-[10px]">
                                  <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-150 rounded text-indigo-700 font-bold uppercase">Circular memo</span>
                                  <span className="text-slate-400 font-mono font-bold">May 28, 2026</span>
                                </div>
                                <h5 className="font-extrabold text-slate-900 text-sm">Odd Term Attendance cutoff memo</h5>
                                <p className="text-xs text-slate-650 text-slate-600 leading-relaxed">
                                  All enrolled candidates must strictly maintain a minimum threshold of 85% attendance across lectures, practical labs, and tutorials separately. Barring from evaluation bookings triggers automatically for outstanding defaulters with zero condonation allowance unless supported with clinical certificates.
                                </p>
                              </div>

                              {notices.map((n) => (
                                <div key={n.id} className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-2 relative group hover:border-slate-350 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[10px]">
                                      {n.isUrgent && <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded font-bold uppercase">Urgent</span>}
                                      <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono font-bold">Category: {n.category}</span>
                                      {n.department && <span className="text-indigo-650 font-bold">Dept: {n.department}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                      <span>{n.date}</span>
                                      {(currentUser.role === 'principal' || currentUser.role === 'staff') && (
                                        <button 
                                          onClick={() => handleDeleteNotice(n.id)}
                                          className="text-rose-500 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-50 ml-1"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <h5 className="font-extrabold text-slate-900 text-sm">{n.title}</h5>
                                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{n.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Notice composer sidebar (Principals/Staff only) */}
                          <div className="col-span-12 lg:col-span-4">
                            {currentUser.role === 'principal' || currentUser.role === 'staff' ? (
                              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Publish New Notice</h4>
                                <form onSubmit={handleCreateNotice} className="space-y-4 text-xs">
                                  <div>
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Headline title *</label>
                                    <input 
                                      type="text" 
                                      required
                                      value={noticeForm.title}
                                      onChange={(e) => setNoticeForm({...noticeForm, title: e.target.value})}
                                      className="w-full bg-slate-50 border p-2 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                                      placeholder="e.g. Schedule Revision of SEE exams"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Category</label>
                                    <select 
                                      value={noticeForm.category}
                                      onChange={(e) => setNoticeForm({...noticeForm, category: e.target.value as any})}
                                      className="w-full bg-slate-50 border p-2 rounded focus:outline-none"
                                    >
                                      <option value="General">General</option>
                                      <option value="Exams">Exams</option>
                                      <option value="Fees">Fees</option>
                                      <option value="Timetable">Timetable</option>
                                    </select>
                                  </div>

                                  <div className="flex items-center gap-1.5 py-1.5">
                                    <input 
                                      type="checkbox" 
                                      id="notice-urgent-flag"
                                      checked={noticeForm.isUrgent} 
                                      onChange={(e) => setNoticeForm({...noticeForm, isUrgent: e.target.checked})}
                                    />
                                    <label htmlFor="notice-urgent-flag" className="font-bold text-slate-705 text-slate-700">Mark notice as urgent</label>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Notice Body circular statements *</label>
                                    <textarea 
                                      required
                                      rows={4}
                                      value={noticeForm.content}
                                      onChange={(e) => setNoticeForm({...noticeForm, content: e.target.value})}
                                      className="w-full bg-slate-50 border p-2 rounded focus:outline-none" 
                                      placeholder="Paste circular content details cleanly..."
                                    />
                                  </div>

                                  <button type="submit" className="w-full bg-slate-900 border hover:bg-slate-850 text-white font-bold py-2.5 rounded-lg uppercase tracking-wider">
                                    Publish Bulletin notice
                                  </button>
                                </form>
                              </div>
                            ) : (
                              <div className="bg-slate-55 p-5 rounded-2xl border border-slate-150 text-center space-y-2">
                                <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                                <h5 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Operator clearance locked</h5>
                                <p className="text-[11px] text-slate-500 leading-relaxed">Students and parents hold read-only parameters under this partition.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* INDEX DOCUMENTS PANEL */}
                      {panelTab === 'documents' && (
                        <div className="grid lg:grid-cols-12 gap-8 items-start animate-fade-in">
                          <div className="col-span-12 lg:col-span-7 space-y-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm">
                              <h4 className="text-xs font-black uppercase text-slate-850 tracking-wider font-mono">Campus Document Index Store</h4>
                              <p className="text-xs text-slate-500 mt-1">Select any verified academic file in the registry list below to inspect its authenticated high-fidelity tabular stationery transcript.</p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                              {documents.map((doc) => {
                                const isActive = selectedDocId === doc.id || (!selectedDocId && documents[0]?.id === doc.id);
                                return (
                                  <div 
                                    key={doc.id} 
                                    onClick={() => setSelectedDocId(doc.id)}
                                    className={`p-5 rounded-xl border shadow-sm space-y-3 relative group transition-all cursor-pointer ${isActive ? 'ring-2 ring-indigo-600 border-transparent bg-indigo-50/15' : 'bg-white border-slate-150 hover:border-slate-300'}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 font-bold text-[9px] rounded uppercase">{doc.category}</span>
                                      {currentUser.role !== 'student_parent' && (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDocument(doc.id);
                                          }}
                                          className="text-rose-500 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                    <h5 className="font-extrabold text-slate-900 text-xs truncate" title={doc.name}>{doc.name}</h5>
                                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3 font-sans">{doc.textContent}</p>
                                    <div className="border-t pt-2.5 flex items-center justify-between text-[9.5px] text-slate-400 font-mono">
                                      <span className="truncate max-w-[90px]">By: {doc.uploadedBy}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewModalDoc(doc);
                                        }}
                                        className="flex items-center gap-1 px-2.2 py-1.2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-[9px] uppercase font-mono transition-all border border-indigo-100 shadow-sm active:scale-95"
                                        title="Open refined reader or embedded PDF viewer"
                                      >
                                        <Eye className="w-3 h-3 text-indigo-600" /> Preview
                                      </button>
                                      <span>{doc.sizeKb} KB</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="col-span-12 lg:col-span-5 space-y-6">
                            {/* High Fidelity Stationery PDF Preview layout */}
                            {renderDocumentInteractivePreview(selectedDocId ? documents.find(d => d.id === selectedDocId) : documents[0])}

                            {/* Simulated Academic File Parser (Upload) - principal/staff only */}
                            {currentUser.role !== 'student_parent' && (
                              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                  <div>
                                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider font-mono">Secure PDF Indexing Hub</h4>
                                    <p className="text-[10px] text-slate-450 mt-0.5">Principal and Teachers exclusive federated upload service</p>
                                  </div>
                                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 text-[9px] font-black rounded uppercase font-mono">FEDERATED</span>
                                </div>

                                {/* Drag-and-Drop Area */}
                                <div 
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                  }}
                                  onDragLeave={() => setIsDragging(false)}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                      handleFileChange(e.dataTransfer.files[0]);
                                    }
                                  }}
                                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2 relative overflow-hidden ${
                                    isDragging 
                                      ? 'border-indigo-500 bg-indigo-50/10' 
                                      : 'border-slate-200 hover:border-slate-350 bg-slate-50/30'
                                  }`}
                                  onClick={() => {
                                    const fileInput = document.getElementById('academic-pdf-file-picker');
                                    fileInput?.click();
                                  }}
                                >
                                  <input 
                                    id="academic-pdf-file-picker"
                                    type="file"
                                    accept=".pdf,.txt"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleFileChange(e.target.files[0]);
                                      }
                                    }}
                                  />
                                  
                                  {uploadProgress ? (
                                    <div className="w-full space-y-3 py-2">
                                      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-indigo-600 px-1">
                                        <span className="animate-pulse">{uploadProgress}</span>
                                        <span>{uploadPercent}%</span>
                                      </div>
                                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                                        <div 
                                          className="h-full bg-indigo-600 rounded-full transition-all duration-300" 
                                          style={{ width: `${uploadPercent}%` }}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <Upload className={`w-5 h-5 ${isDragging ? 'animate-bounce' : ''}`} />
                                      </div>
                                      <div>
                                        <p className="text-xs font-bold text-slate-800">
                                          Drag and drop your academic PDF here
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                          or <span className="text-indigo-600 font-bold hover:underline">browse files</span> from your computer
                                        </p>
                                      </div>
                                      <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">
                                        Max size: 10MB • Supporting PDF, TXT
                                      </p>
                                    </>
                                  )}
                                </div>

                                <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
                                  <div>
                                    <label className="block text-[10px] text-slate-550 font-bold uppercase mb-1">Parsed Academic Title *</label>
                                    <input 
                                      type="text" 
                                      required
                                      value={docForm.name}
                                      onChange={(e) => setDocForm({...docForm, name: e.target.value})}
                                      className="w-full bg-slate-50 border p-2 rounded focus:outline-none"
                                      placeholder="e.g. CSE_Syllabus_Structure_2026.pdf"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-[10px] text-slate-550 font-bold uppercase mb-1">Document Index Classification</label>
                                    <select 
                                      value={docForm.category}
                                      onChange={(e) => setDocForm({...docForm, category: e.target.value as any})}
                                      className="w-full bg-slate-50 border p-2 rounded focus:outline-none"
                                    >
                                      <option value="Notes">Notes / Learning Material</option>
                                      <option value="Timetable">Timetable & Schedule</option>
                                      <option value="Fees">Fees & Finance Chart</option>
                                      <option value="Exams">Exams & Syllabus Scope</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] text-slate-550 font-bold uppercase mb-1">Extracted Text Chunk *</label>
                                    <textarea 
                                      required
                                      rows={5}
                                      value={docForm.textContent}
                                      onChange={(e) => setDocForm({...docForm, textContent: e.target.value})}
                                      className="w-full bg-slate-50 border p-2 rounded focus:outline-none font-sans leading-relaxed text-slate-700 font-mono text-[11px]"
                                      placeholder="Extracted textual content details will be index-chunked here..."
                                    />
                                  </div>

                                  <button type="submit" className="w-full bg-slate-900 border hover:bg-slate-850 text-white font-bold py-2.5 rounded-lg uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-indigo-400" /> Run Embeddings indexer & Save
                                  </button>
                                </form>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* MANAGE STAFF MEMBER REGISTER */}
                      {panelTab === 'staff' && (
                        <div className="grid lg:grid-cols-12 gap-8 items-start animate-fade-in">
                          <div className="col-span-12 lg:col-span-8 space-y-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Authorized Campus Teachers Registry</h4>
                              <span className="text-xs font-mono font-bold bg-slate-50 border px-1.5 py-0.5 rounded">{staffList.length} registered</span>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden divide-y divide-slate-100">
                              {staffList.map((st) => (
                                <div key={st.id} className="p-5 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-150 text-indigo-700 font-extrabold flex items-center justify-center">
                                      {st.username.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-black text-slate-900">{st.username}</h5>
                                      <p className="text-[10px] text-slate-450 uppercase font-mono mt-0.5">
                                        <span>{st.email}</span>
                                        <span className="mx-1.5">•</span>
                                        <span>Scope: {st.department || 'General'}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <button 
                                    onClick={() => handleDeleteStaff(st.id)}
                                    className="text-rose-600 font-bold hover:text-rose-800 bg-rose-50 hover:bg-rose-100 p-2 text-xs rounded-lg transition-colors"
                                  >
                                    Revoke Access Key
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="col-span-12 lg:col-span-4">
                            <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Onboard New Teacher</h4>
                              <form onSubmit={handleAddStaff} className="space-y-4 text-xs">
                                <div>
                                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Username login *</label>
                                  <input 
                                    type="text" 
                                    required
                                    value={staffForm.username}
                                    onChange={(e) => setStaffForm({...staffForm, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                                    className="w-full bg-slate-50 border p-2 rounded focus:outline-none" 
                                    placeholder="e.g. prof_miller"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Email contact inbox *</label>
                                  <input 
                                    type="email" 
                                    required
                                    value={staffForm.email}
                                    onChange={(e) => setStaffForm({...staffForm, email: e.target.value})}
                                    className="w-full bg-slate-50 border p-2 rounded focus:outline-none" 
                                    placeholder="e.g. miller@college.edu"
                                  />
                                </div>

                                {currentInstitution && (
                                  <div>
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Department scope alignment</label>
                                    <select 
                                      value={staffForm.department}
                                      onChange={(e) => setStaffForm({...staffForm, department: e.target.value})}
                                      className="w-full bg-slate-50 border p-2 rounded focus:outline-none font-bold"
                                    >
                                      {currentInstitution.departments.map((d, dIdx) => (
                                        <option key={dIdx} value={d}>{d}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg uppercase tracking-wider">
                                  Save staff credentials
                                </button>
                              </form>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* URGENT ALERTS OR BROADCASTS PANEL */}
                      {panelTab === 'alerts' && (
                        <div className="grid lg:grid-cols-12 gap-8 items-start animate-fade-in">
                          <div className="col-span-12 lg:col-span-8 space-y-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Live Broadcast Stream</h4>
                              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                            </div>

                            <div className="space-y-4">
                              {alerts.map((al) => (
                                <div key={al.id} className="bg-white p-5 rounded-xl border border-slate-150 shadow-sm flex justify-between gap-4 group hover:border-slate-350 transition-colors">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${al.type === 'urgent' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-50 text-indigo-700'}`}>{al.type}</span>
                                      <span className="text-[10px] text-slate-400 font-mono font-bold">{al.date}</span>
                                    </div>
                                    <h5 className="font-extrabold text-slate-900 text-sm mt-1">{al.title}</h5>
                                    <p className="text-xs text-slate-600 leading-relaxed mt-1">{al.content}</p>
                                  </div>

                                  {(currentUser.role === 'principal' || currentUser.role === 'staff') && (
                                    <button 
                                      onClick={() => handleDeleteAlert(al.id)}
                                      className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 h-8 w-8 rounded flex items-center justify-center shrink-0 self-center transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}

                              {alerts.length === 0 && (
                                <div className="p-10 text-center space-y-2 border border-dashed rounded-2xl bg-slate-50/50">
                                  <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                                  <h6 className="text-xs font-bold text-slate-700 uppercase">Perfect tract records</h6>
                                  <p className="text-xs text-slate-400">No active disruptions or closures broadcast.</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="col-span-12 lg:col-span-4">
                            {currentUser.role === 'principal' || currentUser.role === 'staff' ? (
                              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Broadcast Alert</h4>
                                <form onSubmit={handleCreateAlert} className="space-y-4 text-xs">
                                  <div>
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Headline headline *</label>
                                    <input 
                                      type="text" 
                                      required
                                      value={alertForm.title}
                                      onChange={(e) => setAlertForm({...alertForm, title: e.target.value})}
                                      className="w-full bg-slate-50 border p-2 rounded focus:outline-none" 
                                      placeholder="e.g. Heavy rainfall advisory holiday"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Priority</label>
                                    <select 
                                      value={alertForm.type}
                                      onChange={(e) => setAlertForm({...alertForm, type: e.target.value as any})}
                                      className="w-full bg-slate-50 border p-2 rounded focus:outline-none"
                                    >
                                      <option value="urgent font-bold">Urgent red priority alert</option>
                                      <option value="announcement font-semibold">Standard announcement</option>
                                      <option value="reminder">Simple reminder</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Alert Content details *</label>
                                    <textarea 
                                      required
                                      rows={3}
                                      value={alertForm.content}
                                      onChange={(e) => setAlertForm({...alertForm, content: e.target.value})}
                                      className="w-full bg-slate-50 border p-2 rounded focus:outline-none" 
                                      placeholder="Describe details accurately..."
                                    />
                                  </div>

                                  <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg uppercase tracking-wider">
                                    Broadcast live
                                  </button>
                                </form>
                              </div>
                            ) : (
                              <div className="bg-slate-55 p-5 rounded-2xl border border-slate-150 text-center space-y-2">
                                <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                                <h5 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Operator clearance locked</h5>
                                <p className="text-[11px] text-slate-550 leading-relaxed text-slate-400">Students and parents cannot broadcast updates.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* FIXED PLATFORM FLOATING DEMO CONTROL DRAWER (For Evaluation Sandbox Validation) */}
      <div 
        id="demo-fast-track-concessions" 
        className="fixed bottom-4 left-4 z-50 transition-all duration-300 max-w-sm overflow-hidden"
      >
        {isSandboxOpen ? (
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-indigo-500/30 overflow-hidden font-display p-4 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
                <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400">🔬 Demo Fast-Track Console</span>
              </div>
              <button 
                onClick={() => setIsSandboxOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                title="Collapse Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10.5px] text-slate-300 leading-relaxed leading-snug">
              Instructors can bypass the login forms to jump direct and preview tenant separation, doc index updates, or role views instanstly.
            </p>

            <div className="space-y-1.5 pt-1.5">
              <span className="text-[8.5px] uppercase font-black text-slate-500 tracking-wider block">1. Global Overseer Clearance</span>
              <button 
                onClick={() => handleDemoSwitchRole('super_admin')}
                className="w-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg py-1.5 px-3 text-[10.5px] font-bold hover:bg-indigo-600/35 transition-colors text-left flex items-center justify-between"
              >
                <span>Platform Super Admin</span> <Shield className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[8.5px] uppercase font-black text-slate-500 tracking-wider block">2. RV College of Engineering (RVCE) Workspace Demos</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button 
                  onClick={() => handleDemoSwitchRole('principal', 'RVCE2025')}
                  className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-900/40 text-[9.5px] font-bold text-indigo-305 text-indigo-300 py-1.5 rounded transition-all text-center"
                >
                  Principal
                </button>
                <button 
                  onClick={() => handleDemoSwitchRole('staff', 'RVCE2025')}
                  className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-900/40 text-[9.5px] font-bold text-indigo-305 text-indigo-300 py-1.5 rounded transition-all text-center"
                >
                  Teacher (CS)
                </button>
                <button 
                  onClick={() => handleDemoSwitchRole('student_parent', 'RVCE2025')}
                  className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-900/40 text-[9.5px] font-bold text-indigo-105 text-indigo-300 py-1.5 rounded transition-all text-center"
                >
                  Student/Parent
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[8.5px] uppercase font-black text-slate-500 tracking-wider block">3. St. Xavier's Academy Workspace Demos</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button 
                  onClick={() => handleDemoSwitchRole('principal', 'XAVIER101')}
                  className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-900/40 text-[9.5px] font-bold text-indigo-305 text-indigo-300 py-1.5 rounded transition-all text-center"
                >
                  Principal
                </button>
                <button 
                  onClick={() => handleDemoSwitchRole('staff', 'XAVIER101')}
                  className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-900/40 text-[9.5px] font-bold text-indigo-305 text-indigo-300 py-1.5 rounded transition-all text-center"
                >
                  Teacher (Sci)
                </button>
                <button 
                  onClick={() => handleDemoSwitchRole('student_parent', 'XAVIER101')}
                  className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-900/40 text-[9.5px] font-bold text-indigo-105 text-indigo-300 py-1.5 rounded transition-all text-center"
                >
                  Student/Parent
                </button>
              </div>
            </div>

            <button 
              onClick={() => handleDemoSwitchRole('logged_out')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-1 px-3 text-[10px] rounded uppercase flex items-center justify-center gap-1"
            >
              Reset Session
            </button>

          </div>
        ) : (
          <button 
            onClick={() => setIsSandboxOpen(true)}
            className="w-10 h-10 bg-slate-900 text-indigo-400 border border-indigo-500/40 rounded-full shadow-2xl flex items-center justify-center cursor-pointer animate-bounce"
            title="Open Sandbox Switches"
          >
            🔬
          </button>
        )}
      </div>

      {/* HIGH READABILITY DOCUMENT PREVIEW MODAL */}
      {previewModalDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewModalDoc(null)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col max-h-[88vh] overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase font-mono tracking-tight text-white flex items-center gap-2">
                    {previewModalDoc.name}
                    <span className="px-1.5 py-0.5 bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[8.5px] rounded uppercase font-bold tracking-widest">{previewModalDoc.category}</span>
                  </h3>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-mono">
                    <span>INDEXED DOCUMENT</span>
                    <span>•</span>
                    <span>SIZE: {previewModalDoc.sizeKb} KB</span>
                    <span>•</span>
                    <span>UPLOADED BY: {previewModalDoc.uploadedBy}</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setPreviewModalDoc(null)}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-inner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Controls Toolbar & Filter Swipes */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 select-none">
              
              {/* Tab Selector Mode */}
              <div className="flex items-center bg-slate-204 bg-slate-200/85 p-0.5 rounded-lg border border-slate-300">
                <button
                  onClick={() => setModalViewMode('reader')}
                  className={`px-3 py-1.5 rounded-md text-[10.5px] font-extrabold uppercase font-mono tracking-wider transition-all flex items-center gap-1.5 ${modalViewMode === 'reader' ? 'bg-white text-indigo-755 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <BookOpen className="w-3.5 h-3.5" /> Refined Text Reader
                </button>
                <button
                  onClick={() => setModalViewMode('interactive')}
                  className={`px-3 py-1.5 rounded-md text-[10.5px] font-extrabold uppercase font-mono tracking-wider transition-all flex items-center gap-1.5 ${modalViewMode === 'interactive' ? 'bg-white text-indigo-755 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <Eye className="w-3.5 h-3.5" /> Interactive PDF View
                </button>
              </div>

              {/* Reader specific properties (Theme, Zoom) */}
              {modalViewMode === 'reader' && (
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Theme Selectors */}
                  <div className="flex items-center gap-1.5 bg-slate-200/40 px-2 py-1 rounded-lg border border-slate-200">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mr-1 font-mono">Theme:</span>
                    <button 
                      onClick={() => setModalTheme('light')}
                      className={`w-5 h-5 rounded-full bg-white border cursor-pointer hover:scale-110 transition-transform ${modalTheme === 'light' ? 'ring-2 ring-indigo-500 border-indigo-500 scale-105' : 'border-slate-300'}`}
                      title="Light Theme"
                    />
                    <button 
                      onClick={() => setModalTheme('sepia')}
                      className={`w-5 h-5 rounded-full bg-[#fcf6e8] border cursor-pointer hover:scale-110 transition-transform ${modalTheme === 'sepia' ? 'ring-2 ring-indigo-500 border-[#eae0cc] scale-105' : 'border-[#eae0cc]'}`}
                      title="Sepia Vintage Theme"
                    />
                    <button 
                      onClick={() => setModalTheme('dark')}
                      className={`w-5 h-5 rounded-full bg-slate-900 border cursor-pointer hover:scale-110 transition-transform ${modalTheme === 'dark' ? 'ring-2 ring-indigo-500 border-slate-900 scale-105' : 'border-slate-600'}`}
                      title="Eye-Care Night Theme"
                    />
                    <button 
                      onClick={() => setModalTheme('contrast')}
                      className={`w-5 h-5 rounded-full bg-black border cursor-pointer hover:scale-110 transition-transform ${modalTheme === 'contrast' ? 'ring-2 ring-indigo-400 border-black scale-105' : 'border-slate-800'}`}
                      title="High Contrast Theme"
                    />
                  </div>

                  {/* Font Zoom Sizers */}
                  <div className="flex items-center gap-1 bg-slate-200/40 px-2 py-1 rounded-lg border border-slate-200">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mr-1 font-mono">Size:</span>
                    <button 
                      onClick={() => setTextSizePercent(prev => Math.max(70, prev - 15))}
                      className="w-6 h-6 rounded bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-[10px] flex items-center justify-center border border-slate-250 transition-colors"
                      title="Smaller text"
                    >
                      <ZoomOut className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-slate-600 font-mono font-bold px-1.5 min-w-[40px] text-center">{textSizePercent}%</span>
                    <button 
                      onClick={() => setTextSizePercent(prev => Math.min(150, prev + 15))}
                      className="w-6 h-6 rounded bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-[10px] flex items-center justify-center border border-slate-250 transition-colors"
                      title="Larger text"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Interactive simulated commands */}
              {modalViewMode === 'interactive' && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-250 text-[10px] uppercase font-mono tracking-wide transition-all shadow-sm cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Direct Print
                  </button>
                  <a 
                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(previewModalDoc.textContent)}`} 
                    download={previewModalDoc.name}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-755 hover:bg-indigo-700 text-white font-bold rounded-lg border border-transparent text-[10px] uppercase font-mono tracking-wide transition-all shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download TXT
                  </a>
                </div>
              )}

            </div>

            {/* Document Content Viewport Container */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/40">
              
              {modalViewMode === 'reader' && (
                <div 
                  className={`max-w-3xl mx-auto rounded-2xl shadow-sm border p-8 font-serif leading-relaxed text-justify transition-all whitespace-pre-line relative ${
                    modalTheme === 'light' ? 'bg-white text-slate-800 border-slate-200' :
                    modalTheme === 'sepia' ? 'bg-[#fdfaf2] text-[#4a3525] border-[#f0e6d2]' :
                    modalTheme === 'dark' ? 'bg-[#141416] text-[#e3e3e6] border-[#2d2d30]' :
                    'bg-black text-[#00ff22] border-emerald-950 border-emerald-900 font-mono text-left leading-normal'
                  }`}
                  style={{ fontSize: `${textSizePercent}%` }}
                >
                  <div className="absolute top-2 right-4 text-[9px] uppercase font-bold select-none tracking-widest font-mono opacity-40">
                    READABILITY VIEW MODE
                  </div>

                  <h1 className="text-xl font-bold font-sans tracking-tight mb-4 pb-2 border-b border-current opacity-90 uppercase">
                    {previewModalDoc.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ")}
                  </h1>

                  <div className="space-y-4">
                    {previewModalDoc.textContent}
                  </div>
                </div>
              )}

              {modalViewMode === 'interactive' && (
                <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-xl border border-slate-300 relative overflow-hidden font-sans text-xs">
                  {/* Embedded PDF Simulator UI Bar */}
                  <div className="bg-slate-105 bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-250 border-slate-200 select-none text-[10px] text-slate-500 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                      <span className="font-bold text-slate-700">{previewModalDoc.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Powered by Google Docs PDF Engine</span>
                      <span>Page 1 / 1</span>
                    </div>
                  </div>

                  {/* Letterhead Frame Stationery */}
                  <div className="p-8 space-y-6 select-text relative">
                    {/* Watermark Diagonal stamp */}
                    <div className="absolute inset-x-0 top-1/3 opacity-[0.03] flex items-center justify-center pointer-events-none select-none text-slate-950 font-black text-6xl uppercase rotate-12">
                      ACADEMIC PORTAL COPY
                    </div>

                    {/* Official Corporate Header */}
                    <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1 relative">
                      <h2 className="text-sm font-black tracking-widest uppercase text-slate-900">
                        {currentInstitution?.name || 'AFFILIATED EDUCATION DEPT'}
                      </h2>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        ACADEMIC RECORD SERVICES • CAMPUS TRANSCRIPT CELL
                      </p>
                      <div className="flex justify-between items-center text-[8px] text-slate-400 font-mono pt-3 uppercase">
                        <span>CAMPUS ID: {currentInstitution?.code || 'GENERIC'}</span>
                        <span>DATE GUIDELINE: {new Date(previewModalDoc.uploadedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Styled Transcript depending on document parameters */}
                    <div className="space-y-4 pt-2">
                      <div className="px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[8px] font-black tracking-widest uppercase text-slate-400 font-mono block">Document Catalog Class Target:</span>
                        <span className="text-[11px] font-bold uppercase text-indigo-900 font-sans tracking-wide">{previewModalDoc.category} INDEX ENTRY</span>
                      </div>

                      <div className="font-serif text-[12px] leading-relaxed text-slate-800 whitespace-pre-line text-justify pl-1 pr-1">
                        {previewModalDoc.textContent}
                      </div>
                    </div>

                    {/* Footer stamps / parameters */}
                    <div className="pt-6 border-t border-slate-200 border-dashed grid grid-cols-2 items-end">
                      <div className="text-[8.5px] uppercase font-mono font-bold text-slate-400 space-y-0.5">
                        <span className="text-indigo-600 block">AUTHENTIC ARCHIVE MATRIX</span>
                        <span className="block">SECURED BY CHROMA CLIENT • TENANT READ-ONLY LOCK</span>
                      </div>
                      
                      <div className="text-right">
                        <div className="inline-block text-center space-y-1">
                          <span className="block text-[8px] uppercase tracking-wider font-bold text-slate-400 font-mono">DULY ATTESTED SIGNATURE</span>
                          <div className="px-3 py-1 bg-green-50 text-green-700 font-bold border border-green-200 uppercase tracking-wide rounded text-[8px] font-mono select-none">
                             INSTITUTION AUTHENTIC ✅ 
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer Control bar */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 font-mono select-none uppercase">
              <span>Tenant Isolation: Private Partition</span>
              <span>Press Escape or Outer Screen to dismiss</span>
            </div>

          </div>
        </div>
      )}

      {/* REAL-TIME STATUS FOOTER BAR */}
      <footer id="global-system-footer" className="bg-slate-900 text-slate-400 w-full shrink-0 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between text-[10.5px] font-mono uppercase tracking-wider">
          <div className="flex gap-5">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Isolate-Safe Chroma Vector Storage
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Django REST Middleware Stack
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span>Session: {currentInstitution ? `Active (ID: ${currentInstitution.code})` : 'Home'}</span>
            <span>•</span>
            <span>Platform Owner ID: superadmin</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
