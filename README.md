# Smart Expense Tracker

A full-stack expense tracker built with **React**, **Flask**, and **SQLite**. Track income and expenses, organize transactions by category, and view a monthly spending summary.

## Features
- Add, edit, and delete transactions
- Track income and expenses separately
- Categorize spending
- View total income, expenses, and balance
- Filter transactions by month
- Persistent storage with SQLite

## Tech stack
- Frontend: React + Vite
- Backend: Python + Flask
- Database: SQLite

## Run locally

### 1. Start the backend
```bash
cd backend
python -m venv .venv
```

Activate the environment:

Windows PowerShell:
```powershell
.venv\Scripts\Activate.ps1
```

macOS/Linux:
```bash
source .venv/bin/activate
```

Install dependencies and start Flask:
```bash
pip install -r requirements.txt
python app.py
```

The API runs at http://127.0.0.1:5000.

### 2. Start the frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/transactions | List transactions |
| POST | /api/transactions | Create a transaction |
| PUT | /api/transactions/<id> | Update a transaction |
| DELETE | /api/transactions/<id> | Delete a transaction |
| GET | /api/summary | Get totals and category breakdown |

## Project structure
```
smart-expense-tracker/
  backend/
    app.py
    requirements.txt
  frontend/
    index.html
    package.json
    src/
      App.jsx
      main.jsx
      style.css
```

## Next improvements
- Charts and visual reports
- Monthly budgets and budget alerts
- CSV export
- User accounts and authentication

---
Built as a practical full-stack learning project.