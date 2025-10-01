/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, FormEvent } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { User } from '../App';
import './TechnicalSupportModal.css';

interface TechnicalSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  googleGenAI: GoogleGenAI;
  onOpenInternalMessages: () => void;
}

const TechnicalSupportModal: React.FC<TechnicalSupportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  googleGenAI,
  onOpenInternalMessages
}) => {
  const [supportQuery, setSupportQuery] = useState('');
  const [supportResponse, setSupportResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSupportQuery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supportQuery.trim()) {
      setError("Please enter a question or describe your issue.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSupportResponse(null);

    try {
      const prompt = `
        You are a helpful and knowledgeable technical support assistant for the DentEdTech™ Accreditation Analyzer application.
        The user, ${currentUser.username} (${currentUser.role}), has the following question or issue:
        
        "${supportQuery}"
        
        Please provide a clear, helpful, and actionable response. 
        If the question is about a specific feature, explain how to use it step-by-step.
        If it's a technical issue (e.g., "analysis failed", "page won't load"), suggest common troubleshooting steps like checking the browser console for errors (F12), ensuring a stable internet connection, or trying a different browser.
        If the question is about accreditation standards or content, gently redirect them to use the main analysis tool or the Training Chatbot, as your role is technical support.
        Always be polite, encouraging, and professional. Use simple language and bullet points for clarity where appropriate.
        If you cannot resolve the issue, suggest that the user contact an administrator or use the internal messaging system for further assistance.
      `;
      
      const response: GenerateContentResponse = await googleGenAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
      });
      
      setSupportResponse(response.text);
    } catch (e: any) {
      console.error("Error generating support response:", e);
      setError(`Sorry, I couldn't process your request. ${e.message || 'Please try again or contact an administrator.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay technical-support-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="technical-support-title">
      <div className="modal-content technical-support-modal-content">
        <header className="modal-header">
          <h3 id="technical-support-title">Technical Support Assistant</h3>
          <button onClick={onClose} className="close-modal-button" aria-label="Close technical support">
            <span className="icon">close</span>
          </button>
        </header>
        <div className="modal-body support-modal-body">
          <div className="support-info">
            <p>
              <strong>Welcome to the Technical Support Assistant!</strong> 
              I can help answer questions about how to use the DentEdTech™ application, troubleshoot common technical issues, and guide you to the right resources.
            </p>
            <p>
              For questions about your specific accreditation content or standards, please use the main "Training Chatbot" feature from the analysis results page.
            </p>
          </div>

          <form onSubmit={handleSupportQuery} className="support-query-form">
            <div className="form-group">
              <label htmlFor="support-query">Describe your question or issue:</label>
              <textarea
                id="support-query"
                value={supportQuery}
                onChange={(e) => setSupportQuery(e.target.value)}
                placeholder="e.g., How do I upload a file? / The analysis is taking a long time, what should I do? / I'm getting an error when I try to submit..."
                rows={4}
                disabled={isLoading}
              />
            </div>
            <button type="submit" disabled={isLoading || !supportQuery.trim()} className="action-button">
              <span className="icon">support_agent</span> {isLoading ? 'Thinking...' : 'Get Help'}
            </button>
          </form>

          {error && <p className="error-message support-error">{error}</p>}

          {supportResponse && (
            <div className="support-response">
              <h4>Support Response:</h4>
              <div className="response-content">
                <pre>{supportResponse}</pre>
              </div>
            </div>
          )}

          <div className="support-options">
            <h4>Other Support Options:</h4>
            <ul>
              <li>
                <strong>Internal Messaging:</strong> For non-urgent questions or to report issues to your Admin/Lead, use the{' '}
                <button onClick={onOpenInternalMessages} className="link-button">
                  Internal Messages
                </button> system.
              </li>
              <li>
                <strong>Browser Console:</strong> If you see an error message, pressing F12 (or right-clicking and selecting "Inspect") and checking the "Console" tab can provide more details for your IT support.
              </li>
              <li>
                <strong>Common Fixes:</strong> Try refreshing the page, clearing your browser cache, or using a different browser if you experience unexpected behavior.
              </li>
            </ul>
          </div>
        </div>
        <footer className="modal-footer">
          <button onClick={onClose} className="action-button">
            Close Support
          </button>
        </footer>
      </div>
    </div>
  );
};

export default TechnicalSupportModal;