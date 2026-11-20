from datetime import date
from pathlib import Path
import sqlite3

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = Path(__file__).with_name("expenses.db")
CATEGORIES = {"Food", "Transport", "Shopping", "Bills", "Health", "Education", "Entertainment", "Other", "Salary", "Freelance"}


def connect():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_db():
    with connect() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                amount REAL NOT NULL CHECK(amount > 0),
                kind TEXT NOT NULL CHECK(kind IN ('income', 'expense')),
                category TEXT NOT NULL,
                transaction_date TEXT NOT NULL
            )
        """)


def serialize(row):
    return dict(row)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/transactions")
def get_transactions():
    month = request.args.get("month")
    query = "SELECT * FROM transactions"
    params = []
    if month:
        query += " WHERE substr(transaction_date, 1, 7) = ?"
        params.append(month)
    query += " ORDER BY transaction_date DESC, id DESC"
    with connect() as db:
        rows = db.execute(query, params).fetchall()
    return jsonify([serialize(row) for row in rows])


@app.post("/api/transactions")
def create_transaction():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    kind = data.get("kind")
    category = data.get("category")
    try:
        amount = float(data.get("amount", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Amount must be a valid number."}), 400
    transaction_date = data.get("transaction_date") or date.today().isoformat()

    if not title:
        return jsonify({"error": "Please enter a title."}), 400
    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero."}), 400
    if kind not in {"income", "expense"}:
        return jsonify({"error": "Type must be income or expense."}), 400
    if category not in CATEGORIES:
        return jsonify({"error": "Please choose a valid category."}), 400
    try:
        date.fromisoformat(transaction_date)
    except (TypeError, ValueError):
        return jsonify({"error": "Please provide a valid date (YYYY-MM-DD)."}), 400

    with connect() as db:
        cursor = db.execute(
            """INSERT INTO transactions (title, amount, kind, category, transaction_date)
               VALUES (?, ?, ?, ?, ?)""",
            (title, amount, kind, category, transaction_date),
        )
        row = db.execute("SELECT * FROM transactions WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify(serialize(row)), 201


@app.put("/api/transactions/<int:transaction_id>")
def update_transaction(transaction_id):
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    kind = data.get("kind")
    category = data.get("category")
    try:
        amount = float(data.get("amount", 0))
        transaction_date = data.get("transaction_date")
        date.fromisoformat(transaction_date)
    except (TypeError, ValueError):
        return jsonify({"error": "Enter a valid amount and date."}), 400
    if not title or amount <= 0 or kind not in {"income", "expense"} or category not in CATEGORIES:
        return jsonify({"error": "Please check all transaction fields."}), 400

    with connect() as db:
        existing = db.execute("SELECT id FROM transactions WHERE id = ?", (transaction_id,)).fetchone()
        if not existing:
            return jsonify({"error": "Transaction not found."}), 404
        db.execute(
            """UPDATE transactions
               SET title = ?, amount = ?, kind = ?, category = ?, transaction_date = ?
               WHERE id = ?""",
            (title, amount, kind, category, transaction_date, transaction_id),
        )
        row = db.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,)).fetchone()
    return jsonify(serialize(row))


@app.delete("/api/transactions/<int:transaction_id>")
def delete_transaction(transaction_id):
    with connect() as db:
        cursor = db.execute("DELETE FROM transactions WHERE id = ?", (transaction_id,))
        if cursor.rowcount == 0:
            return jsonify({"error": "Transaction not found."}), 404
    return jsonify({"message": "Transaction deleted."})


@app.get("/api/summary")
def summary():
    month = request.args.get("month")
    where = "WHERE substr(transaction_date, 1, 7) = ?" if month else ""
    params = [month] if month else []
    with connect() as db:
        totals = db.execute(
            f"""SELECT
                COALESCE(SUM(CASE WHEN kind = 'income' THEN amount ELSE 0 END), 0) AS income,
                COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount ELSE 0 END), 0) AS expenses
                FROM transactions {where}""",
            params,
        ).fetchone()
        categories = db.execute(
            f"""SELECT category, SUM(amount) AS total FROM transactions
                {where} {"AND" if where else "WHERE"} kind = 'expense'
                GROUP BY category ORDER BY total DESC""",
            params,
        ).fetchall()
    income = round(totals["income"], 2)
    expenses = round(totals["expenses"], 2)
    return jsonify({
        "income": income,
        "expenses": expenses,
        "balance": round(income - expenses, 2),
        "by_category": [serialize(row) for row in categories],
    })


initialize_db()

if __name__ == "__main__":
    app.run(debug=True, port=5000)