import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

function AdminPasswordModal({ isOpen, onClose, user }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const { currentUser } = useAuth();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validation
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Get the current admin's ID token
      const idToken = await currentUser.getIdToken();
      
      const response = await axios.post(
        'http://localhost:5000/api/admin/change-password',
        {
          userId: user.id,
          newPassword: newPassword
        },
        {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        }
      );

      setMessage({ 
        type: 'success', 
        text: `✅ Password changed successfully for ${user.email}!` 
      });
      
      // Clear form
      setNewPassword('');
      setConfirmPassword('');
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to change password' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 999
    },
    modal: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '8px',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
      zIndex: 1000,
      width: '90%',
      maxWidth: '450px'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '20px',
      color: '#111827'
    },
    userInfo: {
      backgroundColor: '#f3f4f6',
      padding: '12px',
      borderRadius: '4px',
      marginBottom: '20px',
      fontSize: '14px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: '500',
      color: '#374151'
    },
    input: {
      width: '100%',
      padding: '10px',
      marginBottom: '15px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '14px'
    },
    buttonContainer: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '20px'
    },
    cancelButton: {
      padding: '10px 20px',
      backgroundColor: '#9ca3af',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    saveButton: {
      padding: '10px 20px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      opacity: loading ? 0.5 : 1
    },
    message: {
      padding: '10px',
      borderRadius: '4px',
      marginBottom: '15px',
      fontSize: '14px'
    },
    success: {
      backgroundColor: '#d1fae5',
      color: '#065f46'
    },
    error: {
      backgroundColor: '#fee2e2',
      color: '#991b1b'
    }
  };

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.modal}>
        <h2 style={styles.title}>Change User Password</h2>
        
        <div style={styles.userInfo}>
          <div><strong>User:</strong> {user?.name || 'N/A'}</div>
          <div><strong>Email:</strong> {user?.email}</div>
        </div>

        {message.text && (
          <div style={{
            ...styles.message,
            ...(message.type === 'success' ? styles.success : styles.error)
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleChangePassword}>
          <div>
            <label style={styles.label}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter new password"
              required
              minLength="6"
              disabled={loading}
            />
          </div>

          <div>
            <label style={styles.label}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              placeholder="Confirm new password"
              required
              minLength="6"
              disabled={loading}
            />
          </div>

          <div style={styles.buttonContainer}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.saveButton}
              disabled={loading}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>

        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '15px' }}>
          Password must be at least 6 characters long.
        </p>
      </div>
    </>
  );
}

export default AdminPasswordModal;