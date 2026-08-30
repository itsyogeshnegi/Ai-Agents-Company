@echo off
echo ==========================================
echo  Launching AI Agent Company Suite (Node.js + React)
echo ==========================================
start "AI Agency Backend" cmd /k "cd backend && npm install && npm start"
start "AI Agency Frontend" cmd /k "cd frontend && npm install && npm run dev"
echo Both servers initiated!
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
pause
