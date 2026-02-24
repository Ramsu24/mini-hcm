import React, { useState, useEffect } from 'react';
import AdminPasswordModal from '../components/AdminPasswordModal';
import AdminPunchEditor from '../components/AdminPunchEditor';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { format, startOfWeek, endOfWeek } from 'date-fns';

function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [punchEditorOpen, setPunchEditorOpen] = useState(false);
  const [selectedUserForPunch, setSelectedUserForPunch] = useState(null);
  const [editSchedule, setEditSchedule] = useState({ start: '09:00', end: '18:00' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditSchedule(user.schedule || { start: '09:00', end: '18:00' });
  };

  const handlePasswordChange = (user) => {
    setSelectedUserForPassword(user);
    setPasswordModalOpen(true);
  };

  const handleEditPunches = (user) => {
    setSelectedUserForPunch(user);
    setPunchEditorOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!selectedUser) return;
    
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        schedule: editSchedule
      });
      
      setMessage(`✅ Schedule updated for ${selectedUser.email}`);
      setSelectedUser(null);
      fetchUsers(); // Refresh the list
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating schedule:', error);
      setMessage('❌ Error updating schedule');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      padding: '20px'
    },
    header: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    card: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      backgroundColor: '#f9fafb',
      borderBottom: '2px solid #e5e7eb',
      fontWeight: '600'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #e5e7eb'
    },
    button: {
      backgroundColor: '#ef4444',
      color: 'white',
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    editButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '6px 12px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginRight: '5px'
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
      maxWidth: '500px'
    },
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 999
    },
    input: {
      width: '100%',
      padding: '8px',
      marginBottom: '15px',
      border: '1px solid #d1d5db',
      borderRadius: '4px'
    },
    message: {
      padding: '10px',
      backgroundColor: '#d1fae5',
      color: '#065f46',
      borderRadius: '4px',
      marginBottom: '20px'
    }
  };

  if (loading) {
    return <div style={styles.container}>Loading admin dashboard...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Admin Dashboard</h1>
        <div>
          <span style={{ marginRight: '20px' }}>Admin: {currentUser?.email}</span>
          <button style={styles.button} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Message */}
      {message && <div style={styles.message}>{message}</div>}

      {/* Users Table */}
      <div style={styles.card}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
          Manage User Schedules
        </h2>
        
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Current Schedule</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={styles.td}>{user.name || 'N/A'}</td>
                <td style={styles.td}>{user.email}</td>
                <td style={styles.td}>
                  {user.schedule?.start || '09:00'} - {user.schedule?.end || '18:00'}
                </td>
                <td style={styles.td}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: user.role === 'admin' ? '#fee2e2' : '#d1fae5',
                    color: user.role === 'admin' ? '#991b1b' : '#065f46'
                  }}>
                    {user.role || 'employee'}
                  </span>
                </td>
                        <td style={styles.td}>
                          <button 
                            style={{...styles.editButton, backgroundColor: '#3b82f6'}}
                            onClick={() => handleEditUser(user)}
                          >
                            Schedule
                          </button>
                          <button 
                            style={{...styles.editButton, backgroundColor: '#10b981', marginLeft: '5px'}}
                            onClick={() => handleEditPunches(user)}
                          >
                            Punches
                          </button>
                          <button 
                            style={{...styles.editButton, backgroundColor: '#ef4444', marginLeft: '5px'}}
                            onClick={() => handlePasswordChange(user)}
                          >
                            Password
                          </button>
                        </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Schedule Modal */}
      {selectedUser && (
        <>
          <div style={styles.overlay} onClick={() => setSelectedUser(null)} />
          <div style={styles.modal}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              Edit Schedule for {selectedUser.email}
            </h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Shift Start Time
              </label>
              <input
                type="time"
                value={editSchedule.start}
                onChange={(e) => setEditSchedule({ ...editSchedule, start: e.target.value })}
                style={styles.input}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Shift End Time
              </label>
              <input
                type="time"
                value={editSchedule.end}
                onChange={(e) => setEditSchedule({ ...editSchedule, end: e.target.value })}
                style={styles.input}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSchedule}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </>
      )}

      {passwordModalOpen && (
        <AdminPasswordModal
          isOpen={passwordModalOpen}
          onClose={() => {
            setPasswordModalOpen(false);
            setSelectedUserForPassword(null);
          }}
          user={selectedUserForPassword}
        />
      )}

      {/* Punch Editor Modal */}
      {punchEditorOpen && selectedUserForPunch && (
        <AdminPunchEditor
          userId={selectedUserForPunch.id}
          userEmail={selectedUserForPunch.email}
          userName={selectedUserForPunch.name}
          onClose={() => {
            setPunchEditorOpen(false);
            setSelectedUserForPunch(null);
            fetchUsers(); // Refresh user list
          }}
        />
      )}
    </div>
  );
}

export default AdminDashboard;