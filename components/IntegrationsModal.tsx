/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import './IntegrationsModal.css';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleLearnMore = () => {
    alert(
      "Advanced Integrations:\n\n" +
      "LMS Integration (e.g., via LTI):\n" +
      "This would allow the Accreditation Analyzer to be embedded as a tool within Learning Management Systems like Moodle, Canvas LMS, Blackboard, etc. Key benefits include seamless user access (single sign-on) and potentially reporting analysis activity or completion back to the LMS. This typically requires backend development to handle LTI protocols, manage security (keys/secrets), and ensure compliance with the LTI standard.\n\n" +
      "Canva Integration:\n" +
      "Integrating with Canva would involve using the Canva Apps SDK. This could allow users to, for example, analyze text content directly from their Canva designs or use analysis results to inform their design choices. This requires registering a Canva developer app, understanding their SDK, and building the UI/logic for the Canva app environment.\n\n" +
      "Both integrations are significant development efforts requiring specialized knowledge and potentially backend infrastructure."
    );
  };

  const handleSystemUpdateCheck = () => {
    alert("Checking for system updates...\n\nDentEdTech Accreditation Analyzer is currently up to date. (Version 1.0.0 - Simulated)");
  };

  return (
    <div className="modal-overlay integrations-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="integrations-modal-title">
      <div className="modal-content integrations-modal-content">
        <header className="modal-header">
          <h3 id="integrations-modal-title">Integrations & Settings</h3>
          <button onClick={onClose} className="close-modal-button" aria-label="Close integrations modal">
            <span className="icon">close</span>
          </button>
        </header>
        <div className="modal-body">
          <h4>Potential Integrations (Advanced Features)</h4>
          <p>
            This application can be extended to integrate with other platforms for a more seamless workflow.
            These are advanced features that would require further development.
          </p>

          <div className="integration-item">
            <h5><span className="icon">school</span> Learning Management System (LMS) Integration</h5>
            <p>
              Integrate with LMS platforms (like Moodle, Canvas LMS, Blackboard) using standards such as LTI (Learning Tools Interoperability).
              This would allow users to access the analyzer directly from their LMS environment.
            </p>
            <p><em>Requires backend development and LTI protocol implementation.</em></p>
          </div>

          <div className="integration-item">
            <h5><span className="icon">design_services</span> Canva Integration</h5>
            <p>
              Allow users to analyze content from their Canva designs or use analysis feedback within Canva.
              This would involve using the Canva Apps SDK.
            </p>
            <p><em>Requires development using the Canva Apps SDK.</em></p>
          </div>

          <div className="settings-placeholder">
            <h4>Application Settings & System</h4>
            <p>Currently, no dynamic application-level settings are available. This section could include options for API Key Management, default preferences, etc.</p>
             <button onClick={handleSystemUpdateCheck} className="action-button system-update-button">
                <span className="icon">system_update</span> Check for System Updates
            </button>
             <p className="disclaimer-note">This is a simulated update check for demonstration.</p>
          </div>

        </div>
        <footer className="modal-footer">
          <button onClick={handleLearnMore} className="action-button info-button">
            <span className="icon">info</span> Learn More About Integrations
          </button>
          <button onClick={onClose} className="action-button">Close</button>
        </footer>
      </div>
    </div>
  );
};

export default IntegrationsModal;