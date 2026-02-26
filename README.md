# Daily Summaries - Backfill Script

This guide explains how to generate daily summaries for all existing attendance records.

## What This Does

The `generateSummaries.js` script:
- ✅ Reads all users from Firestore
- ✅ Fetches all attendance punches for each user
- ✅ Groups punches by date
- ✅ Calculates work hours, overtime, night differential, late minutes, and undertime
- ✅ Saves all daily summaries to the `dailySummary` collection
- ✅ Logs progress for troubleshooting

## How to Run

### **Windows Users (Easy)**
1. Open the backend folder in File Explorer
2. Double-click `generate-summaries.bat`
3. The script will run and show progress
4. When done, the window will pause so you can see the results

### **Command Line (All Users)**
```bash
cd backend
node scripts/generateSummaries.js
```

### **NPM Script (Optional)**
Add to `backend/package.json`:
```json
{
  "scripts": {
    "generate-summaries": "node scripts/generateSummaries.js"
  }
}
```

Then run:
```bash
npm run generate-summaries
```

## What to Expect

Output will look like:
```
🔄 Starting daily summaries generation for all users...

📊 Found 5 users

👤 Processing user: john@example.com (userId123)
   📆 Found 40 punch records
   📅 Processing 20 unique dates
      ✅ 2026-02-01 - Reg:8h OT:0h ND:0h Late:0m Under:0m
      ✅ 2026-02-02 - Reg:8h OT:0.5h ND:0h Late:5m Under:0m
      ✅ 2026-02-03 - Reg:8h OT:0h ND:1h Late:0m Under:0m
      ...

✅ Successfully generated 95 daily summaries!
```

## Verification

After running the script, verify the data was saved:

**In Firebase Console:**
1. Go to Cloud Firestore
2. Look for the `dailySummary` collection
3. You should see documents named like: `userId_2026-02-01`, `userId_2026-02-02`, etc.

**In Frontend:**
- Log in as a regular user
- Go to Dashboard
- Look for the "Today's Summary" card
- Or go to "History & Reports" tab to see historical data

## How the API Uses These Summaries

### GET `/api/daily-summaries/:userId`
- Fetches all daily summaries for a user
- Supports date range filtering (`?startDate=2026-02-01&endDate=2026-02-28`)
- Used by Dashboard and HistoryTable components
- Returns array of dailySummary documents

### POST `/api/calculate-daily-summary`
- Called automatically when a user clocks out
- Calculates and saves the daily summary immediately
- Used by the backend to update summaries in real-time

## Troubleshooting

### "Error: service-account-key.json not found"
- Ensure you're running from the `backend/` directory
- Check that `service-account-key.json` exists in the backend folder

### "No punches found, skipping..."
- This user has no attendance records yet
- This is normal for newly created users

### "No complete work sessions"
- This date has an odd number of punches (incomplete punch in/out pair)
- This is normal if a user is currently clocked in

### Script Takes Too Long
- This is normal! Processing thousands of punches takes time
- Leave it running in the background
- Progress logs will show what's happening

## Data Structure


Each dailySummary document has this structure:
```json
{
  "userId": "user123",
  "date": "2026-02-01",
  "regularHours": 8.0,
  "overtime": 0.5,
  "nightDiff": 0,
  "lateMinutes": 5,
  "undertimeMinutes": 0,
  "totalHours": 8.5,
  "workSessions": 1,
  "updatedAt": "2026-02-24T10:30:00Z"
}
```

## Notes

- ✅ Safe to run multiple times (will overwrite with same data)
- ✅ No data is deleted, only added/updated to dailySummary collection
- ✅ Original attendance records remain unchanged
- ⚠️ Takes time for large datasets (100+ users), be patient
- 💾 Requires internet connection (connects to Firebase)
