// src/components/PendingReview.js
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PendingReview = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Message passed from navigation state, default fallback
  const message = location.state?.message || 'Pending Review';

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>{message}</h1>
      <p>Your expense submission is pending review. Please wait for approval.</p>
      <button onClick={() => navigate('/')}>Back to Expense Form</button>
    </div>
  );
};

export default PendingReview;
