# Start FastAPI backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\Activate.ps1; uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1"

# Wait for FastAPI to start
Start-Sleep -Seconds 10

# Start Cloudflare Tunnel
cloudflared tunnel --url http://localhost:8000