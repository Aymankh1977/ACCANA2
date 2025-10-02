/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { jsPDF } from 'jspdf';
import './AccreditationAnalyzer.css';
import TrainingChatbot from './TrainingChatbot';
import SubmissionReviewModal from './SubmissionReviewModal';
import IntegrationsModal from './IntegrationsModal';
import SummaryChartModal from './SummaryChartModal';
import ExternalTrainingModal from './ExternalTrainingModal';
import InternalMessagesModal, { InternalMessage as ImportedInternalMessage } from './InternalMessagesModal'; // Renamed to avoid conflict if any local one existed, though the error points to export from this file
import NotificationsModal from './NotificationsModal'; // For submission notifications
import UserManagementModal from './UserManagementModal'; 
import TechnicalSupportModal from './TechnicalSupportModal'; 
import type { User, UserRole } from '../App';

// --- Data Structures ---
export interface Standard {
  id: string;
  name: string;
  description: string;
}

export interface AccreditationBody {
  key: string;
  name: string;
  standards: Standard[];
}

export const ACCREDITATION_BODIES: AccreditationBody[] = [
  {
    key: "ADA",
    name: "American Dental Association (ADA CODA)",
    standards: [
      { id: "ADA-1.1", name: "Curriculum Management & Evaluation", description: "Programs must demonstrate effective curriculum planning, review, and evaluation processes to ensure content is current, comprehensive, and well-organized." },
      { id: "ADA-2.3", name: "Patient Care Competencies", description: "Graduates must be competent in providing comprehensive patient care, including assessment, diagnosis, treatment planning, and management of diverse patient populations." },
      { id: "ADA-3.5", name: "Ethical Reasoning and Professional Conduct", description: "Students and graduates must demonstrate understanding and application of ethical principles and professional conduct in all aspects of dental practice." },
      { id: "ADA-4.1", name: "Faculty and Staff Qualifications", description: "Programs must have a sufficient number of qualified faculty and staff to support the educational program and its objectives." },
      { id: "ADA-5.2", name: "Learning Environment and Resources", description: "The program must provide a safe and supportive learning environment with adequate physical resources, facilities, and student support services." },
      { id: "ADA-6.0", name: "Research and Scholarly Activity", description: "Programs should foster an environment that encourages research and scholarly activity among students and faculty." },
    ],
  },
  {
    key: "GDC",
    name: "General Dental Council (GDC)",
    standards: [
      { id: "GDC-1.0", name: "Clinical Safety and Effectiveness", description: "Registrants must practise safely and effectively, ensuring patient safety at all times." },
      { id: "GDC-2.0", name: "Communication", description: "Registrants must communicate effectively with patients, colleagues, and others." },
      { id: "GDC-3.0", name: "Professionalism", description: "Registrants must maintain appropriate professional behaviour, ethics, and integrity." },
      { id: "GDC-4.0", name: "Continuing Professional Development (CPD)", description: "Registrants must engage in ongoing CPD to maintain and develop their knowledge and skills." },
      { id: "GDC-5.0", name: "Teamworking", description: "Registrants must work effectively with other members of the dental team and wider healthcare professionals." },
    ],
  },
  {
    key: "NCAAA",
    name: "National Center for Academic Accreditation and Assessment (NCAAA - ETEC)",
    standards: [
      { id: "NCAAA-S1", name: "Mission and Goals", description: "The program must have a clear mission and goals that are aligned with institutional and national priorities." },
      { id: "NCAAA-S2", name: "Program Management and Quality Assurance", description: "The program must have effective leadership, governance, and quality assurance processes." },
      { id: "NCAAA-S3", name: "Curriculum", description: "The program curriculum must be appropriate, current, and effectively delivered." },
      { id: "NCAAA-S4", name: "Learning and Teaching", description: "The program must ensure high-quality learning and teaching through appropriate strategies, resources, and assessment." },
      { id: "NCAAA-S5", name: "Student Administration and Support Services", description: "The program must provide adequate support services for students, including admission, academic advising, and counseling." },
      { id: "NCAAA-S6", name: "Learning Resources", description: "The program must have access to adequate learning resources, including libraries, laboratories, and IT infrastructure." },
      { id: "NCAAA-S7", name: "Facilities and Equipment", description: "The program must have appropriate physical facilities and equipment to support its activities." },
      { id: "NCAAA-S8", name: "Faculty and Staff", description: "The program must have qualified and sufficient faculty and staff." },
      { id: "NCAAA-S9", name: "Research", description: "The program should promote and support research activities relevant to its field." },
      { id: "NCAAA-S10", name: "Community Engagement", description: "The program should contribute to the community through service and engagement." },
      { id: "NCAAA-S11", name: "Program Evaluation and Improvement", description: "The program must have systematic processes for evaluation and continuous improvement." },
    ],
  },
];

export interface AnalysisResultItem {
  standardId: string;
  standardName: string;
  matchPercentage: number;
  improvementFeedback: string;
  reasoning?: string; // Optional field for AI reasoning
}

export interface AnalysisResultsGroup {
  accreditationBodyKey: string;
  accreditationBodyName: string;
  overallMatchingStatement?: string;
  items: AnalysisResultItem[];
}

export type ProgramContentLanguage = "English" | "Arabic";

export interface ChatbotContext {
  standard: Standard;
  initialFeedback: string;
  accreditationBodyName: string;
  programContentLanguage: ProgramContentLanguage;
}

export interface RecipientIdentifier { // This interface is used by InternalMessage
    type: 'user' | 'role';
    value: string; // Username or UserRole
}

export interface SubmissionNote {
  by: string;
  role: UserRole;
  timestamp: string;
  text: string;
}
export interface Submission {
  id: string;
  submittedByUsername: string;
  submittedByUserRole: User['role'];
  submittedAt: string;
  programContent: string;
  programContentLanguage: ProgramContentLanguage;
  analysisResults: AnalysisResultsGroup[];
  selectedBodyKeys: string[];
  status: 'pending' | 'approved' | 'rejected';
  notes: SubmissionNote[];
}

export interface SummaryChartData {
  labels: string[];
  dataValues: number[];
  title: string;
  accreditationBodyName: string;
}

