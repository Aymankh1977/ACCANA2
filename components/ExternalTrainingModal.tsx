/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AccreditationBody, Standard } from './AccreditationAnalyzer';
import './ExternalTrainingModal.css';

interface ExternalTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleGenAI: GoogleGenAI;
  accreditationBodies: AccreditationBody[];
}

type ActiveTab = 'aiWorkshop' | 'aiPortfolio' | 'officialLinks';

const ExternalTrainingModal: React.FC<ExternalTrainingModalProps> = ({
  isOpen,
  onClose,
  googleGenAI,
  accreditationBodies,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('aiWorkshop');

  // AI Workshop Helper State
  const [workshopTopic, setWorkshopTopic] = useState('');
  const [workshopIdeas, setWorkshopIdeas] = useState<string | null>(null);
  const [isFetchingWorkshopIdeas, setIsFetchingWorkshopIdeas] = useState(false);
  const [workshopError, setWorkshopError] = useState<string | null>(null);

  // AI Portfolio Examples State
  const [selectedBodyKeyForPortfolio, setSelectedBodyKeyForPortfolio] = useState<string>(accreditationBodies[0]?.key || '');
  const [availableStandardsForPortfolio, setAvailableStandardsForPortfolio] = useState<Standard[]>(accreditationBodies[0]?.standards || []);
  const [selectedStandardIdForPortfolio, setSelectedStandardIdForPortfolio] = useState<string>(accreditationBodies[0]?.standards[0]?.id || '');
  const [portfolioExamples, setPortfolioExamples] = useState<string | null>(null);
  const [isFetchingPortfolioExamples, setIsFetchingPortfolioExamples] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  
  useEffect(() => {
    const body = accreditationBodies.find(b => b.key === selectedBodyKeyForPortfolio);
    if (body) {
      setAvailableStandardsForPortfolio(body.standards);
      setSelectedStandardIdForPortfolio(body.standards[0]?.id || ''); 
    } else {
      setAvailableStandardsForPortfolio([]);
      setSelectedStandardIdForPortfolio('');
    }
  }, [selectedBodyKeyForPortfolio, accreditationBodies]);


  const handleGenerateWorkshopIdeas = async () => {
    if (!workshopTopic.trim()) {
      setWorkshopError("Please enter a topic for the workshop.");
      return;
    }
    setIsFetchingWorkshopIdeas(true);
    setWorkshopIdeas(null);
    setWorkshopError(null);
    try {
      const prompt = `
        You are an AI assistant helping to create a concise workshop outline for dental faculty on accreditation topics.
        The user-provided topic is: "${workshopTopic}".

        Please generate a structured workshop outline using Markdown for formatting. The outline should include:
        - A suggested Workshop Title.
        - Target Audience (e.g., Dental Faculty, Program Coordinators).
        - 2-3 clear Learning Objectives.
        - Key Topics/Modules (list 2-4 main points or sections).
        - One Interactive Activity or Discussion Prompt.
        - Suggested Materials (e.g., Handouts, Case studies).
        - Estimated Duration (e.g., 1 hour, 90 minutes).

        Example Markdown Structure:
        ### Workshop Title: [Generated Title Based on Topic]
        **Target Audience:** Dental Faculty
        **Learning Objectives:**
        *   Objective 1...
        *   Objective 2...
        **Key Topics/Modules:**
        *   Topic A: ...
        *   Topic B: ...
        **Interactive Activity:**
        *   Activity description...
        **Suggested Materials:**
        *   Material 1...
        **Estimated Duration:** X minutes
      `;
      const response: GenerateContentResponse = await googleGenAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
      });
      setWorkshopIdeas(response.text);
    } catch (e: any) {
      console.error("Error generating workshop ideas:", e);
      setWorkshopError(`Failed to generate ideas: ${e.message}. Please try again.`);
    } finally {
      setIsFetchingWorkshopIdeas(false);
    }
  };

  const handleGetPortfolioExamples = async () => {
    const selectedBody = accreditationBodies.find(b => b.key === selectedBodyKeyForPortfolio);
    const selectedStandard = selectedBody?.standards.find(s => s.id === selectedStandardIdForPortfolio);

    if (!selectedBody || !selectedStandard) {
      setPortfolioError("Please select a valid accreditation body and standard.");
      return;
    }
    setIsFetchingPortfolioExamples(true);
    setPortfolioExamples(null);
    setPortfolioError(null);

    try {
      const prompt = `
        You are an AI assistant specialized in dental accreditation portfolio development.
        A user needs guidance on what constitutes strong evidence for the following standard:
        Accreditation Body: ${selectedBody.name}
        Standard ID: ${selectedStandard.id}
        Standard Name: "${selectedStandard.name}"
        Standard Description: "${selectedStandard.description}"

        Please describe 2-3 *types* of documents or evidence that effectively demonstrate compliance with this specific standard.
        For each type of evidence:
        1.  Clearly name the "Evidence Type" (e.g., "Curriculum Maps", "Student Assessment Data Analysis Report", "Patient Feedback Surveys & Analysis").
        2.  Describe the "Key Elements" that this type of document should typically contain to be robust.
        3.  Explain "Why it's Effective" for demonstrating compliance with *this particular standard* ("${selectedStandard.name}"), highlighting how the key elements link to the standard's requirements.
        
        Use the following Markdown structure for each evidence type:

        #### Evidence Type: [Name of Evidence Type]
        **Key Elements:**
        *   Element 1 (e.g., Clearly defined learning outcomes linked to program competencies)
        *   Element 2 (e.g., Progression of skills/knowledge across courses)
        *   Element 3 (e.g., Alignment with current best practices in the field)
        **Why it's Effective for ${selectedStandard.id} ("${selectedStandard.name}"):**
        *   Explanation focusing on how these elements specifically address the requirements of *this* standard. For instance, "Curriculum maps visually demonstrate comprehensive planning as required by [Standard X] by showing how content is sequenced and integrated..."

        Focus on providing actionable insights and best practices for documentation.
      `;
      const response: GenerateContentResponse = await googleGenAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
      });
      setPortfolioExamples(response.text);
    } catch (e: any)      {
      console.error("Error fetching portfolio examples:", e);
      setPortfolioError(`Failed to fetch examples: ${e.message}. Please try again.`);
    } finally {
      setIsFetchingPortfolioExamples(false);
    }
  };


  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'aiWorkshop':
        return (
          <div className="tab-content">
            <h4>AI Workshop Helper</h4>
            <p>Get AI-generated outlines for structuring a mini-workshop for faculty or staff on specific accreditation topics.</p>
            <div className="form-group">
              <label htmlFor="workshopTopic">Workshop Topic:</label>
              <input
                type="text"
                id="workshopTopic"
                value={workshopTopic}
                onChange={(e) => setWorkshopTopic(e.target.value)}
                placeholder="e.g., Documenting Patient Care Competencies"
              />
            </div>
            <button onClick={handleGenerateWorkshopIdeas} disabled={isFetchingWorkshopIdeas} className="action-button">
              <span className="icon">psychology</span> {isFetchingWorkshopIdeas ? 'Generating...' : 'Generate Workshop Outline'}
            </button>
            {workshopError && <p className="error-message">{workshopError}</p>}
            {workshopIdeas && (
              <div className="ai-generated-content">
                <h5>Workshop Outline:</h5>
                <pre>{workshopIdeas}</pre>
              </div>
            )}
          </div>
        );
      case 'aiPortfolio':
        return (
          <div className="tab-content">
            <h4>AI Portfolio Evidence Helper</h4>
            <p>Get AI-generated descriptions of evidence types and key elements for specific accreditation standards.</p>
            <div className="form-group">
                <label htmlFor="portfolioBodySelect">Accreditation Body:</label>
                <select 
                    id="portfolioBodySelect" 
                    value={selectedBodyKeyForPortfolio} 
                    onChange={(e) => setSelectedBodyKeyForPortfolio(e.target.value)}
                >
                    {accreditationBodies.map(body => (
                        <option key={body.key} value={body.key}>{body.name}</option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label htmlFor="portfolioStandardSelect">Standard:</label>
                <select 
                    id="portfolioStandardSelect" 
                    value={selectedStandardIdForPortfolio}
                    onChange={(e) => setSelectedStandardIdForPortfolio(e.target.value)}
                    disabled={availableStandardsForPortfolio.length === 0}
                >
                    {availableStandardsForPortfolio.length > 0 ? (
                        availableStandardsForPortfolio.map(std => (
                            <option key={std.id} value={std.id}>{std.name} ({std.id})</option>
                        ))
                    ) : (
                        <option value="">Select an accreditation body first</option>
                    )}
                </select>
            </div>
            <button onClick={handleGetPortfolioExamples} disabled={isFetchingPortfolioExamples || !selectedStandardIdForPortfolio} className="action-button">
              <span className="icon">tips_and_updates</span> {isFetchingPortfolioExamples ? 'Fetching...' : 'Describe Strong Evidence Types'}
            </button>
            {portfolioError && <p className="error-message">{portfolioError}</p>}
            {portfolioExamples && (
              <div className="ai-generated-content">
                <h5>Strong Evidence Descriptions:</h5>
                <pre>{portfolioExamples}</pre>
              </div>
            )}
          </div>
        );
      case 'officialLinks':
        return (
          <div className="tab-content">
            <h4>Official Resources & Links</h4>
            <p>Quick links to accreditation body websites, helpful media, and contact information. These external resources provide authoritative guidance.</p>
            
            <div className="resource-category">
                <h5>Accreditation Body Guidance & Standards:</h5>
                <ul>
                    <li><a href="https://coda.ada.org/standards-and-policies/predoctoral-dental-education-programs " target="_blank" rel="noopener noreferrer">ADA CODA Predoctoral Standards & Policies</a></li>
                    <li><a href="https://www.gdc-uk.org/education-cpd/quality-assurance/standards-guidance-for-education-providers " target="_blank" rel="noopener noreferrer">GDC (UK) Standards & Guidance for Education</a></li>
                    <li><a href="https://etec.gov.sa/en/products-and-services/accreditation/ncaaa-standards " target="_blank" rel="noopener noreferrer">NCAAA (ETEC) Program Accreditation Standards</a></li>
                     <li><a href="https://etec.gov.sa/en/resource-center/guides-and-manuals " target="_blank" rel="noopener noreferrer">ETEC Guides and Manuals (Search for NCAAA)</a></li>
                </ul>
            </div>

            <div className="resource-category">
                <h5>Helpful Media (YouTube Search Links for Practical Insights):</h5>
                <ul>
                    <li><a href="https://www.youtube.com/results?search_query=preparing+for+CODA+dental+accreditation+visit " target="_blank" rel="noopener noreferrer">Search: Preparing for CODA Dental Accreditation Visit</a></li>
                    <li><a href="https://www.youtube.com/results?search_query=writing+dental+accreditation+self+study+report " target="_blank" rel="noopener noreferrer">Search: Writing Dental Accreditation Self-Study Report</a></li>
                    <li><a href="https://www.youtube.com/results?search_query=GDC+UK+dental+education+standards+explained " target="_blank" rel="noopener noreferrer">Search: GDC UK Dental Education Standards Explained</a></li>
                    <li><a href="https://www.youtube.com/results?search_query=NCAAA+ETEC+accreditation+process+guide " target="_blank" rel="noopener noreferrer">Search: NCAAA ETEC Accreditation Process Guide</a></li>
                </ul>
                 <p className="disclaimer-note"><em>Note: These links initiate searches on YouTube. DentEdTech™ is not responsible for external content. Always verify information with official sources.</em></p>
            </div>

            <div className="resource-category">
                <h5>Contact Accreditation Bodies (Official Channels):</h5>
                 <p className="disclaimer-note"><em>For official inquiries, please use the contact methods provided on the respective accreditation body websites. This app cannot facilitate direct communication.</em></p>
                <ul>
                    <li>ADA CODA: <a href="https://coda.ada.org/contact-us " target="_blank" rel="noopener noreferrer">CODA Contact Page</a></li>
                    <li>GDC (UK): <a href="https://www.gdc-uk.org/about-us/contact-us " target="_blank" rel="noopener noreferrer">GDC Contact Page</a></li>
                    <li>NCAAA (ETEC): <a href="https://etec.gov.sa/en/contactus " target="_blank" rel="noopener noreferrer">ETEC Contact Page</a></li>
                </ul>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay external-training-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="external-training-title">
      <div className="modal-content external-training-modal-content">
        <header className="modal-header">
          <h3 id="external-training-title">External Training & Resources</h3>
          <button onClick={onClose} className="close-modal-button" aria-label="Close external training modal">
            <span className="icon">close</span>
          </button>
        </header>

        <nav className="modal-tabs">
          <button onClick={() => setActiveTab('aiWorkshop')} className={activeTab === 'aiWorkshop' ? 'active' : ''}><span className="icon">emoji_objects</span> AI Workshop Helper</button>
          <button onClick={() => setActiveTab('aiPortfolio')} className={activeTab === 'aiPortfolio' ? 'active' : ''}><span className="icon">article</span> AI Portfolio Evidence</button>
          <button onClick={() => setActiveTab('officialLinks')} className={activeTab === 'officialLinks' ? 'active' : ''}><span className="icon">link</span> Official Links</button>
        </nav>

        <div className="modal-body">
          {renderContent()}
        </div>

        <footer className="modal-footer">
          <button onClick={onClose} className="action-button primary-action-button">Close</button>
        </footer>
      </div>
    </div>
  );
};

export default ExternalTrainingModal;