import React, { useState, useEffect } from 'react';

const ExpenseForm = () => {
  const [formData, setFormData] = useState({
    date: '',
    amount: '',
    category: '',
    reimbursementType: '',
    taxApplicable: false,
    paymentMode: '',
    description: '',
    attachment: null,
    enteredBy: '',
    status: 'Pending Review',
  });

  const [submitMessage, setSubmitMessage] = useState('');

  const categories = ['Travel', 'Hotel', 'Food', 'Office Supplies', 'Others'];
  const reimbursementTypes = ['Personal Reimbursement', 'Company Paid', 'Advance Cleared'];
  const paymentModes = ['Cash', 'Credit Card', 'UPI', 'Bank Transfer'];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/auth/user', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setFormData((prev) => ({ ...prev, enteredBy: data.username }));
        } else {
          console.warn('No logged-in user');
        }
      } catch (err) {
        console.error('User fetch failed:', err);
      }
    };

    fetchUser();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (name === 'amount') {
      const clean = value.replace(/[^\d.]/g, '');
      if (clean === '' || parseFloat(clean) < 0) return;
      setFormData({ ...formData, [name]: clean });
    } else if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else if (type === 'file') {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    for (let key in formData) {
      if (formData[key] !== null) {
        data.append(key, formData[key]);
      }
    }

    try {
      const res = await fetch('http://localhost:8080/api/expenses', {
        method: 'POST',
        body: data,
        credentials: 'include',
      });

      if (res.ok) {
        setSubmitMessage('Expense submitted successfully!');
        // Keep enteredBy from previous formData after reset
        setFormData((prev) => ({
          date: '',
          amount: '',
          category: '',
          reimbursementType: '',
          taxApplicable: false,
          paymentMode: '',
          description: '',
          attachment: null,
          enteredBy: prev.enteredBy,  // Keep username intact
          status: 'Pending Review',
        }));
      } else {
        const error = await res.text();
        setSubmitMessage('Failed: ' + error);
      }
    } catch (err) {
      console.error(err);
      setSubmitMessage('An error occurred. Try again.');
    }
  };

  return (
    <div style={styles.container}>
      <h2>Expense Submission</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>Date *</label>
        <input
          style={styles.input}
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
        />

        <label style={styles.label}>Amount *</label>
        <input
          style={styles.input}
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          min="0"
          step="0.01"
          required
        />

        <label style={styles.label}>Expense Category *</label>
        <select
          style={styles.select}
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
        >
          <option value="">-- Select Category --</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <label style={styles.label}>Reimbursement Type</label>
        <select
          style={styles.select}
          name="reimbursementType"
          value={formData.reimbursementType}
          onChange={handleChange}
        >
          <option value="">-- Select Type --</option>
          {reimbursementTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <label style={{ ...styles.label, display: 'flex', alignItems: 'center' }}>
          <input
            style={{ marginRight: '8px' }}
            type="checkbox"
            name="taxApplicable"
            checked={formData.taxApplicable}
            onChange={handleChange}
          />
          Tax Applicable
        </label>

        <label style={styles.label}>Payment Mode</label>
        <select
          style={styles.select}
          name="paymentMode"
          value={formData.paymentMode}
          onChange={handleChange}
        >
          <option value="">-- Select Mode --</option>
          {paymentModes.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>

        <label style={styles.label}>Description</label>
        <textarea
          style={styles.textarea}
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="3"
        />

        <label style={styles.label}>Attachment</label>
        <input
          style={styles.input}
          type="file"
          name="attachment"
          onChange={handleChange}
        />

        <label style={styles.label}>Entered By</label>
        <input
          style={{ ...styles.input, backgroundColor: '#f0f0f0' }}
          type="text"
          name="enteredBy"
          value={formData.enteredBy}
          readOnly
        />

        <button style={styles.button} type="submit">
          Submit Expense
        </button>
      </form>

      {submitMessage && <p style={styles.message}>{submitMessage}</p>}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '30px auto',
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: '#fff',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginTop: '15px',
    marginBottom: '6px',
    fontWeight: '600',
    fontSize: '14px',
  },
  input: {
    padding: '8px 10px',
    fontSize: '14px',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  select: {
    padding: '8px 10px',
    fontSize: '14px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
  },
  textarea: {
    padding: '8px 10px',
    fontSize: '14px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    resize: 'vertical',
  },
  button: {
    marginTop: '25px',
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  message: {
    marginTop: '20px',
    fontWeight: '600',
  },
};

export default ExpenseForm;
