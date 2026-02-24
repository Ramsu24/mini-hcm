import React from 'react';

function TestLogin() {
  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '400px', 
      margin: '0 auto',
      fontFamily: 'Arial'
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
        🔐 Test Login Page
      </h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Email:
        </label>
        <input 
          type="email" 
          style={{ 
            width: '100%', 
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
          placeholder="test@example.com"
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Password:
        </label>
        <input 
          type="password" 
          style={{ 
            width: '100%', 
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
          placeholder="••••••••"
        />
      </div>
      
      <button style={{
        width: '100%',
        padding: '10px',
        backgroundColor: '#4f46e5',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '16px',
        cursor: 'pointer'
      }}>
        Sign In
      </button>
      
      <p style={{ marginTop: '20px', textAlign: 'center' }}>
        <a href="#" style={{ color: '#4f46e5' }}>Create an account</a>
      </p>
    </div>
  );
}

export default TestLogin;