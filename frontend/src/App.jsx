import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:5000/api";
const categories = ["Food", "Transport", "Shopping", "Bills", "Health", "Education", "Entertainment", "Other", "Salary", "Freelance"];
const today = new Date().toISOString().slice(0, 10);
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const emptyForm = { title: "", amount: "", kind: "expense", category: "Food", transaction_date: today };

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0, by_category: [] });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [txResponse, summaryResponse] = await Promise.all([
        fetch(`${API}/transactions?month=${month}`),
        fetch(`${API}/summary?month=${month}`)
      ]);
      if (!txResponse.ok || !summaryResponse.ok) throw new Error("Could not load data. Is the Python backend running?");
      setTransactions(await txResponse.json());
      setSummary(await summaryResponse.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [month]);

  const maxCategory = useMemo(() => Math.max(1, ...summary.by_category.map((item) => item.total)), [summary]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch(editingId ? `${API}/transactions/${editingId}` : `${API}/transactions`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save transaction.");
      setForm(emptyForm);
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function edit(item) {
    setEditingId(item.id);
    setForm({ title: item.title, amount: String(item.amount), kind: item.kind, category: item.category, transaction_date: item.transaction_date });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id) {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      const response = await fetch(`${API}/transactions/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete transaction.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">₹</span><span>pocket<span className="brand-light">wise</span></span></div>
        <label className="month-picker">Month <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
      </header>

      <section className="intro">
        <div><p className="eyebrow">YOUR MONEY, IN FOCUS</p><h1>Good money habits<br /><span>start right here.</span></h1><p className="subtext">A clearer picture of your spending, one transaction at a time.</p></div>
        <div className="intro-art" aria-hidden="true"><div className="art-circle">₹</div><span className="art-spark">✦</span></div>
      </section>

      {error && <div className="alert">{error}</div>}

      <section className="stats">
        <article className="stat-card balance"><p>Total balance</p><strong>{money(summary.balance)}</strong><span>Income minus expenses</span></article>
        <article className="stat-card"><p>Total income</p><strong className="positive">{money(summary.income)}</strong><span>Money coming in</span></article>
        <article className="stat-card"><p>Total expenses</p><strong className="negative">{money(summary.expenses)}</strong><span>Money going out</span></article>
      </section>

      <section className="content-grid">
        <article className="panel form-panel">
          <div className="panel-heading"><div><p className="eyebrow">TRANSACTION</p><h2>{editingId ? "Edit entry" : "Add an entry"}</h2></div><span className="plus-icon">{editingId ? "✎" : "+"}</span></div>
          <form onSubmit={submit}>
            <label>Description<input required maxLength="80" placeholder="e.g. Weekly groceries" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label>Amount (₹)<input required min="0.01" step="0.01" type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
            <div className="two-fields">
              <label>Type<select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, category: e.target.value === "income" ? "Salary" : "Food" })}><option value="expense">Expense</option><option value="income">Income</option></select></label>
              <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.filter((c) => form.kind === "income" ? ["Salary", "Freelance", "Other"].includes(c) : !["Salary", "Freelance"].includes(c)).map((c) => <option key={c}>{c}</option>)}</select></label>
            </div>
            <label>Date<input required type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} /></label>
            <button className="primary-button" type="submit">{editingId ? "Save changes" : "Add transaction"} <span>↗</span></button>
            {editingId && <button className="cancel-button" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel edit</button>}
          </form>
        </article>

        <article className="panel activity-panel">
          <div className="panel-heading"><div><p className="eyebrow">YOUR ACTIVITY</p><h2>Recent transactions</h2></div><span className="count">{transactions.length} entries</span></div>
          {loading ? <p className="empty">Loading transactions…</p> : transactions.length === 0 ? <div className="empty"><span>◌</span><strong>No entries this month</strong><p>Add your first transaction to get started.</p></div> :
            <div className="transaction-list">{transactions.map((item) => <div className="transaction" key={item.id}>
              <div className="transaction-icon">{item.kind === "income" ? "↙" : "↗"}</div>
              <div className="transaction-info"><strong>{item.title}</strong><span>{item.category} · {item.transaction_date}</span></div>
              <div className="transaction-right"><strong className={item.kind === "income" ? "positive" : "negative"}>{item.kind === "income" ? "+" : "−"}{money(item.amount)}</strong><div className="actions"><button onClick={() => edit(item)} aria-label="Edit transaction">Edit</button><button onClick={() => remove(item.id)} aria-label="Delete transaction">Delete</button></div></div>
            </div>)}</div>}
        </article>
      </section>

      <section className="panel breakdown">
        <div className="panel-heading"><div><p className="eyebrow">WHERE IT GOES</p><h2>Spending by category</h2></div></div>
        {summary.by_category.length === 0 ? <p className="empty">Your expense breakdown will appear here.</p> :
          <div className="category-list">{summary.by_category.map((item) => <div className="category-row" key={item.category}><div className="category-label"><span>{item.category}</span><strong>{money(item.total)}</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${(item.total / maxCategory) * 100}%` }} /></div></div>)}</div>}
      </section>
      <footer>Made with care · Smart Expense Tracker</footer>
    </main>
  );
}