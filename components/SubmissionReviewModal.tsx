/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent } from 'react';
import type { User, UserRole } from '../App'; // Ensure UserRole is imported if used directly
import type { Submission, Notification, SubmissionNote } from './AccreditationAnalyzer';
import './SubmissionReviewModal.css'; 

interface SubmissionReviewModalProps {
  isOpen: boolean;
  onClose: (refreshList?: boolean) => void;
  submission: Submission;
  currentUser: User;
  addNotification: (notification: Notification) => void;
}

const LOCAL_STORAGE_SUBMISSIONS_KEY = 'accreditationSubmissions';

const SubmissionReviewModal: React.FC<SubmissionReviewModalProps> = ({
  isOpen,
  onClose,
  submission,
  currentUser,
  addNotification,
}) => {
  const [showPrintable, setShowPrintable] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [currentSubmissionNotes, setCurrentSubmissionNotes] = useState<SubmissionNote[]>(submission.notes || []);
  const [newNoteText, setNewNoteText] = useState('');

  if (!isOpen) return null;

  const handleUpdateSubmissionStatus = (newStatus: 'approved' | 'rejected') => {
    setIsActionLoading(true);
    try {
      const storedSubmissions = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS_KEY);
      let submissions: Submission[] = storedSubmissions ? JSON.parse(storedSubmissions) : [];
      const submissionIndex = submissions.findIndex(s => s.id === submission.id);

      if (submissionIndex > -1) {
        submissions[submissionIndex].status = newStatus;
        // Persist current notes along with status change
        submissions[submissionIndex].notes = currentSubmissionNotes; 
        localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_KEY, JSON.stringify(submissions));
        
        const notificationForSubmitter: Notification = {
            id: crypto.randomUUID(),
            recipientUsername: submission.submittedByUsername,
            message: `Your submission (ID: ${submission.id.substring(0,8)}...) has been ${newStatus}.`,
            timestamp: new Date().toISOString(),
            isRead: false,
            relatedSubmissionId: submission.id,
        };
        addNotification(notificationForSubmitter);

        alert(`Submission has been ${newStatus}.`);
        onClose(true); 
      } else {
        alert("Error: Could not find the submission to update.");
        onClose(false);
      }
    } catch (error) {
      console.error("Error updating submission status:", error);
      alert("An error occurred while updating the submission status.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) {
        alert("Note text cannot be empty.");
        return;
    }
    const newNote: SubmissionNote = {
        by: currentUser.username,
        role: currentUser.role,
        timestamp: new Date().toISOString(),
        text: newNoteText.trim(),
    };
    const updatedNotes = [...currentSubmissionNotes, newNote];
    setCurrentSubmissionNotes(updatedNotes);

    // Persist notes change to localStorage immediately
    try {
        const storedSubmissions = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS_KEY);
        let submissions: Submission[] = storedSubmissions ? JSON.parse(storedSubmissions) : [];
        const submissionIndex = submissions.findIndex(s => s.id === submission.id);
        if (submissionIndex > -1) {
            submissions[submissionIndex].notes = updatedNotes;
            localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_KEY, JSON.stringify(submissions));
            setNewNoteText(''); // Clear input
        } else {
            alert("Error: Could not find the submission to add note.");
        }
    } catch (error) {
        console.error("Error adding note to submission:", error);
        alert("An error occurred while adding the note.");
    }
  };


  const downloadReportForSubmission = () => {
    let content = `Accreditation Analysis Report (Submission ID: ${submission.id})\n`;
    content += `Submitted By: ${submission.submittedByUsername} (${submission.submittedByUserRole})\n`;
    content += `Submitted At: ${new Date(submission.submittedAt).toLocaleString()}\n`;
    content += `Reviewed By: ${currentUser.username} (${currentUser.role})\n`;
    content += `Date of Review: ${new Date().toLocaleDateString()}\n\n`;
    content += `Program Content Language: ${submission.programContentLanguage}\n\n`;
    // content += `Program Content:\n\`\`\`\n${submission.programContent}\n\`\`\`\n\n`;


    submission.analysisResults.forEach(resultGroup => {
      content += `============================================\n`;
      content += `Accreditation Body: ${resultGroup.accreditationBodyName}\n`;
      content += `============================================\n\n`;
      resultGroup.items.forEach(item => {
        content += `Standard: ${item.standardName} (${item.standardId})\n`;
        content += `Match: ${item.matchPercentage}%\n`;
        content += `Feedback: ${item.improvementFeedback}\n\n`;
      });
    });

    if (currentSubmissionNotes.length > 0) {
        content += `============================================\n`;
        content += `Reviewer Notes\n`;
        content += `============================================\n\n`;
        currentSubmissionNotes.forEach(note => {
            content += `Note by: ${note.by} (${note.role}) on ${new Date(note.timestamp).toLocaleString()}\n`;
            content += `${note.text}\n\n`;
        });
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `submission_review_${submission.id}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="modal-overlay submission-review-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="submission-review-title">
      <div className="modal-content submission-review-modal-content">
        <header className="modal-header">
          <h3 id="submission-review-title">Review Submission (ID: {submission.id.substring(0,8)}...)</h3>
          <button onClick={() => onClose(false)} className="close-modal-button" aria-label="Close submission review">
            <span className="icon">close</span>
          </button>
        </header>
        <div className="modal-body">
            <p className="disclaimer"><strong>Note:</strong> This approval workflow is a client-side simulation using browser storage. Data is not persisted securely.</p>
            <div className="submission-meta">
                <p><strong>Submitted By:</strong> {submission.submittedByUsername} ({submission.submittedByUserRole})</p>
                <p><strong>Submitted At:</strong> {new Date(submission.submittedAt).toLocaleString()}</p>
                <p><strong>Status:</strong> <span className={`status-badge status-${submission.status}`}>{submission.status}</span></p>
                <p><strong>Content Language:</strong> {submission.programContentLanguage}</p>
                <p><strong>Selected Bodies:</strong> {submission.selectedBodyKeys.join(', ')}</p>
            </div>

            <div className="submission-content-preview">
                <h4>Program Content Preview:</h4>
                <textarea value={submission.programContent} readOnly rows={8} aria-label="Submitted program content preview"></textarea>
            </div>

            <h4>Analysis Results:</h4>
            {submission.analysisResults.map(resultGroup => (
                <div key={resultGroup.accreditationBodyKey} className="accreditation-result-group card compact">
                <h5>Results for {resultGroup.accreditationBodyName}</h5>
                {resultGroup.items.map((item) => (
                    <div key={item.standardId} className="result-item card compact">
                    <h6>{item.standardName} <span className="standard-id">({item.standardId})</span></h6>
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
                    <p><strong>Feedback:</strong> {item.improvementFeedback}</p>
                    </div>
                ))}
                </div>
            ))}

            <div className="submission-notes-section">
                <h4>Reviewer Notes:</h4>
                {currentSubmissionNotes.length === 0 ? (
                    <p>No notes added yet.</p>
                ) : (
                    <ul className="notes-list">
                        {currentSubmissionNotes.map((note, index) => (
                            <li key={index} className="note-item card">
                                <p className="note-meta"><strong>By:</strong> {note.by} ({note.role}) on {new Date(note.timestamp).toLocaleString()}</p>
                                <p className="note-text">{note.text}</p>
                            </li>
                        ))}
                    </ul>
                )}
                {submission.status === 'pending' && (
                    <div className="add-note-form">
                        <h5>Add New Note:</h5>
                        <textarea 
                            rows={3} 
                            value={newNoteText} 
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewNoteText(e.target.value)}
                            placeholder="Type your note here..."
                            aria-label="New note text"
                        />
                        <button onClick={handleAddNote} className="action-button add-note-button" disabled={isActionLoading}>
                            <span className="icon">add_comment</span> Add Note
                        </button>
                    </div>
                )}
            </div>


             {showPrintable && (
                 <section className="printable-report-modal nested" role="dialog" aria-modal="true" aria-labelledby="nested-printable-report-title">
                    <div className="printable-report-content container">
                        <div className="printable-report-header">
                            <h2 id="nested-printable-report-title">Printable Analysis Report (Submission)</h2>
                             <button onClick={() => setShowPrintable(false)} className="close-modal-button back-button" aria-label="Back to submission details">
                                <span className="icon">arrow_back</span> Back to Submission Details
                            </button>
                        </div>
                        <p><strong>Submission ID:</strong> {submission.id.substring(0,8)}...</p>
                        <p><strong>Submitted By:</strong> {submission.submittedByUsername} ({submission.submittedByUserRole})</p>
                        <p><strong>Submitted At:</strong> {new Date(submission.submittedAt).toLocaleString()}</p>
                        <p><strong>Reviewed By:</strong> {currentUser.username} ({currentUser.role})</p>
                        <p><strong>Date of Review:</strong> {new Date().toLocaleDateString()}</p>

                        {submission.analysisResults.map(resultGroup => (
                            <div key={`print-submission-${resultGroup.accreditationBodyKey}`} className="printable-group">
                                <h3>Accreditation Body: {resultGroup.accreditationBodyName}</h3>
                                <table className="results-table">
                                    <thead>
                                    <tr>
                                        <th>Standard ID</th>
                                        <th>Standard Name</th>
                                        <th>Match (%)</th>
                                        <th>Improvement Feedback</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {resultGroup.items.map(item => (
                                        <tr key={`print-submission-item-${item.standardId}`}>
                                        <td>{item.standardId}</td>
                                        <td>{item.standardName}</td>
                                        <td>{item.matchPercentage}</td>
                                        <td>{item.improvementFeedback}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                        {currentSubmissionNotes.length > 0 && (
                            <div className="printable-group">
                                <h3>Reviewer Notes</h3>
                                {currentSubmissionNotes.map((note, index) => (
                                    <div key={`print-note-${index}`} className="printable-note-item">
                                        <p><strong>By:</strong> {note.by} ({note.role}) on {new Date(note.timestamp).toLocaleString()}</p>
                                        <p>{note.text}</p>
                                        <hr />
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="signature-section">
                            <div className="signature-line">
                                <label htmlFor="sig-submission">Signature (Reviewer):</label>
                                <input type="text" id="sig-submission" readOnly />
                            </div>
                            <div className="date-line">
                                <label htmlFor="date-submission">Date:</label>
                                <input type="text" id="date-submission" readOnly />
                            </div>
                        </div>
                        <button onClick={() => window.print()} className="print-button action-button">
                            <span className="icon">print</span> Print This Submission Report
                        </button>
                    </div>
                </section>
            )}


        </div>
        <footer className="modal-footer submission-actions">
          {submission.status === 'pending' && (
            <>
              <button onClick={() => handleUpdateSubmissionStatus('approved')} className="action-button approve-button" disabled={isActionLoading}>
                <span className="icon">thumb_up</span> {isActionLoading ? 'Approving...' : 'Approve Submission'}
              </button>
              <button onClick={() => handleUpdateSubmissionStatus('rejected')} className="action-button reject-button" disabled={isActionLoading}>
                <span className="icon">thumb_down</span> {isActionLoading ? 'Rejecting...' : 'Reject Submission'}
              </button>
            </>
          )}
           {(submission.status === 'approved' || submission.status === 'rejected') && (
              <p>This submission has already been {submission.status}.</p>
           )}
           <button onClick={downloadReportForSubmission} className="action-button" disabled={isActionLoading}><span className="icon">download</span> Download Report</button>
           <button onClick={() => setShowPrintable(true)} className="action-button" disabled={isActionLoading}><span className="icon">print</span> Show Printable Report</button>
          <button onClick={() => onClose(false)} className="action-button close-button" disabled={isActionLoading}>Close</button>
        </footer>
      </div>
    </div>
  );
};

export default SubmissionReviewModal;