export interface Notification { // For submission notifications
  id: string;
  recipientUsername: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  relatedSubmissionId?: string;
}

// This is the InternalMessage interface that UserManagementModal.tsx needs to import.
// It was already exported, but the module itself might not have been recognized correctly.
export interface InternalMessage {
  id: string;
  senderUsername: string;
  senderRole: UserRole;
  recipientIdentifier: RecipientIdentifier;
  subject: string;
  body: string;
  timestamp: string;
  readBy: { [username: string]: boolean };
}


interface AccreditationAnalyzerProps {
  currentUser: User;
  onLogout: () => void;
}

export const LOCAL_STORAGE_SUBMISSIONS_KEY = 'accreditationSubmissions';
export const LOCAL_STORAGE_SUBMISSION_NOTIFICATIONS_KEY = 'accreditationSubmissionNotifications';
export const LOCAL_STORAGE_INTERNAL_MESSAGES_KEY = 'internalUserMessages';

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        results: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    standardId: {
                        type: Type.STRING,
                        description: 'The exact ID of the standard being evaluated.'
                    },
                    matchPercentage: {
                        type: Type.INTEGER,
                        description: 'An integer between 0 and 100 representing compliance.'
                    },
                    improvementFeedback: {
                        type: Type.STRING,
                        description: 'Actionable feedback for improvement.'
                    },
                    reasoning: {
                        type: Type.STRING,
                        description: 'Optional reasoning for the match percentage.'
                    },
                },
                required: ['standardId', 'matchPercentage', 'improvementFeedback'],
            },
        },
    },
    required: ['results'],
};


