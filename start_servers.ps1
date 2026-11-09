# PowerShell Script to Launch Document Forensics Application
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Agentic Document Forensics System... " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Terminate any previous instances on port 8000 or 5173
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port8000) {
    Write-Host "Clearing previous process on port 8000..." -ForegroundColor Yellow
    Get-Process -Id $port8000.OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($port5173) {
    Write-Host "Clearing previous process on port 5173..." -ForegroundColor Yellow
    Get-Process -Id $port5173.OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

# 2. Launch FastAPI Backend in a separate window
Write-Host "`n[1/2] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\Document-Forensics'; python -m uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload"

# 3. Launch React Vite Frontend in a separate window
Write-Host "[2/2] Starting React Frontend on http://localhost:5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\Document-Forensics\frontend'; npx vite --port 5173 --host"

# 4. Wait for servers to initialize
Write-Host "`nWaiting for servers to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 6

# 5. Open browser
Write-Host "`nOpening Dashboard in default browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " SYSTEM ONLINE!" -ForegroundColor Green
Write-Host " Backend:  http://localhost:8000" -ForegroundColor White
Write-Host " Frontend: http://localhost:5173" -ForegroundColor White
Write-Host " API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
