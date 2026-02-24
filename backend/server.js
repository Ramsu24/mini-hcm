const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

// CORRECTED CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Remove this line that's causing the error:
// app.options('*', cors());

// Instead, handle OPTIONS requests automatically (cors() already does this)

app.use(express.json());

// ... rest of your server code (keep everything else the same)

// Time calculation utilities
const calculateWorkHours = (punchIn, punchOut, scheduleStart, scheduleEnd) => {
  const punchInTime = new Date(punchIn);
  const punchOutTime = new Date(punchOut);
  
  // Convert schedule times to Date objects for the same day
  const scheduleStartTime = new Date(punchInTime);
  const [startHour, startMinute] = scheduleStart.split(':');
  scheduleStartTime.setHours(parseInt(startHour), parseInt(startMinute), 0);
  
  const scheduleEndTime = new Date(punchInTime);
  const [endHour, endMinute] = scheduleEnd.split(':');
  scheduleEndTime.setHours(parseInt(endHour), parseInt(endMinute), 0);
  
  // Calculate total hours worked
  const totalHours = (punchOutTime - punchInTime) / (1000 * 60 * 60);
  
  // Calculate regular hours (within schedule)
  let regularHours = 0;
  let overtime = 0;
  let lateMinutes = 0;
  let undertimeMinutes = 0;
  
  // Check if arrived late
  if (punchInTime > scheduleStartTime) {
    lateMinutes = (punchInTime - scheduleStartTime) / (1000 * 60);
  }
  
  // Check if left early
  if (punchOutTime < scheduleEndTime) {
    undertimeMinutes = (scheduleEndTime - punchOutTime) / (1000 * 60);
  }
  
  // Calculate regular hours (time between schedule start and end)
  const scheduleDuration = (scheduleEndTime - scheduleStartTime) / (1000 * 60 * 60);
  
  if (punchInTime <= scheduleStartTime && punchOutTime >= scheduleEndTime) {
    // Worked full schedule
    regularHours = scheduleDuration;
    overtime = totalHours - scheduleDuration;
  } else if (punchInTime > scheduleStartTime && punchOutTime < scheduleEndTime) {
    // Worked partially within schedule
    regularHours = (punchOutTime - punchInTime) / (1000 * 60 * 60);
  } else if (punchInTime <= scheduleStartTime && punchOutTime < scheduleEndTime) {
    // Started on time, left early
    regularHours = (punchOutTime - scheduleStartTime) / (1000 * 60 * 60);
  } else if (punchInTime > scheduleStartTime && punchOutTime >= scheduleEndTime) {
    // Started late, finished after schedule
    regularHours = (scheduleEndTime - punchInTime) / (1000 * 60 * 60);
    overtime = (punchOutTime - scheduleEndTime) / (1000 * 60 * 60);
  }
  
  // Calculate night differential (22:00 - 06:00)
  let nightDiffHours = 0;
  let currentTime = new Date(punchInTime);
  
  while (currentTime < punchOutTime) {
    const hour = currentTime.getHours();
    if (hour >= 22 || hour < 6) {
      nightDiffHours += 1;
    }
    currentTime.setHours(currentTime.getHours() + 1);
  }
  
  return {
    regularHours: Math.max(0, regularHours).toFixed(2),
    overtime: Math.max(0, overtime).toFixed(2),
    nightDiff: nightDiffHours.toFixed(2),
    lateMinutes: Math.max(0, lateMinutes).toFixed(0),
    undertimeMinutes: Math.max(0, undertimeMinutes).toFixed(0),
    totalHours: totalHours.toFixed(2)
  };
};

// API endpoint to calculate daily summary
app.post('/api/calculate-daily-summary', async (req, res) => {
  try {
    const { userId, date } = req.body;
    
    // Get user's schedule
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const schedule = userData.schedule || { start: '09:00', end: '18:00' };
    
    // Get punches for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const punchesSnapshot = await db.collection('attendance')
      .where('userId', '==', userId)
      .where('timestamp', '>=', startOfDay)
      .where('timestamp', '<=', endOfDay)
      .orderBy('timestamp')
      .get();
    
    const punches = [];
    punchesSnapshot.forEach(doc => punches.push({ id: doc.id, ...doc.data() }));
    
    // Group punches by pairs (punch in/out)
    const workSessions = [];
    for (let i = 0; i < punches.length; i += 2) {
      if (punches[i] && punches[i + 1]) {
        workSessions.push({
          punchIn: punches[i].timestamp.toDate(),
          punchOut: punches[i + 1].timestamp.toDate()
        });
      }
    }
    
    // Calculate totals
    let dailySummary = {
      regularHours: 0,
      overtime: 0,
      nightDiff: 0,
      lateMinutes: 0,
      undertimeMinutes: 0,
      totalHours: 0
    };
    
    workSessions.forEach(session => {
      const calculations = calculateWorkHours(
        session.punchIn,
        session.punchOut,
        schedule.start,
        schedule.end
      );
      
      dailySummary.regularHours += parseFloat(calculations.regularHours);
      dailySummary.overtime += parseFloat(calculations.overtime);
      dailySummary.nightDiff += parseFloat(calculations.nightDiff);
      dailySummary.lateMinutes += parseInt(calculations.lateMinutes);
      dailySummary.undertimeMinutes += parseInt(calculations.undertimeMinutes);
      dailySummary.totalHours += parseFloat(calculations.totalHours);
    });
    
    // Save to dailySummary collection
    await db.collection('dailySummary').doc(`${userId}_${date}`).set({
      userId,
      date,
      ...dailySummary,
      workSessions: workSessions.length,
      updatedAt: new Date()
    });
    
    res.json({ success: true, summary: dailySummary });
  } catch (error) {
    console.error('Error calculating daily summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's daily summaries
app.get('/api/daily-summaries/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    let query = db.collection('dailySummary').where('userId', '==', userId);
    
    if (startDate && endDate) {
      query = query.where('date', '>=', startDate).where('date', '<=', endDate);
    }
    
    const snapshot = await query.orderBy('date', 'desc').get();
    
    const summaries = [];
    snapshot.forEach(doc => summaries.push({ id: doc.id, ...doc.data() }));
    
    res.json(summaries);
  } catch (error) {
    console.error('Error fetching daily summaries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all users' summaries for a date range
app.get('/api/admin/all-summaries', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const snapshot = await db.collection('dailySummary')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'desc')
      .get();
    
    const summaries = [];
    snapshot.forEach(doc => summaries.push({ id: doc.id, ...doc.data() }));
    
    // Group by user and date
    const groupedSummaries = {};
    summaries.forEach(summary => {
      if (!groupedSummaries[summary.userId]) {
        groupedSummaries[summary.userId] = [];
      }
      groupedSummaries[summary.userId].push(summary);
    });
    
    res.json(groupedSummaries);
  } catch (error) {
    console.error('Error fetching admin summaries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Change user password (requires admin privileges)
app.post('/api/admin/change-password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    
    // Verify that the requester is an admin
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const requesterUid = decodedToken.uid;
    
    // Check if requester is an admin
    const requesterDoc = await db.collection('users').doc(requesterUid).get();
    if (!requesterDoc.exists || requesterDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    
    // Update the user's password
    await admin.auth().updateUser(userId, {
      password: newPassword
    });

    // Log the action (optional)
    try {
      await db.collection('auditLogs').add({
        action: 'password_change',
        adminId: requesterUid,
        targetUserId: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (logError) {
      console.error('Error writing audit log:', logError);
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});