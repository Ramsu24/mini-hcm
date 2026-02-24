import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format } from 'date-fns';

function Dashboard() {
  console.log('🔵 DASHBOARD RENDERING');
  
  // ============ STATE VARIABLES ============
  const { currentUser, logout, userRole } = useAuth();
  const navigate = useNavigate();
  const [userSchedule, setUserSchedule] = useState({ start: '09:00', end: '18:00' });
  const [loading, setLoading] = useState(true);
  const [lastPunch, setLastPunch] = useState(null);
  const [punchLoading, setPunchLoading] = useState(false);
  const [todayPunches, setTodayPunches] = useState([]);

  // ============ EFFECTS ============
  useEffect(() => {
    fetchUserSchedule();
    fetchTodayPunches();
  }, []);

  // ============ FUNCTIONS ============
  const fetchUserSchedule = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setUserSchedule(userDoc.data().schedule || { start: '09:00', end: '18:00' });
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  const fetchTodayPunches = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', currentUser.uid),
        where('timestamp', '>=', today),
        where('timestamp', '<', tomorrow),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const punches = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        punches.push({
          id: doc.id,
          ...data,
          time: data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
        });
      });
      
      setTodayPunches(punches);
      
      // Set last punch type
      if (punches.length > 0) {
        setLastPunch(punches[0].type);
      } else {
        setLastPunch(null);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching punches:', error);
      setLoading(false);
    }
  };

  const handlePunch = async (type) => {
    setPunchLoading(true);
    try {
      const punchData = {
        userId: currentUser.uid,
        type,
        timestamp: new Date(),
        date: format(new Date(), 'yyyy-MM-dd')
      };
      
      await addDoc(collection(db, 'attendance'), punchData);
      
      // Refresh the punches list
      await fetchTodayPunches();
      
      alert(`${type === 'in' ? 'Time In' : 'Time Out'} recorded successfully!`);
    } catch (error) {
      console.error('Error recording punch:', error);
      alert('Error recording punch: ' + error.message);
    } finally {
      setPunchLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return format(timestamp, 'hh:mm:ss a');
  };

  // ============ STYLES ============
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
    button: {
      backgroundColor: '#ef4444',
      color: 'white',
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    punchButton: {
      flex: 1,
      padding: '12px',
      border: 'none',
      borderRadius: '4px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      margin: '0 5px'
    },
    buttonContainer: {
      display: 'flex',
      gap: '10px',
      marginTop: '15px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '15px'
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
      borderBottom: '1px solid #e5e7eb',
      color: '#4b5563'
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600'
    }
  };

  // ============ LOADING STATE ============
  if (loading) {
    return <div style={styles.container}>Loading dashboard...</div>;
  }

  // ============ MAIN RENDER ============
  return (
    <div style={styles.container}>
      {/* ===== HEADER SECTION ===== */}
      <div style={styles.header}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Mini HCM Dashboard</h1>
        <div>
          <span style={{ marginRight: '20px' }}>{currentUser?.email}</span>
          {currentUser && userRole === 'admin' && (
            <a
              href="/admin"
              style={{
                marginLeft: '20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '14px'
              }}
            >
              Admin Panel
            </a>
          )}
          <button style={styles.button} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      
      {/* ===== SCHEDULE CARD ===== */}
      <div style={styles.card}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px' }}>
          Your Schedule
        </h2>
        <p style={{ color: '#4b5563' }}>
          Shift: {userSchedule.start} - {userSchedule.end}
        </p>
      </div>

      {/* ===== TIME RECORDING CARD ===== */}
      <div style={styles.card}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px' }}>
          Time Recording
        </h2>
        <div style={styles.buttonContainer}>
          <button
            onClick={() => handlePunch('in')}
            disabled={punchLoading || lastPunch === 'in'}
            style={{
              ...styles.punchButton,
              backgroundColor: lastPunch === 'in' ? '#9ca3af' : '#10b981',
              color: 'white'
            }}
          >
            {punchLoading ? 'Processing...' : 'Time In'}
          </button>
          <button
            onClick={() => handlePunch('out')}
            disabled={punchLoading || lastPunch !== 'in'}
            style={{
              ...styles.punchButton,
              backgroundColor: lastPunch !== 'in' ? '#9ca3af' : '#ef4444',
              color: 'white'
            }}
          >
            {punchLoading ? 'Processing...' : 'Time Out'}
          </button>
        </div>
      </div>

      {/* ===== TODAY'S PUNCHES CARD ===== */}
      <div style={styles.card}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px' }}>
          Today's Punches
        </h2>
        
        {todayPunches.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Time</th>
              </tr>
            </thead>
            <tbody>
              {todayPunches.map((punch) => (
                <tr key={punch.id}>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: punch.type === 'in' ? '#d1fae5' : '#fee2e2',
                      color: punch.type === 'in' ? '#065f46' : '#991b1b'
                    }}>
                      {punch.type === 'in' ? '⏰ Time In' : '🏁 Time Out'}
                    </span>
                  </td>
                  <td style={styles.td}>{formatTime(punch.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
            No punches recorded today. Click Time In to start your shift.
          </p>
        )}
      </div>

      {/* ===== WELCOME CARD ===== */}
      <div style={styles.card}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '10px' }}>
          Welcome!
        </h2>
        <p style={{ color: '#4b5563' }}>
          You are successfully logged in. Your dashboard is working!
        </p>
      </div>
    </div>
  );
}

export default Dashboard;