// --- Component ---
const AccreditationAnalyzer: React.FC<AccreditationAnalyzerProps> = ({ currentUser, onLogout }) => {
  const [selectedBodyKeys, setSelectedBodyKeys] = useState<string[]>([]);
  const [programContent, setProgramContent] = useState<string>("");
  const [programContentLanguage, setProgramContentLanguage] = useState<ProgramContentLanguage>("English");
  const [analysisResults, setAnalysisResults] = useState<AnalysisResultsGroup[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFileParsing, setIsFileParsing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrintableReport, setShowPrintableReport] = useState<boolean>(false);

  const [showTrainingChatbot, setShowTrainingChatbot] = useState<boolean>(false);
  const [chatbotContext, setChatbotContext] = useState<ChatbotContext | null>(null);

  const [showSummaryChartModal, setShowSummaryChartModal] = useState<boolean>(false);
  const [summaryChartData, setSummaryChartData] = useState<SummaryChartData | null>(null);

  const [submissionsForReview, setSubmissionsForReview] = useState<Submission[]>([]);
  const [userPastSubmissions, setUserPastSubmissions] = useState<Submission[]>([]);
  const [revisingSubmissionInfo, setRevisingSubmissionInfo] = useState<{ id: string; originalStatus: string; notes?: SubmissionNote[] } | null>(null);
  const [selectedSubmissionForReview, setSelectedSubmissionForReview] = useState<Submission | null>(null);
  const [showIntegrationsModal, setShowIntegrationsModal] = useState<boolean>(false);
  const [hasPendingSubmission, setHasPendingSubmission] = useState<boolean>(false);

  // Submission Notifications State
  const [unreadSubmissionNotificationCount, setUnreadSubmissionNotificationCount] = useState<number>(0);
  const [showSubmissionNotificationsModal, setShowSubmissionNotificationsModal] = useState<boolean>(false);
  const [currentUserSubmissionNotifications, setCurrentUserSubmissionNotifications] = useState<Notification[]>([]);


  // External Training Modal State
  const [showExternalTrainingModal, setShowExternalTrainingModal] = useState<boolean>(false);

  // Internal Messaging State
  const [unreadInternalMessagesCount, setUnreadInternalMessagesCount] = useState<number>(0);
  const [showInternalMessagesModal, setShowInternalMessagesModal] = useState<boolean>(false);
  
  // User Management Modal State
  const [showUserManagementModal, setShowUserManagementModal] = useState<boolean>(false);

  // Technical Support Modal State
  const [showTechnicalSupportModal, setShowTechnicalSupportModal] = useState<boolean>(false);


  // Initialize GoogleGenAI client
   console.log('=== PRODUCTION ENV CHECK ===');
   console.log('VITE_API_KEY:', import.meta.env.VITE_API_KEY);
   console.log('All env vars:', import.meta.env);
   console.log('=========================='); 
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY! });

  // --- Submission Notification Handling ---
  const addSubmissionNotificationToStorage = useCallback((notification: Notification) => {
    const stored = localStorage.getItem(LOCAL_STORAGE_SUBMISSION_NOTIFICATIONS_KEY);
    const notifications: Notification[] = stored ? JSON.parse(stored) : [];
    notifications.push(notification);
    localStorage.setItem(LOCAL_STORAGE_SUBMISSION_NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }, []); 
  
  const loadUserSubmissionNotifications = useCallback(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_SUBMISSION_NOTIFICATIONS_KEY);
    const notifications: Notification[] = stored ? JSON.parse(stored) : [];
    const userNotifications = notifications.filter(n => n.recipientUsername === currentUser.username);
    setCurrentUserSubmissionNotifications(userNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setUnreadSubmissionNotificationCount(userNotifications.filter(n => !n.isRead).length);
  }, [currentUser.username]);

  const markSubmissionNotificationsAsReadInStorage = useCallback((username: string) => {
    const stored = localStorage.getItem(LOCAL_STORAGE_SUBMISSION_NOTIFICATIONS_KEY);
    let notifications: Notification[] = stored ? JSON.parse(stored) : [];
    notifications = notifications.map(n => 
        n.recipientUsername === username && !n.isRead ? { ...n, isRead: true } : n
    );
    localStorage.setItem(LOCAL_STORAGE_SUBMISSION_NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }, []);

  const clearReadSubmissionNotificationsFromStorage = useCallback((username: string) => {
    const stored = localStorage.getItem(LOCAL_STORAGE_SUBMISSION_NOTIFICATIONS_KEY);
    let notifications: Notification[] = stored ? JSON.parse(stored) : [];
    notifications = notifications.filter(n => !(n.recipientUsername === username && n.isRead));
    localStorage.setItem(LOCAL_STORAGE_SUBMISSION_NOTIFICATIONS_KEY, JSON.stringify(notifications));
    loadUserSubmissionNotifications(); 
  }, [loadUserSubmissionNotifications]); 

  const loadInternalMessagesForUser = useCallback(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_INTERNAL_MESSAGES_KEY);
    const messages: InternalMessage[] = stored ? JSON.parse(stored) : [];
        
    const userInboxMessages = messages.filter(m => 
        (m.recipientIdentifier.type === 'user' && m.recipientIdentifier.value === currentUser.username) ||
        (m.recipientIdentifier.type === 'role' && m.recipientIdentifier.value === currentUser.role)
    );
    setUnreadInternalMessagesCount(userInboxMessages.filter(m => !m.readBy || !m.readBy[currentUser.username]).length);
  }, [currentUser.username, currentUser.role]);

  useEffect(() => {
    loadUserSubmissionNotifications();
    loadInternalMessagesForUser();
  }, [currentUser.username, loadUserSubmissionNotifications, loadInternalMessagesForUser]);


  useEffect(() => {
    const loadSubmissionsData = () => {
      const storedSubmissions = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS_KEY);
      const allSubmissionsData: Submission[] = storedSubmissions ? JSON.parse(storedSubmissions) : [];
      
      const currentUserOwnPastSubmissions = allSubmissionsData.filter(
        s => s.submittedByUsername === currentUser.username && (s.status === 'approved' || s.status === 'rejected')
      ).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setUserPastSubmissions(currentUserOwnPastSubmissions);

      if (currentUser.role === 'Admin' || currentUser.role === 'University Lead') {
        setSubmissionsForReview(
          allSubmissionsData.filter(s => s.status === 'pending')
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        );
      } else if (currentUser.role === 'University ID') {
        const userSubmissions = allSubmissionsData.filter(s => s.submittedByUsername === currentUser.username);
        const userPendingSubmission = userSubmissions.find(s => s.status === 'pending');
        setHasPendingSubmission(!!userPendingSubmission);

        if (userPendingSubmission && !revisingSubmissionInfo) {
            setError("You have a submission pending review. Please wait for Admin/Lead approval or load a past submission to revise.");
        } else if (!revisingSubmissionInfo) { 
            setError(null); 
        }
        setSubmissionsForReview([]); 
      }
    };
    loadSubmissionsData();
  }, [currentUser, revisingSubmissionInfo]);


  useEffect(() => {
    if (programContent) {
      const arabicRegex = /[\u0600-\u06FF]/;
      setProgramContentLanguage(arabicRegex.test(programContent) ? "Arabic" : "English");
    }
  }, [programContent]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsFileParsing(true);
    setError(null);
    setProgramContent("");
    setAnalysisResults(null); 

    try {
      let textContent = "";
      if (file.type === "text/plain") {
        textContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error("Failed to read .txt file."));
          reader.readAsText(file);
        });
      } else if (file.type === "application/pdf") {
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
        GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.js `;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const pageTextContent = await page.getTextContent();
          fullText += pageTextContent.items.map((item: any) => item.str).join(" ") + "\n";
        }
        textContent = fullText;
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        textContent = result.value;
      } else {
        throw new Error(`Unsupported file type: ${file.type}. Please upload .txt, .pdf, or .docx files.`);
      }
      setProgramContent(textContent);
      setError(null);
    } catch (e: any) {
      console.error("File processing error:", e);
      setError(`Failed to process file: ${e.message}`);
      setProgramContent("");
    } finally {
      setIsFileParsing(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleBodySelectionChange = (bodyKey: string) => {
    setSelectedBodyKeys(prevKeys =>
      prevKeys.includes(bodyKey)
        ? prevKeys.filter(key => key !== bodyKey)
        : [...prevKeys, bodyKey]
    );
  };

  const handleSubmitAnalysis = async () => {
    if (!programContent.trim()) {
      setError("Please enter or upload program content.");
      return;
    }
    if (selectedBodyKeys.length === 0) {
      setError("Please select at least one accreditation body.");
      return;
    }
    if (hasPendingSubmission && currentUser.role === 'University ID' && !revisingSubmissionInfo) {
        setError("You have a submission pending review. Cannot start a new analysis.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResults(null);
    setShowPrintableReport(false);

    const resultsPromises = selectedBodyKeys.map(async (bodyKey) => {
      const selectedAccreditationBody = ACCREDITATION_BODIES.find(b => b.key === bodyKey);
      if (!selectedAccreditationBody) {
        console.error(`Invalid accreditation body key: ${bodyKey}`);
        throw new Error(`Invalid accreditation body key: ${bodyKey}`);
      }
      const standardsText = selectedAccreditationBody.standards.map(s => `Standard ID: ${s.id}, Name: "${s.name}", Description: "${s.description}"`).join('\n');
      const prompt = `
        You are an expert AI assistant specializing in dental program accreditation for ${selectedAccreditationBody.name}.
        The user has provided program content in ${programContentLanguage}. Your analysis should be in English.
        Carefully analyze the following program content against EACH of the provided standards for ${selectedAccreditationBody.name}.

        Accreditation Body: ${selectedAccreditationBody.name}
        Standards to evaluate against:
        ${standardsText}

        Program Content to Analyze:
        \`\`\`
        ${programContent}
        \`\`\`

        For EACH standard, you MUST provide:
        1.  "standardId": This MUST EXACTLY MATCH one of the Standard IDs provided above for ${selectedAccreditationBody.name}.
        2.  "matchPercentage": An integer between 0 and 100, representing the estimated degree of compliance.
        3.  "improvementFeedback": Highly specific, actionable feedback (2-4 sentences) on how the provided program content can be improved to better meet THIS standard. If the content fully meets the standard, clearly state this and why. If not fully met, focus on tangible changes or additions to the provided content.
        4.  "reasoning": (Optional but highly encouraged if matchPercentage < 75) A brief (1-2 sentences) explanation for your matchPercentage, referencing specific aspects (or lack thereof) in the provided Program Content. For example, "The content lacks a clear description of X, which is crucial for this standard."

        Return your entire response as a single, valid JSON object with a top-level key "results".
        The "results" key must contain an array of objects. Each object in the array represents one standard and must include the keys: "standardId", "matchPercentage", "improvementFeedback", and optionally "reasoning".
        Example for one standard object:
        { "standardId": "ADA-1.1", "matchPercentage": 60, "improvementFeedback": "To better align with curriculum management, detail the annual curriculum review process, including who participates and how student feedback is incorporated. Provide an example of a recent curriculum change based on this review.", "reasoning": "The content mentions curriculum planning but does not detail the review cycle or stakeholder input required by ADA-1.1." }
        
        Ensure the output is ONLY the JSON object, without any surrounding text, explanations, or markdown fences.
      `;

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
      });
      let jsonStr = response.text.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }
      const parsedData = JSON.parse(jsonStr);

      if (parsedData.results && Array.isArray(parsedData.results)) {
        return {
          accreditationBodyKey: selectedAccreditationBody.key,
          accreditationBodyName: selectedAccreditationBody.name,
          items: parsedData.results.map((item: any) => {
            const originalApiStandardId = item.standardId;
            const normalizeId = (id: string) => id ? id.toLowerCase().replace(/\s+/g, '').replace(/-/g, '') : '';
            
            const matchedStandard = selectedAccreditationBody.standards.find(
                s => normalizeId(s.id) === normalizeId(originalApiStandardId)
            );

            const finalStandardId = matchedStandard ? matchedStandard.id : originalApiStandardId || "N/A";
            const finalStandardName = matchedStandard ? matchedStandard.name : item.standardName || "Unknown Standard";
            
            if (!matchedStandard && originalApiStandardId) {
                console.warn(`API returned standardId "${originalApiStandardId}" for ${selectedAccreditationBody.name}, which was not found or matched in predefined standards. Using API provided ID and name if available.`);
            }

            return {
              standardId: finalStandardId,
              standardName: finalStandardName,
              matchPercentage: typeof item.matchPercentage === 'number' ? Math.max(0, Math.min(100, item.matchPercentage)) : 0,
              improvementFeedback: item.improvementFeedback || "No feedback provided.",
              reasoning: item.reasoning || ( (typeof item.matchPercentage === 'number' && item.matchPercentage < 75) ? "Reasoning not explicitly provided by AI." : undefined ),
            };
          }).filter(item => item.standardId !== "N/A"),
        } as AnalysisResultsGroup;
      } else {
        console.error("Parsed data for " + selectedAccreditationBody.name + ":", parsedData);
        throw new Error(`Invalid JSON structure in API response for ${selectedAccreditationBody.name}. Expected 'results' array.`);
      }
    });

    try {
      const settledResults = await Promise.allSettled(resultsPromises);
      const successfulResults: AnalysisResultsGroup[] = [];
      let encounteredError = false;
      settledResults.forEach(result => {
        if (result.status === 'fulfilled') {
          successfulResults.push(result.value);
        } else {
          console.error("API Error for one body:", result.reason);
          const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
          setError(prevError => (prevError ? prevError + "\n" : "") + `Analysis failed for one or more accreditation bodies: ${message}`);
          encounteredError = true;
        }
      });
      if (successfulResults.length > 0) {
        setAnalysisResults(successfulResults);
      }
      if (successfulResults.length === 0 && encounteredError) {
         setError('Failed to analyze content for all selected accreditation bodies. Please check your input or try again later.');
      } else if (encounteredError && successfulResults.length > 0) {
        // Partial success
      }

    } catch (e: any) {
      console.error("Overall API Submission Error:", e);
      setError(`An unexpected error occurred during analysis. ${e.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTrainingChatbot = (standardId: string, accreditationBodyKey: string) => {
    const resultGroup = analysisResults?.find(ag => ag.accreditationBodyKey === accreditationBodyKey);
    const resultItem = resultGroup?.items.find(item => item.standardId === standardId);
    const body = ACCREDITATION_BODIES.find(b => b.key === accreditationBodyKey);

    if (!resultItem || !body || !resultGroup) {
      setError("Could not find the standard details to start training. Result item, body or group missing.");
      return;
    }
    const standardDetails = body.standards.find(s => s.id === standardId);
    if (!standardDetails) {
        setError(`Could not find standard definition for ID "${standardId}" in ${body.name}. This may indicate an issue with standard ID reconciliation.`);
        console.error(`Failed to find standard details. Body: ${body.name}, Standard ID passed: ${standardId}`);
        return;
    }
    setChatbotContext({
      standard: standardDetails,
      initialFeedback: resultItem.improvementFeedback,
      accreditationBodyName: resultGroup.accreditationBodyName,
      programContentLanguage: programContentLanguage,
    });
    setShowTrainingChatbot(true);
  };


  const handleShowSummaryChart = (accreditationBodyKey: string) => {
    const resultGroup = analysisResults?.find(group => group.accreditationBodyKey === accreditationBodyKey);
    if (!resultGroup) {
      setError("Could not find analysis results to generate chart.");
      return;
    }
    const labels = resultGroup.items.map(item => item.standardName);
    const dataValues = resultGroup.items.map(item => item.matchPercentage);

    setSummaryChartData({
      labels,
      dataValues,
      title: `Analysis Summary for ${resultGroup.accreditationBodyName}`,
      accreditationBodyName: resultGroup.accreditationBodyName,
    });
    setShowSummaryChartModal(true);
  };

  const handleDownloadPdfReport = () => {
    if (!analysisResults) return;

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const cellPadding = 2;
    let y = margin;

    const addWrappedText = (text: string, x: number, currentY: number, options: any = {}) => {
        const fontSize = options.fontSize || 10;
        const fontStyle = options.fontStyle || 'normal';
        const isTitle = options.isTitle || false;
        const maxWidth = pageWidth - margin - x;
        
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        if (isTitle) {
            doc.setTextColor(0, 90, 156); // --primary-color
        }

        const lines = doc.splitTextToSize(text, maxWidth);
        const textHeight = lines.length * (fontSize / 2.8) + cellPadding;

        if (currentY + textHeight > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
        }

        doc.text(lines, x, currentY);
        doc.setTextColor(0, 0, 0); // Reset text color
        return currentY + textHeight;
    };

    // Header
    y = addWrappedText('Accreditation Analysis Report', margin, y, { fontSize: 18, fontStyle: 'bold', isTitle: true });
    y = addWrappedText(`Generated by: DentEdTech™ Accreditation Analyzer`, margin, y, { fontSize: 10 });
    y = addWrappedText(`Analyzed For: ${currentUser.username} (${currentUser.role})`, margin, y, { fontSize: 10 });
    y = addWrappedText(`Date: ${new Date().toLocaleDateString()}`, margin, y, { fontSize: 10 });
    y += 5;

    // Disclaimer
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100); // Gray color
    y = addWrappedText('DISCLAIMER: This AI-generated analysis provides guidance and suggestions based on the provided content and selected standards. It is intended as a supportive tool and NOT a substitute for expert human review or official accreditation decisions. Final interpretation and compliance responsibility rests with the user and the respective accreditation bodies.', margin, y, { fontSize: 9 });
    doc.setTextColor(0); // Reset color to black
    y += 10;

    // Results
    analysisResults.forEach(resultGroup => {
      if (y + 20 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      y = addWrappedText(`Accreditation Body: ${resultGroup.accreditationBodyName}`, margin, y, { fontSize: 14, fontStyle: 'bold', isTitle: true });
      y += 5;

      resultGroup.items.forEach(item => {
        const itemHeightEstimate = 40; // Rough estimate
        if (y + itemHeightEstimate > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        y = addWrappedText(`Standard: ${item.standardName} (${item.standardId})`, margin, y, { fontSize: 12, fontStyle: 'bold' });
        y = addWrappedText(`Match: ${item.matchPercentage}%`, margin + 5, y, { fontSize: 10 });
        if (item.reasoning) {
             y = addWrappedText(`Reasoning: ${item.reasoning}`, margin + 5, y, { fontSize: 10 });
        }
        y = addWrappedText(`Improvement Feedback: ${item.improvementFeedback}`, margin + 5, y, { fontSize: 10 });
        y += 7;
      });
    });

    doc.save(`accreditation_analysis_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleSubmitForReview = async () => {
    if (!analysisResults || !programContent) {
        setError("Cannot submit for review: analysis results or program content is missing.");
        return;
    }
    setIsSubmitting(true);
    setError(null);

    let submissionMessage = "Your analysis has been successfully submitted for review.";
    if (revisingSubmissionInfo) {
        console.log(`This is a resubmission of submission ID: ${revisingSubmissionInfo.id}`);
        submissionMessage = "Your revised analysis has been successfully submitted for review.";
    }

    const newSubmission: Submission = {
        id: crypto.randomUUID(),
        submittedByUsername: currentUser.username,
        submittedByUserRole: currentUser.role,
        submittedAt: new Date().toISOString(),
        programContent,
        programContentLanguage,
        analysisResults,
        selectedBodyKeys,
        status: 'pending',
        notes: revisingSubmissionInfo?.notes || [], 
    };

    try {
        const storedSubmissions = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS_KEY);
        const submissions: Submission[] = storedSubmissions ? JSON.parse(storedSubmissions) : [];
        submissions.push(newSubmission);
        localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_KEY, JSON.stringify(submissions));
        
        setAnalysisResults(null);
        setProgramContent("");
        setSelectedBodyKeys([]);
        setHasPendingSubmission(true);
        setRevisingSubmissionInfo(null); 
        setError("You have a submission pending review. Please wait for Admin/Lead approval before making a new submission.");
        alert(submissionMessage);

        
        if (currentUser.role === 'University ID') {
            const allSubmissionsData: Submission[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS_KEY) || '[]');
            const userSubmissions = allSubmissionsData.filter(s => s.submittedByUsername === currentUser.username);
            setUserPastSubmissions(userSubmissions.filter(s => s.status === 'approved' || s.status === 'rejected').sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
        }

    } catch (e:any) {
        console.error("Failed to save submission:", e);
        setError(`Failed to submit for review: ${e.message}. Please try again.`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleLoadForRevision = (submissionToRevise: Submission) => {
    setProgramContent(submissionToRevise.programContent);
    setSelectedBodyKeys(submissionToRevise.selectedBodyKeys);
    setAnalysisResults(null); 
    setError(null);
    setHasPendingSubmission(false); 
    setRevisingSubmissionInfo({ 
        id: submissionToRevise.id, 
        originalStatus: submissionToRevise.status,
        notes: submissionToRevise.notes 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };


  const handleOpenSubmissionForReview = (submission: Submission) => {
    setSelectedSubmissionForReview(submission);
  };

  const handleCloseSubmissionReviewModal = (refreshList?: boolean) => {
    setSelectedSubmissionForReview(null);
    if (refreshList) {
        const storedSubmissions = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS_KEY);
        const allSubmissionsData: Submission[] = storedSubmissions ? JSON.parse(storedSubmissions) : [];
        
        const currentUserOwnPastSubmissions = allSubmissionsData.filter(
            s => s.submittedByUsername === currentUser.username && (s.status === 'approved' || s.status === 'rejected')
        ).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setUserPastSubmissions(currentUserOwnPastSubmissions);

        if (currentUser.role === 'Admin' || currentUser.role === 'University Lead') {
            setSubmissionsForReview(allSubmissionsData.filter(s => s.status === 'pending').sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
        } else if (currentUser.role === 'University ID') {
             const userSubmissions = allSubmissionsData.filter(s => s.submittedByUsername === currentUser.username);
             const userPendingSubmission = userSubmissions.find(s => s.status === 'pending');
             setHasPendingSubmission(!!userPendingSubmission);
             if (!userPendingSubmission && !revisingSubmissionInfo) setError(null); 
        }
        loadUserSubmissionNotifications(); 
    }
  };
  
  const canModifyData = currentUser.role === 'Admin' || currentUser.role === 'University Lead' || currentUser.role === 'University ID';
  const mainAnalysisDisabled = isLoading || isFileParsing || isSubmitting || (hasPendingSubmission && currentUser.role === 'University ID' && !revisingSubmissionInfo);

  const handleOpenSubmissionNotificationsModal = () => {
    loadUserSubmissionNotifications(); 
    setShowSubmissionNotificationsModal(true);
  };

  const handleCloseSubmissionNotificationsModal = () => {
    markSubmissionNotificationsAsReadInStorage(currentUser.username);
    setShowSubmissionNotificationsModal(false);
    loadUserSubmissionNotifications(); 
  };

  const currentYear = new Date().getFullYear();
  
  const showPastSubmissionsSection = userPastSubmissions.length > 0 && !revisingSubmissionInfo &&
    (
      (currentUser.role === 'University ID' && !hasPendingSubmission) ||
      currentUser.role === 'Admin' || 
      currentUser.role === 'University Lead'
    );


  return (
    <div className="accreditation-analyzer">
      <header className="analyzer-header">
        <span className="header-trademark">DentEdTech&trade;</span>
        <h1>Dental Program Accreditation Analyzer</h1>
        <p className="analyzer-subtitle">Match your program content against selected ADA, GDC, or NCAAA standards.</p>
      </header>

      {showPastSubmissionsSection && (
        <section className="past-submissions-section container">
            <h3>Your Past Submissions</h3>
            <ul className="past-submission-list">
                {userPastSubmissions.map(sub => (
                    <li key={sub.id} className="past-submission-item card">
                        <div>
                            <p><strong>Submission ID:</strong> {sub.id.substring(0,8)}...</p>
                            <p><strong>Date:</strong> {new Date(sub.submittedAt).toLocaleDateString()}</p>
                            <p><strong>Status:</strong> <span className={`status-badge status-${sub.status.replace(/\s+/g, '-').toLowerCase()}`}>{sub.status === 'rejected' ? 'Returned for Revision' : sub.status}</span></p>
                            {sub.notes && sub.notes.length > 0 && (
                                <p><strong>Notes from Reviewer:</strong> Yes ({sub.notes.length})</p>
                            )}
                        </div>
                        <button onClick={() => handleLoadForRevision(sub)} className="action-button secondary-button revise-button">
                            <span className="icon">edit_document</span> Load & Revise
                        </button>
                    </li>
                ))}
            </ul>
        </section>
      )}

      {revisingSubmissionInfo && (
        <>
            {revisingSubmissionInfo.originalStatus === 'rejected' && (
                 <div className="info-message revision-info container">
                    <span className="icon">info</span>
                    This submission was 'Returned for Revision'. Please address the reviewer's notes (shown below, if any) and your analysis feedback before resubmitting.
                </div>
            )}
            {revisingSubmissionInfo.notes && revisingSubmissionInfo.notes.length > 0 && (
            <section className="revision-notes-display container">
                <h3>Reviewer Notes for Submission ID: {revisingSubmissionInfo.id.substring(0,8)}...</h3>
                <div className="notes-list-readonly">
                    {revisingSubmissionInfo.notes.map((note, index) => (
                        <div key={index} className="note-item-readonly card">
                            <p><strong>By:</strong> {note.by} ({note.role}) at {new Date(note.timestamp).toLocaleString()}</p>
                            <p>{note.text}</p>
                        </div>
                    ))}
                </div>
            </section>
            )}
        </>
      )}


      <section className="input-section container">
        <h2>1. Select Accreditation Bodies & Provide Content</h2>
        <div className="form-group">
          <label id="accreditation-body-label">Accreditation Bodies (select one or more):</label>
          <div className="checkbox-group" role="group" aria-labelledby="accreditation-body-label">
            {ACCREDITATION_BODIES.map(body => (
              <div key={body.key} className="checkbox-item">
                <input
                  type="checkbox"
                  id={`body-${body.key}`}
                  value={body.key}
                  checked={selectedBodyKeys.includes(body.key)}
                  onChange={() => handleBodySelectionChange(body.key)}
                  disabled={mainAnalysisDisabled && !revisingSubmissionInfo}
                />
                <label htmlFor={`body-${body.key}`}>{body.name}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="program-content">Program/Course Content (Detected Language: {programContentLanguage}):</label>
          <textarea
            id="program-content"
            value={programContent}
            onChange={(e) => setProgramContent(e.target.value)}
            placeholder={ (hasPendingSubmission && currentUser.role === 'University ID' && !revisingSubmissionInfo) ? "Awaiting review for your previous submission. You can load a past submission to revise from the section below." : "Paste your program content, or upload a .txt, .pdf, or .docx file below."}
            rows={15}
            disabled={(mainAnalysisDisabled && !revisingSubmissionInfo) || !canModifyData }
            readOnly={(!canModifyData && programContent !== "") || (hasPendingSubmission && currentUser.role === 'University ID' && !revisingSubmissionInfo)}
            aria-label="Program or Course Content Input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="file-upload">Or Upload a file:</label>
          <input
            type="file"
            id="file-upload"
            accept=".txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            disabled={(mainAnalysisDisabled && !revisingSubmissionInfo) || !canModifyData}
            aria-label="Upload Program Content File"
          />
          <small className="file-upload-note">Supports .txt, .pdf, and .docx files. {canModifyData && !((hasPendingSubmission && currentUser.role === 'University ID' && !revisingSubmissionInfo)) ? "" : "File upload and content editing may be disabled."}</small>
        </div>

        <button
            onClick={handleSubmitAnalysis}
            disabled={(mainAnalysisDisabled && !revisingSubmissionInfo) || !programContent.trim() || selectedBodyKeys.length === 0}
            aria-live="polite"
            className="action-button primary-action-button"
        >
          <span className="icon">cognition</span>
          {isLoading ? 'Analyzing...' : (isFileParsing ? 'Processing File...' : (isSubmitting ? 'Submitting...' : 'Analyze Content'))}
        </button>
      </section>

      {(isLoading || isFileParsing || isSubmitting) && (
        <div className="loading-indicator" role="status" aria-live="assertive">
            {isFileParsing ? 'Processing file, please wait...' : (isLoading ? `Analyzing content against ${selectedBodyKeys.length} accreditation bod${selectedBodyKeys.length > 1 ? 'ies' : 'y'}...` : (isSubmitting ? 'Submitting for review...' : 'Loading...'))}
        </div>
      )}
      {error && <div className="error-message" role="alert" dangerouslySetInnerHTML={{ __html: error.replace(/\n/g, '<br />') }}></div>}

      {analysisResults && !isLoading && !isFileParsing && analysisResults.length > 0 && (
        <section className="results-section container" aria-labelledby="analysis-results-heading">
          <div className="analysis-results-header">
            <h2 id="analysis-results-heading">Analysis Results</h2>
            <p className="disclaimer-note results-disclaimer">
                <span className="icon" style={{fontSize: '1.2em', marginRight: '0.3em'}}>info</span>
                <strong>AI Analysis Disclaimer:</strong> This AI-generated analysis provides guidance and suggestions based on the provided content and selected standards. It is intended as a supportive tool and NOT a substitute for expert human review or official accreditation decisions. Final interpretation and compliance responsibility rests with the user and the respective accreditation bodies.
            </p>
            <div className="results-actions">
              <button onClick={handleDownloadPdfReport} className="action-button">
                <span className="icon">picture_as_pdf</span> Download PDF Report
              </button>
              <button onClick={() => setShowPrintableReport(true)} className="action-button">
                <span className="icon">print</span> Show Printable Report
              </button>
            </div>
          </div>

          {analysisResults.map(resultGroup => (
            <div key={resultGroup.accreditationBodyKey} className="accreditation-result-group card">
              <div className="accreditation-result-group-header">
                <h3>{resultGroup.accreditationBodyName}</h3>
                <button onClick={() => handleShowSummaryChart(resultGroup.accreditationBodyKey)} className="action-button chart-button">
                  <span className="icon">bar_chart</span> View Summary Chart
                </button>
              </div>
              
              <ul className="results-list">
                {resultGroup.items.map((item) => (
                  <li key={item.standardId} className="result-item card compact">
                    <h4>{item.standardName} <span className="standard-id">({item.standardId})</span></h4>
                    <div className="match-percentage">
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar"
                                style={{ width: `${item.matchPercentage}%`, backgroundColor: item.matchPercentage >= 75 ? 'var(--success-color)' : item.matchPercentage >= 50 ? '#ffc107' : 'var(--error-color)' }}
                                role="progressbar"
                                aria-valuenow={item.matchPercentage}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                title={`${item.matchPercentage}% Match`}
                            >
                                {item.matchPercentage}%
                            </div>
                        </div>
                        <span className="percentage-text">{item.matchPercentage}% Match</span>
                    </div>
                    {item.reasoning && <p className="reasoning-text"><strong>Reasoning:</strong> {item.reasoning}</p>}
                    <p className="feedback-text"><strong>Improvement Feedback:</strong> {item.improvementFeedback}</p>
                    <button onClick={() => handleOpenTrainingChatbot(item.standardId, resultGroup.accreditationBodyKey)} className="action-button training-button">
                      <span className="icon">model_training</span> Open Training Chatbot
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          
          {canModifyData && (currentUser.role === 'University ID' || currentUser.role === 'University Lead' || currentUser.role === 'Admin') && (
            <div className="submit-review-action">
                <button onClick={handleSubmitForReview} disabled={isSubmitting} className="action-button primary-action-button submit-for-review-button">
                  <span className="icon">approval</span> {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                </button>
                {revisingSubmissionInfo && (
                     <button onClick={() => {
                         setRevisingSubmissionInfo(null);
                         setProgramContent("");
                         setAnalysisResults(null);
                         setSelectedBodyKeys([]);
                         setError(hasPendingSubmission && currentUser.role === 'University ID' ? "You have a submission pending review. Please wait for Admin/Lead approval before making a new submission." : null);
                     }} className="action-button secondary-button">
                        <span className="icon">cancel</span> Cancel Revision & Start New
                    </button>
                )}
            </div>
          )}
        </section>
      )}

      {showPrintableReport && analysisResults && (
        <div className="modal-overlay printable-report-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="printable-report-title">
            <div className="modal-content printable-report-modal-content">
                <header className="modal-header">
                    <h3 id="printable-report-title">Printable Analysis Report</h3>
                    <button onClick={() => setShowPrintableReport(false)} className="close-modal-button" aria-label="Close printable report">
                        <span className="icon">close</span>
                    </button>
                </header>
                <div className="modal-body">
                    <div className="printable-report-header">
                        <h2>Accreditation Analysis Report</h2>
                        <p>Generated by: DentEdTech™ Accreditation Analyzer</p>
                        <p>Analyzed For: {currentUser.username} ({currentUser.role})</p>
                        <p>Date: {new Date().toLocaleDateString()}</p>
                        <p className="disclaimer-note">
                            <strong>AI Analysis Disclaimer:</strong> This AI-generated analysis provides guidance and suggestions. It is a supportive tool, not a substitute for expert human review or official accreditation decisions.
                        </p>
                    </div>

                    {analysisResults.map(resultGroup => (
                        <div key={`print-${resultGroup.accreditationBodyKey}`} className="printable-group">
                            <h3>Accreditation Body: {resultGroup.accreditationBodyName}</h3>
                            <table className="results-table">
                                <thead>
                                <tr>
                                    <th>Standard ID</th>
                                    <th>Standard Name</th>
                                    <th>Match (%)</th>
                                    <th>Improvement Feedback</th>
                                    {resultGroup.items.some(item => item.reasoning) && <th>Reasoning</th>}
                                </tr>
                                </thead>
                                <tbody>
                                {resultGroup.items.map(item => (
                                    <tr key={`print-item-${item.standardId}`}>
                                    <td>{item.standardId}</td>
                                    <td>{item.standardName}</td>
                                    <td>{item.matchPercentage}</td>
                                    <td>{item.improvementFeedback}</td>
                                    {resultGroup.items.some(i => i.reasoning) && <td>{item.reasoning || 'N/A'}</td>}
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                    <div className="signature-section">
                        <div className="signature-line">
                            <label htmlFor="sig-self">Signature (User):</label>
                            <input type="text" id="sig-self" />
                        </div>
                        <div className="date-line">
                            <label htmlFor="date-self">Date:</label>
                            <input type="text" id="date-self" />
                        </div>
                    </div>
                </div>
                <footer className="modal-footer">
                    <button onClick={() => window.print()} className="action-button print-button"><span className="icon">print</span> Print Report</button>
                    <button onClick={() => setShowPrintableReport(false)} className="action-button">Close</button>
                </footer>
            </div>
        </div>
      )}

      {(currentUser.role === 'Admin' || currentUser.role === 'University Lead') && submissionsForReview.length > 0 && (
        <section className="review-submissions-section container">
            <h2>Submissions Pending Review ({submissionsForReview.length})</h2>
            <ul className="review-submission-list">
                {submissionsForReview.map(sub => (
                    <li key={sub.id} className="review-submission-item card">
                        <div>
                            <p><strong>ID:</strong> {sub.id.substring(0,8)}...</p>
                            <p><strong>By:</strong> {sub.submittedByUsername} ({sub.submittedByUserRole})</p>
                            <p><strong>Date:</strong> {new Date(sub.submittedAt).toLocaleDateString()}</p>
                            <p><strong>Bodies:</strong> {sub.selectedBodyKeys.join(', ')}</p>
                        </div>
                        <button onClick={() => handleOpenSubmissionForReview(sub)} className="action-button primary-action-button">
                           <span className="icon">rate_review</span> Open for Review
                        </button>
                    </li>
                ))}
            </ul>
        </section>
      )}
      {currentUser.role === 'University ID' && hasPendingSubmission && !revisingSubmissionInfo && (
         <section className="info-message pending-review-info container">
            <span className="icon">hourglass_top</span>
            You have a submission currently pending review. You will be notified once it has been processed. You can load a past submission to revise if needed.
        </section>
      )}


      {/* Modals */}
      {showTrainingChatbot && chatbotContext && (
        <TrainingChatbot
          isOpen={showTrainingChatbot}
          onClose={() => setShowTrainingChatbot(false)}
          standard={chatbotContext.standard}
          initialFeedback={chatbotContext.initialFeedback}
          accreditationBodyName={chatbotContext.accreditationBodyName}
          programContentLanguage={chatbotContext.programContentLanguage}
          googleGenAI={ai}
        />
      )}
      {selectedSubmissionForReview && (
        <SubmissionReviewModal
            isOpen={!!selectedSubmissionForReview}
            onClose={handleCloseSubmissionReviewModal}
            submission={selectedSubmissionForReview}
            currentUser={currentUser}
            addNotification={addSubmissionNotificationToStorage}
        />
      )}
       {showSummaryChartModal && summaryChartData && (
        <SummaryChartModal
          isOpen={showSummaryChartModal}
          onClose={() => setShowSummaryChartModal(false)}
          chartConfig={summaryChartData}
          accreditationBodyName={summaryChartData.accreditationBodyName}
        />
      )}
      <IntegrationsModal isOpen={showIntegrationsModal} onClose={() => setShowIntegrationsModal(false)} />
      <ExternalTrainingModal 
        isOpen={showExternalTrainingModal} 
        onClose={() => setShowExternalTrainingModal(false)}
        googleGenAI={ai}
        accreditationBodies={ACCREDITATION_BODIES}
      />
      <InternalMessagesModal 
        isOpen={showInternalMessagesModal} 
        onClose={() => {
            setShowInternalMessagesModal(false);
            loadInternalMessagesForUser(); // Refresh count on close
        }}
        currentUser={currentUser}
      />
      <NotificationsModal
        isOpen={showSubmissionNotificationsModal}
        onClose={handleCloseSubmissionNotificationsModal}
        notifications={currentUserSubmissionNotifications}
        onClearRead={() => clearReadSubmissionNotificationsFromStorage(currentUser.username)}
        title="Submission Notifications"
      />
       {showUserManagementModal && (
          <UserManagementModal
            isOpen={showUserManagementModal}
            onClose={() => setShowUserManagementModal(false)}
            currentUserRole={currentUser.role}
            currentUser={currentUser}
          />
       )}
       {showTechnicalSupportModal && (
          <TechnicalSupportModal
            isOpen={showTechnicalSupportModal}
            onClose={() => setShowTechnicalSupportModal(false)}
            currentUser={currentUser}
            googleGenAI={ai}
            onOpenInternalMessages={() => {
                setShowTechnicalSupportModal(false); // Close support modal
                setShowInternalMessagesModal(true); // Open messages modal
            }}
          />
       )}


      <footer className="app-footer">
        <div className="user-actions-panel">
            <div className="user-info">
                Logged in as: <strong>{currentUser.username}</strong> ({currentUser.role})
            </div>
            <div className="action-buttons-group">
                <button onClick={handleOpenSubmissionNotificationsModal} className="footer-action-button" title="Submission Notifications">
                    <span className="icon">notifications</span>
                    {unreadSubmissionNotificationCount > 0 && <span className="badge">{unreadSubmissionNotificationCount}</span>}
                </button>
                 <button onClick={() => setShowInternalMessagesModal(true)} className="footer-action-button" title="Internal Messages">
                    <span className="icon">mail</span>
                    {unreadInternalMessagesCount > 0 && <span className="badge">{unreadInternalMessagesCount}</span>}
                </button>
                <button onClick={() => setShowExternalTrainingModal(true)} className="footer-action-button" title="External Training & Resources">
                    <span className="icon">school</span>
                </button>
                {(currentUser.role === 'Admin' || currentUser.role === 'University Lead') && (
                    <button onClick={() => setShowUserManagementModal(true)} className="footer-action-button" title="User Management">
                        <span className="icon">manage_accounts</span>
                    </button>
                )}
                {currentUser.role === 'Admin' && (
                    <button onClick={() => setShowIntegrationsModal(true)} className="footer-action-button" title="Integrations & Settings">
                        <span className="icon">settings</span>
                    </button>
                )}
                 <button onClick={() => setShowTechnicalSupportModal(true)} className="footer-action-button" title="Technical Support">
                    <span className="icon">support_agent</span>
                </button>
                <button onClick={onLogout} className="footer-action-button logout-button" title="Logout">
                    <span className="icon">logout</span> Logout
                </button>
            </div>
        </div>
        <p>DentEdTech&trade; &copy; {currentYear}. All rights reserved. AI-powered analysis for educational excellence.</p>
        <p className="version-info">Version 1.1.0 (Vite Build)</p>
      </footer>
    </div>
  );
};

export default AccreditationAnalyzer;
