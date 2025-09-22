import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const credentials = btoa(`${username}:${password}`);

    try {
      const response = await fetch('http://localhost:8080/api/employees', {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Login successful:', data);
        setMessage('Login successful!');

        setTimeout(() => navigate('/expense'), 1000);
      } else if (response.status === 401) {
        setMessage('Unauthorized: Invalid credentials');
      } else {
        setMessage(`Login failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred. Check the console for details.');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Login</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={styles.input}
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
          autoComplete="current-password"
        />
        <button type="submit" style={styles.button}>
          Login
        </button>
      </form>
      {message && <p style={styles.message}>{message}</p>}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 20,
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    marginBottom: 24,
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    width: 320,
    gap: 16,
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  input: {
    padding: '12px 16px',
    fontSize: 16,
    borderRadius: 6,
    border: '1px solid #ccc',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  button: {
    padding: '12px',
    fontSize: 18,
    backgroundColor: '#007BFF',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  message: {
    marginTop: 20,
    fontWeight: 'bold',
    color: '#d9534f', // red-ish for error, will also show success but you can customize
    textAlign: 'center',
  },
};

export default Login;
