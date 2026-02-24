Write-Host "Setting up Mini HCM Project..." -ForegroundColor Green

# Create backend folder if it doesn't exist
if (-not (Test-Path "backend")) {
    Write-Host "Creating backend folder..." -ForegroundColor Yellow
    mkdir backend
}

# Setup backend
Write-Host "Setting up backend..." -ForegroundColor Green
Set-Location backend
npm init -y
npm install express cors firebase-admin axios dotenv
npm install -D nodemon
New-Item server.js -ItemType File -Force

# Create .env file for backend
@"
PORT=5000
"@ | Out-File -FilePath .env -Encoding utf8

Write-Host "Backend setup complete!" -ForegroundColor Green

# Setup frontend
Write-Host "Setting up frontend..." -ForegroundColor Green
Set-Location ../frontend

# Install frontend dependencies
npm install react-router-dom

# Create .env file for frontend
@"
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
REACT_APP_FIREBASE_PROJECT_ID=your_project_id_here
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
REACT_APP_FIREBASE_APP_ID=your_app_id_here
"@ | Out-File -FilePath .env -Encoding utf8

# Update package.json to add proxy
$packageJson = Get-Content package.json -Raw | ConvertFrom-Json
$packageJson | Add-Member -NotePropertyName "proxy" -NotePropertyValue "http://localhost:5000" -Force
$packageJson | ConvertTo-Json -Depth 10 | Set-Content package.json

Write-Host "Frontend setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open VS Code and edit the files with the code provided" -ForegroundColor Yellow
Write-Host "2. Set up Firebase and update the .env files with your actual keys" -ForegroundColor Yellow
Write-Host "3. Run 'cd backend && npm run dev' in one terminal" -ForegroundColor Yellow
Write-Host "4. Run 'cd frontend && npm start' in another terminal" -ForegroundColor Yellow

Set-Location ../