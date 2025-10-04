import React, { useState } from 'react';
import './Feedback.css';

const Feedback: React.FC = () => {
  const [feedback, setFeedback] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('User feedback:', feedback);
    setFeedback('');
    alert('Thank you for your feedback!');
  };

  return (
    <div className="feedback-widget">
      <h4>How can we improve?</h4>
      <form onSubmit={handleSubmit}>
        <textarea 
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What features would help you most?"
          rows={3}
        />
        <button type="submit">Send Feedback</button>
      </form>
    </div>
  );
};

export default Feedback;
