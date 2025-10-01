/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse, Content } from "@google/genai";
import type { Standard, ProgramContentLanguage } from './AccreditationAnalyzer';
import './TrainingChatbot.css';

interface TrainingChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  standard: Standard;
  initialFeedback: string;
  accreditationBodyName: string;
  programContentLanguage: ProgramContentLanguage;
  googleGenAI: GoogleGenAI; // Pass the initialized instance
}

interface ChatMessage {
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: Date;
}

const TrainingChatbot: React.FC<TrainingChatbotProps> = ({
  isOpen,
  onClose,
  standard,
  initialFeedback,
  accreditationBodyName,
  programContentLanguage,
  googleGenAI,
}) => {
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setMessages([]);
      setUserInput('');
      setError(null);
      setIsLoading(true);

      const characterPersona = Math.random() > 0.5 ? "Professor Accredit 🧑‍🏫" : "Dr. Standards 🧐";
      const systemInstruction = `You are ${characterPersona}, a friendly, patient, and encouraging AI assistant specializing in ${accreditationBodyName} dental accreditation standards.
      Your goal is to help the user understand and improve their program content to meet the standard: "${standard.name} (ID: ${standard.id})".
      The user's program content is in ${programContentLanguage}. Your guidance should be in English.
      The initial analysis provided this feedback: "${initialFeedback}".
      Start by warmly greeting the user, acknowledging the standard and feedback, and offering to guide them step-by-step.
      Ask open-ended questions to understand their current approach before offering specific advice.
      Break down complex concepts into simple, actionable steps. Use emojis to maintain a friendly and engaging tone.
      Do not repeat the standard description unless asked. Focus on how to *apply* and *demonstrate* compliance with the standard.
      Keep responses concise and focused on one or two points at a time to avoid overwhelming the user.
      Encourage the user and celebrate small wins.`;
      
      const initialAiGreeting = `Hello there! I'm ${characterPersona}, and I'm here to help you with the ${accreditationBodyName} standard: **"${standard.name}" (ID: ${standard.id})**. 👋
      I see the feedback is: "${initialFeedback}"
      No worries, we can work through this together! How about we start by exploring your current approach to this standard? Or, tell me what part you'd like to focus on first! 😊`;

      try {
        const chat = googleGenAI.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction },
        });
        setChatSession(chat);
        
        // Add initial system message (not displayed but good for context) and AI greeting
        setMessages([
          { sender: 'system', text: systemInstruction, timestamp: new Date() },
          { sender: 'ai', text: initialAiGreeting, timestamp: new Date() }
        ]);

      } catch (e: any) {
        console.error("Chat initialization error:", e);
        setError(`Failed to initialize chatbot: ${e.message}. Please try again.`);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isOpen, standard, initialFeedback, accreditationBodyName, programContentLanguage, googleGenAI]);

  useEffect(() => {
    // Scroll to bottom of chat history when new messages are added
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    if (!userInput.trim() || !chatSession || isLoading) return;

    const userMessage: ChatMessage = { sender: 'user', text: userInput, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response: GenerateContentResponse = await chatSession.sendMessage({ message: userMessage.text });
      const aiResponseText = response.text;
      setMessages(prev => [...prev, { sender: 'ai', text: aiResponseText, timestamp: new Date() }]);
    } catch (e: any) {
      console.error("Chat API Error:", e);
      setError(`Oops! I encountered an issue. ${e.message || 'Please try sending your message again.'}`);
      // Optionally, add the user's message back to the input if sending failed catastrophically
      // setUserInput(userMessage.text); 
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chatbot-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="chatbot-title">
      <div className="chatbot-modal-content">
        <header className="chatbot-header">
          <h3 id="chatbot-title">Training Chatbot: {standard.name}</h3>
          <button onClick={onClose} className="close-modal-button" aria-label="Close chatbot">
            <span className="icon">close</span>
          </button>
        </header>

        <div className="chatbot-history" ref={chatHistoryRef}>
          {messages.filter(msg => msg.sender !== 'system').map((msg, index) => (
            <div key={index} className={`chat-message ${msg.sender}`}>
              <div className="message-bubble">
                <span className="message-sender-name">{msg.sender === 'ai' ? 'AI Assistant' : 'You'}</span>
                <p dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }}></p>
                <span className="message-timestamp">{msg.timestamp.toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length -1]?.sender === 'user' && (
            <div className="chat-message ai">
                <div className="message-bubble">
                    <span className="message-sender-name">AI Assistant</span>
                    <p className="typing-indicator"><span>.</span><span>.</span><span>.</span></p>
                </div>
            </div>
          )}
        </div>

        {error && <p className="error-message chatbot-error" role="alert">{error}</p>}

        <form onSubmit={handleSendMessage} className="chatbot-input-form">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your message..."
            rows={3}
            disabled={isLoading || !chatSession}
            aria-label="Your message to the training chatbot"
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                }
            }}
          />
          <button type="submit" disabled={isLoading || !userInput.trim() || !chatSession}>
            <span className="icon">send</span> Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default TrainingChatbot;