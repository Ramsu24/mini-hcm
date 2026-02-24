const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Simple calculation function
function calculateWorkHours(punchIn, punchOut, scheduleStart, scheduleEnd) {
  const start = new Date(punchIn);
  const end = new Date(punchOut);
  
  // Parse schedule times
  const [startHour, startMin] = scheduleStart.split(':').map(Number);
  const [endHour, endMin] = scheduleEnd.split(':').map(Number);
  
  const scheduleStartTime = new Date(start);
  scheduleStartTime.setHours(startHour, startMin, 0);
  
  const scheduleEndTime = new Date(start);
  scheduleEndTime.setHours(endHour, endMin, 0);
  
  // Total hours worked
  const totalHours = (end - start) / (1000 * 60 * 60);
  
  // Calculate late
  let lateMinutes = 0;
  if (start > scheduleStartTime) {
    lateMinutes = (start - scheduleStartTime) / (1000 * 60);
  }
  
  // Calculate undertime
  let undertimeMinutes = 0;
  if (end < scheduleEndTime) {
    undertimeMinutes = (scheduleEndTime - end) / (1000 * 60);
  }
  
  // Calculate regular hours and overtime
  let regularHours = 0;
  let overtime = 0;
  
  if (start <= scheduleStartTime && end >= scheduleEndTime) {
    // Worked full shift plus overtime
    regularHours = (scheduleEndTime - scheduleStartTime) / (1000 * 60 * 60);
    overtime = totalHours - regularHours;
  } else if (start >= scheduleStartTime && end <= scheduleEndTime) {
    // Worked within shift
    regularHours = totalHours;
  } else if (start <= scheduleStartTime && end <= scheduleEndTime) {
    // Started early, left early
    regularHours = (end - scheduleStartTime) / (1000 * 60 * 60);
  } else if (start >= scheduleStartTime && end >= scheduleEndTime) {
    // Started late, left late
    regularHours = (scheduleEndTime - start) / (1000 * 60 * 60);
    overtime = (end - scheduleEndTime) / (1000 * 60 * 60);
  }
  
  // Calculate night differential (22:00 - 06:00)
  let nightDiff = 0;
  let current = new Date(start);
  
  while (current < end) {
    const hour = current.getHours();
    if (hour >= 22 || hour < 6) {
      nightDiff += 1;
    }
    current.setHours(current.getHours() + 1);
  }
  
  return {
    regularHours: Math.max(0, regularHours),
    overtime: Math.max(0, overtime),
    nightDiff,
    lateMinutes: Math.max(0, lateMinutes),
    undertimeMinutes: Math.max(0, undertimeMinutes),
    totalHours
  };
}

async function generateSummaries() {
  console.log('🚀 Starting daily summary generation...');
  console.log('=====================================');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Found ${usersSnapshot.size} users`);
    
    if (usersSnapshot.size === 0) {
      console.log('❌ No users found!');
      return;
    }
    
    let totalSummariesCreated = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const schedule = userData.schedule || { start: '09:00', end: '18:00' };
      
      console.log(`\n👤 Processing user: ${userData.email || userId}`);
      console.log(`   Schedule: ${schedule.start} - ${schedule.end}`);
      
      // Get all attendance records for this user
      const punchesSnapshot = await db.collection('attendance')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'asc')
        .get();
      
      console.log(`   Found ${punchesSnapshot.size} attendance records`);
      
      if (punchesSnapshot.size === 0) {
        console.log('   ⏭️ No punches, skipping');
        continue;
      }
      
      // Group by date
      const punchesByDate = {};
      
      punchesSnapshot.forEach(doc => {
        const data = doc.data();
        // Handle timestamp (could be Firestore timestamp or Date)
        let timestamp;
        if (data.timestamp?.toDate) {
          timestamp = data.timestamp.toDate();
        } else if (data.timestamp) {
          timestamp = new Date(data.timestamp);
        } else {
          return; // Skip if no timestamp
        }
        
        const dateStr = timestamp.toISOString().split('T')[0];
        
        if (!punchesByDate[dateStr]) {
          punchesByDate[dateStr] = [];
        }
        punchesByDate[dateStr].push({
          ...data,
          timestamp
        });
      });
      
      const dates = Object.keys(punchesByDate);
      console.log(`   Found ${dates.length} unique dates with punches`);
      
      // Process each date
      for (const dateStr of dates) {
        const punches = punchesByDate[dateStr];
        console.log(`   📅 Processing ${dateStr} (${punches.length} punches)`);
        
        // Sort by timestamp
        punches.sort((a, b) => a.timestamp - b.timestamp);
        
        // Group into pairs
        let regularHours = 0;
        let overtime = 0;
        let nightDiff = 0;
        let lateMinutes = 0;
        let undertimeMinutes = 0;
        let totalHours = 0;
        let sessionCount = 0;
        
        for (let i = 0; i < punches.length; i += 2) {
          if (punches[i] && punches[i + 1]) {
            const calc = calculateWorkHours(
              punches[i].timestamp,
              punches[i + 1].timestamp,
              schedule.start,
              schedule.end
            );
            
            regularHours += calc.regularHours;
            overtime += calc.overtime;
            nightDiff += calc.nightDiff;
            lateMinutes += calc.lateMinutes;
            undertimeMinutes += calc.undertimeMinutes;
            totalHours += calc.totalHours;
            sessionCount++;
          }
        }
        
        // Round values
        const summary = {
          userId,
          date: dateStr,
          regularHours: Math.round(regularHours * 100) / 100,
          overtime: Math.round(overtime * 100) / 100,
          nightDiff: Math.round(nightDiff * 100) / 100,
          lateMinutes: Math.round(lateMinutes),
          undertimeMinutes: Math.round(undertimeMinutes),
          totalHours: Math.round(totalHours * 100) / 100,
          workSessions: sessionCount,
          updatedAt: new Date()
        };
        
        // Save to dailySummary
        const docId = `${userId}_${dateStr}`;
        await db.collection('dailySummary').doc(docId).set(summary);
        
        console.log(`      ✅ Saved: Reg:${summary.regularHours}h OT:${summary.overtime}h ND:${summary.nightDiff}h Late:${summary.lateMinutes}min Under:${summary.undertimeMinutes}min`);
        totalSummariesCreated++;
      }
    }
    
    console.log('\n=====================================');
    console.log(`✅ Successfully created ${totalSummariesCreated} daily summaries!`);
    
    // Verify the collection was created
    const summarySnapshot = await db.collection('dailySummary').limit(1).get();
    if (summarySnapshot.size > 0) {
      console.log(`📊 Verification: dailySummary collection exists with at least 1 document`);
      console.log('   Sample document:', summarySnapshot.docs[0].data());
    } else {
      console.log('⚠️ No documents in dailySummary collection');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the function
generateSummaries().then(() => {
  console.log('🏁 Script finished');
  process.exit(0);
}).catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});