import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { format } from 'date-fns';

function AdminPunchEditor({ userId, userEmail, userName, onClose }) {
  const [punches, setPunches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [editingPunch, setEditingPunch] = useState(null);
  const [editTime, setEditTime] = useState('');
  const [editType, setEditType] = useState('in');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stats, setStats] = useState({
    totalPunches: 0,
    firstPunch: null,
    lastPunch: null
  });

  useEffect(() => {
    fetchPunches();
  }, [userId, selectedDate]);

  const fetchPunches = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      console.log('🔍 Fetching punches for user:', userId);
      console.log('📅 Selected date:', selectedDate);
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      console.log('📅 Date range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

      // First, let's get ALL documents to see what's in the collection
      console.log('📊 Checking all attendance documents...');
      const allDocsSnapshot = await getDocs(collection(db, 'attendance'));
      console.log('Total attendance documents:', allDocsSnapshot.size);
      
      if (allDocsSnapshot.size > 0) {
        console.log('Sample document fields:');
        allDocsSnapshot.forEach(doc => {
          const data = doc.data();
          console.log('Document ID:', doc.id);
          console.log('Fields in this document:', Object.keys(data));
          console.log('Full data:', data);
        });
      } else {
        console.log('❌ No documents found in attendance collection at all');
      }

      // Now try the specific query
      console.log('🔍 Executing specific query...');
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', userId),
        where('timestamp', '>=', startOfDay),
        where('timestamp', '<=', endOfDay),
        orderBy('timestamp', 'asc')
      );
      
      const snapshot = await getDocs(q);
      console.log('Query returned', snapshot.size, 'documents');
      
      const punchesData = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log('📄 Found matching punch:', data);
        
        // Handle timestamp safely
        let timestamp;
        if (data.timestamp?.toDate) {
          timestamp = data.timestamp.toDate();
        } else if (data.timestamp) {
          timestamp = new Date(data.timestamp);
        } else {
          timestamp = new Date();
        }
        
        punchesData.push({
          id: doc.id,
          ...data,
          timestamp
        });
      });
      
      setPunches(punchesData);
      
      if (punchesData.length > 0) {
        setStats({
          totalPunches: punchesData.length,
          firstPunch: punchesData[0].timestamp,
          lastPunch: punchesData[punchesData.length - 1].timestamp
        });
        setMessage({ type: 'success', text: `Loaded ${punchesData.length} punches` });
      } else {
        setStats({
          totalPunches: 0,
          firstPunch: null,
          lastPunch: null
        });
        
        // Check if there are any documents for this date regardless of userId
        const dateQuery = query(
          collection(db, 'attendance'),
          where('timestamp', '>=', startOfDay),
          where('timestamp', '<=', endOfDay)
        );
        const dateDocs = await getDocs(dateQuery);
        console.log('Documents on this date (any user):', dateDocs.size);
        
        if (dateDocs.size > 0) {
          console.log('Found documents on this date but with different userId:');
          dateDocs.forEach(doc => {
            const data = doc.data();
            console.log('userId in document:', data.userId || data.userID || data.userld || 'not found');
          });
          setMessage({ type: 'info', text: `Found ${dateDocs.size} punches on this date but for different users` });
        } else {
          setMessage({ type: 'info', text: 'No punches found for this date' });
        }
      }
      
    } catch (error) {
      console.error('❌ ERROR FETCHING PUNCHES:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      setMessage({ type: 'error', text: `Failed to load punches: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (punch) => {
    setEditingPunch(punch.id);
    // Format the time for input (HH:MM)
    const date = new Date(punch.timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    setEditTime(`${hours}:${minutes}`);
    setEditType(punch.type);
  };

  const handleSaveEdit = async (punchId) => {
    try {
      const [hours, minutes] = editTime.split(':');
      const newTimestamp = new Date(selectedDate);
      newTimestamp.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await updateDoc(doc(db, 'attendance', punchId), {
        timestamp: newTimestamp,
        type: editType
      });

      setMessage({ type: 'success', text: '✅ Punch updated successfully!' });
      setEditingPunch(null);
      fetchPunches();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error updating punch:', error);
      setMessage({ type: 'error', text: '❌ Failed to update punch' });
    }
  };

  const handleDelete = async (punchId) => {
    if (window.confirm('Are you sure you want to delete this punch? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'attendance', punchId));
        setMessage({ type: 'success', text: '✅ Punch deleted successfully!' });
        fetchPunches();
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } catch (error) {
        console.error('Error deleting punch:', error);
        setMessage({ type: 'error', text: '❌ Failed to delete punch' });
      }
    }
  };

  const handleAddPunch = async () => {
    if (!editTime) {
      setMessage({ type: 'error', text: 'Please select a time' });
      return;
    }

    try {
      const [hours, minutes] = editTime.split(':');
      const newTimestamp = new Date(selectedDate);
      newTimestamp.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await addDoc(collection(db, 'attendance'), {
        userId,
        type: editType,
        timestamp: newTimestamp,
        date: selectedDate
      });
      
      setMessage({ type: 'success', text: `✅ ${editType === 'in' ? 'Time In' : 'Time Out'} added successfully!` });
      setEditingPunch(null);
      setEditTime('');
      fetchPunches();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error adding punch:', error);
      setMessage({ type: 'error', text: '❌ Failed to add punch' });
    }
  };

  const calculateWorkHours = () => {
    if (punches.length < 2) return null;
    
    let totalMinutes = 0;
    for (let i = 0; i < punches.length - 1; i += 2) {
      if (punches[i].type === 'in' && punches[i + 1]?.type === 'out') {
        const diff = (punches[i + 1].timestamp - punches[i].timestamp) / (1000 * 60);
        totalMinutes += diff;
      }
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return { hours, minutes, total: totalMinutes };
  };

  const workHours = calculateWorkHours();

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 999
    },
    modal: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '12px',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      zIndex: 1000,
      width: '90%',
      maxWidth: '800px',
      maxHeight: '90vh',
      overflowY: 'auto'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: '2px solid #e5e7eb'
    },
    title: {
      fontSize: '22px',
      fontWeight: '600',
      color: '#111827'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#6b7280'
    },
    userInfo: {
      backgroundColor: '#f3f4f6',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '14px'
    },
    controlPanel: {
      display: 'flex',
      gap: '15px',
      marginBottom: '20px',
      flexWrap: 'wrap'
    },
    dateInput: {
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '14px'
    },
    addPanel: {
      backgroundColor: '#f9fafb',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px dashed #3b82f6'
    },
    addTitle: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '15px',
      color: '#3b82f6'
    },
    addControls: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    select: {
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '14px',
      minWidth: '120px'
    },
    addButton: {
      padding: '8px 16px',
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    },
    statsPanel: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '15px',
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: '#e0f2fe',
      borderRadius: '8px'
    },
    statItem: {
      textAlign: 'center'
    },
    statLabel: {
      fontSize: '12px',
      color: '#0369a1',
      marginBottom: '5px'
    },
    statValue: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#0c4a6e'
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
      fontWeight: '600',
      color: '#374151'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #e5e7eb'
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500'
    },
    actionButton: {
      padding: '4px 8px',
      margin: '0 4px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px'
    },
    editButton: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    deleteButton: {
      backgroundColor: '#ef4444',
      color: 'white'
    },
    saveButton: {
      backgroundColor: '#10b981',
      color: 'white',
      padding: '4px 8px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      marginRight: '4px'
    },
    message: {
      padding: '12px',
      borderRadius: '6px',
      marginBottom: '20px',
      fontSize: '14px'
    },
    success: {
      backgroundColor: '#d1fae5',
      color: '#065f46'
    },
    error: {
      backgroundColor: '#fee2e2',
      color: '#991b1b'
    },
    refreshButton: {
      padding: '8px 16px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    }
  };

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>✏️ Punch Editor</h2>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        {/* User Info */}
        <div style={styles.userInfo}>
          <div><strong>User:</strong> {userName || 'N/A'}</div>
          <div><strong>Email:</strong> {userEmail}</div>
          <div><strong>User ID:</strong> {userId}</div>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            ...styles.message,
            ...(message.type === 'success' ? styles.success : styles.error)
          }}>
            {message.text}
          </div>
        )}

        {/* Control Panel */}
        <div style={styles.controlPanel}>
          <div>
            <label style={{ marginRight: '10px', fontWeight: '500' }}>Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.dateInput}
            />
          </div>
          <button style={styles.refreshButton} onClick={fetchPunches}>
            🔄 Refresh
          </button>
        </div>

        {/* Stats Panel */}
        {punches.length > 0 && (
          <div style={styles.statsPanel}>
            <div style={styles.statItem}>
              <div style={styles.statLabel}>Total Punches</div>
              <div style={styles.statValue}>{stats.totalPunches}</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statLabel}>First Punch</div>
              <div style={styles.statValue}>
                {stats.firstPunch ? format(stats.firstPunch, 'hh:mm:ss a') : 'N/A'}
              </div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statLabel}>Last Punch</div>
              <div style={styles.statValue}>
                {stats.lastPunch ? format(stats.lastPunch, 'hh:mm:ss a') : 'N/A'}
              </div>
            </div>
            {workHours && (
              <div style={styles.statItem}>
                <div style={styles.statLabel}>Total Hours</div>
                <div style={styles.statValue}>
                  {workHours.hours}h {workHours.minutes}m
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add New Punch Panel */}
        <div style={styles.addPanel}>
          <h3 style={styles.addTitle}>➕ Add New Punch</h3>
          <div style={styles.addControls}>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              style={styles.select}
            >
              <option value="in">Time In</option>
              <option value="out">Time Out</option>
            </select>
            <input
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              style={styles.dateInput}
              placeholder="Select time"
            />
            <button
              onClick={handleAddPunch}
              style={styles.addButton}
              disabled={!editTime}
            >
              Add Punch
            </button>
          </div>
        </div>

        {/* Punches Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading punches...</div>
        ) : punches.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {punches.map((punch, index) => (
                <tr key={punch.id}>
                  <td style={styles.td}>{index + 1}</td>
                  <td style={styles.td}>
                    {editingPunch === punch.id ? (
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        style={styles.select}
                      >
                        <option value="in">Time In</option>
                        <option value="out">Time Out</option>
                      </select>
                    ) : (
                      <span style={{
                        ...styles.badge,
                        backgroundColor: punch.type === 'in' ? '#d1fae5' : '#fee2e2',
                        color: punch.type === 'in' ? '#065f46' : '#991b1b'
                      }}>
                        {punch.type === 'in' ? '⏰ Time In' : '🏁 Time Out'}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingPunch === punch.id ? (
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        style={styles.dateInput}
                      />
                    ) : (
                      format(punch.timestamp, 'hh:mm:ss a')
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingPunch === punch.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(punch.id)}
                          style={{...styles.saveButton, marginRight: '5px'}}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPunch(null)}
                          style={{...styles.actionButton, backgroundColor: '#6b7280', color: 'white'}}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(punch)}
                          style={{...styles.actionButton, ...styles.editButton, marginRight: '5px'}}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(punch.id)}
                          style={{...styles.actionButton, ...styles.deleteButton}}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No punches found for this date. Use the panel above to add punches.
          </div>
        )}

        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '20px', textAlign: 'center' }}>
          ⚠️ Editing punches will affect attendance calculations. Use with caution.
        </p>
      </div>
    </>
  );
}

export default AdminPunchEditor;