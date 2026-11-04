
import { useEffect, useMemo, useState } from "react";

const API = (
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

const emptyForm = {
  title: "",
  description: "",
  requester: "",
  email: "",
  category: "Hardware",
  priority: "MEDIUM",
  status: "OPEN",
  assigned_to: "",
};

function App() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("access_token") || ""
  );
  const [refreshToken, setRefreshToken] = useState(
    () => sessionStorage.getItem("refresh_token") || ""
  );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    urgent: 0,
  });

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const params = useMemo(() => {
    const p = new URLSearchParams();

    if (search) p.set("search", search);
    if (status) p.set("status", status);
    if (priority) p.set("priority", priority);

    return p.toString();
  }, [search, status, priority]);

  function saveTokens(access, refresh = refreshToken) {
    sessionStorage.setItem("access_token", access);

    if (refresh) {
      sessionStorage.setItem("refresh_token", refresh);
      setRefreshToken(refresh);
    }

    setToken(access);
  }

  function logout() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");

    setToken("");
    setRefreshToken("");
    setTickets([]);
    setSelectedTicket(null);
    setShowForm(false);
    setPassword("");
    setError("");
    setLoginError("");
  }

  async function login(e) {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);

    try {
      const response = await fetch(`${API}/token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Invalid username or password."
        );
      }

      saveTokens(data.access, data.refresh);
      setPassword("");
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  }

  async function apiRequest(url, options = {}) {
    let currentToken = sessionStorage.getItem("access_token");

    if (!currentToken) {
      throw new Error("Please log in again.");
    }

    const sendRequest = (access) =>
      fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${access}`,
        },
      });

    let response = await sendRequest(currentToken);

    // Refresh an expired access token once.
    if (response.status === 401) {
      const savedRefresh = sessionStorage.getItem("refresh_token");

      if (!savedRefresh) {
        logout();
        throw new Error("Your session expired. Please log in again.");
      }

      const refreshResponse = await fetch(`${API}/token/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh: savedRefresh,
        }),
      });

      const refreshData = await refreshResponse.json();

      if (!refreshResponse.ok) {
        logout();
        throw new Error("Your session expired. Please log in again.");
      }

      currentToken = refreshData.access;
      saveTokens(currentToken, savedRefresh);

      response = await sendRequest(currentToken);
    }

    if (response.status === 401) {
      logout();
      throw new Error("Please log in again.");
    }

    return response;
  }

  async function loadData() {
    if (!token) return;

    try {
      setError("");

      const [ticketRes, statsRes] = await Promise.all([
        apiRequest(`${API}/tickets/?${params}`),
        apiRequest(`${API}/dashboard/`),
      ]);

      if (!ticketRes.ok || !statsRes.ok) {
        throw new Error("Unable to load your HelpDesk data.");
      }

      const ticketData = await ticketRes.json();

      setTickets(
        Array.isArray(ticketData)
          ? ticketData
          : ticketData.results || []
      );

      setStats(await statsRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      setLoading(true);
      loadData();
    }
  }, [token, params]);

  function changeForm(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(ticket) {
    setEditing(ticket.id);

    setForm({
      title: ticket.title,
      description: ticket.description,
      requester: ticket.requester,
      email: ticket.email,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assigned_to: ticket.assigned_to || "",
    });

    setShowForm(true);
  }

  async function saveTicket(e) {
    e.preventDefault();

    try {
      setError("");

      const url = editing
        ? `${API}/tickets/${editing}/`
        : `${API}/tickets/`;

      const response = await apiRequest(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Object.values(data).flat().join(" ") ||
          "Unable to save ticket."
        );
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditing(null);

      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteTicket(id) {
    if (!window.confirm(`Delete ticket #${id}?`)) return;

    try {
      const response = await apiRequest(
        `${API}/tickets/${id}/`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Unable to delete ticket.");
      }

      setSelectedTicket(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(ticket, nextStatus) {
    try {
      const response = await apiRequest(
        `${API}/tickets/${ticket.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Unable to update ticket status.");
      }

      await loadData();

      setSelectedTicket((previous) =>
        previous && previous.id === ticket.id
          ? { ...previous, status: nextStatus }
          : previous
      );
    } catch (err) {
      setError(err.message);
    }
  }

  // LOGIN SCREEN
  if (!token) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={login}>
          <div className="login-brand">
            <span className="brand-mark">H</span>
            <span>
              HelpDesk<span style={{ color: "#3478e5" }}>PRO</span>
            </span>
          </div>

          <h1>Welcome back</h1>
          <p className="login-subtitle">
            Sign in to your IT support workspace.
          </p>

          {loginError && (
            <div className="login-error">{loginError}</div>
          )}

          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>

          <button className="primary" type="submit" disabled={loggingIn}>
            {loggingIn ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">H</span>
          <div>
            HelpDesk<span>PRO</span>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>

        <div
          className={`nav-item ${
            activePage === "dashboard" ? "active" : ""
          }`}
          onClick={() => {
            setActivePage("dashboard");
            setSelectedTicket(null);
          }}
          style={{ cursor: "pointer" }}
        >
          ▦ <span>Dashboard</span>
        </div>

        <div
          className={`nav-item ${
            activePage === "tickets" ? "active" : ""
          }`}
          onClick={() => {
            setActivePage("tickets");
            setSelectedTicket(null);
          }}
          style={{ cursor: "pointer" }}
        >
          ▤ <span>All tickets</span>
        </div>

        <div className="side-bottom">
          <div className="avatar">IT</div>
          <div>
            <b>IT Support</b>
            <small>Support workspace</small>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              WORKSPACE /{" "}
              {activePage === "dashboard" ? "OVERVIEW" : "TICKETS"}
            </div>

            <h1>
              {activePage === "dashboard" ? "Dashboard" : "All Tickets"}
            </h1>
          </div>

          <div className="header-actions">
            <button className="primary" onClick={startCreate}>
              ＋ Create ticket
            </button>

            <button className="secondary" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {activePage === "dashboard" && (
          <>
            <section className="welcome">
              <div>
                <div className="eyebrow light">
                  SUPPORT OPERATIONS
                </div>

                <h2>
                  Good work starts with every issue resolved.
                </h2>

                <p>
                  Track requests, prioritize incidents, and keep your team moving.
                </p>
              </div>

              <div className="welcome-icon">◈</div>
            </section>

            <section className="stats-grid">
              <Stat label="Total tickets" value={stats.total} icon="▤" tone="blue" />
              <Stat label="Open" value={stats.open} icon="◷" tone="orange" />
              <Stat label="In progress" value={stats.in_progress} icon="↻" tone="purple" />
              <Stat label="Resolved" value={stats.resolved} icon="✓" tone="green" />
            </section>
          </>
        )}

        <section className="ticket-section">
          <div className="section-heading">
            <div>
              <h2>
                {activePage === "dashboard" ? "Recent tickets" : "All tickets"}
              </h2>
              <p>Manage and monitor support requests</p>
            </div>

            <span className="count-pill">{tickets.length} shown</span>
          </div>

          <div className="toolbar">
            <input
              className="search"
              placeholder="⌕  Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">All priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>TICKET</th>
                  <th>REQUESTER</th>
                  <th>PRIORITY</th>
                  <th>STATUS</th>
                  <th>CREATED</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="empty">
                      Loading tickets...
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty">
                      No tickets found. Create your first ticket.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div
                          className="ticket-title"
                          onClick={() => setSelectedTicket(t)}
                          style={{ cursor: "pointer", color: "#2563eb" }}
                          title="View ticket details"
                        >
                          #{t.id} · {t.title}
                        </div>
                        <div className="muted">{t.category}</div>
                      </td>

                      <td>
                        <b>{t.requester}</b>
                        <div className="muted">{t.email}</div>
                      </td>

                      <td>
                        <span className={`priority ${t.priority.toLowerCase()}`}>
                          {t.priority}
                        </span>
                      </td>

                      <td>
                        <select
                          className={`status-select ${t.status.toLowerCase()}`}
                          value={t.status}
                          onChange={(e) =>
                            updateStatus(t, e.target.value)
                          }
                        >
                          <option value="OPEN">Open</option>
                          <option value="IN_PROGRESS">In progress</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                      </td>

                      <td>
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>

                      <td>
                        <div className="actions">
                          <button onClick={() => startEdit(t)} title="Edit">
                            ✎
                          </button>
                          <button
                            className="danger"
                            onClick={() => deleteTicket(t.id)}
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer>HelpDesk Pro · IT Issue Management</footer>
      </main>

      {selectedTicket && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setSelectedTicket(null)
          }
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="eyebrow">TICKET DETAILS</div>
                <h2>Ticket #{selectedTicket.id}</h2>
              </div>

              <button
                type="button"
                className="close"
                onClick={() => setSelectedTicket(null)}
              >
                ×
              </button>
            </div>

            <div className="ticket-details">
              <div>
                <small>Issue title</small>
                <h3>{selectedTicket.title}</h3>
              </div>

              <div>
                <small>Description</small>
                <p>
                  {selectedTicket.description || "No description provided."}
                </p>
              </div>

              <div className="form-row">
                <div>
                  <small>Requester</small>
                  <p>{selectedTicket.requester}</p>
                </div>
                <div>
                  <small>Email</small>
                  <p>{selectedTicket.email}</p>
                </div>
              </div>

              <div className="form-row">
                <div>
                  <small>Category</small>
                  <p>{selectedTicket.category}</p>
                </div>
                <div>
                  <small>Priority</small>
                  <p>{selectedTicket.priority}</p>
                </div>
              </div>

              <div className="form-row">
                <div>
                  <small>Status</small>
                  <p>{selectedTicket.status.replace("_", " ")}</p>
                </div>
                <div>
                  <small>Assigned to</small>
                  <p>{selectedTicket.assigned_to || "Not assigned"}</p>
                </div>
              </div>

              <div>
                <small>Created date</small>
                <p>
                  {selectedTicket.created_at
                    ? new Date(selectedTicket.created_at).toLocaleString()
                    : "Not available"}
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="secondary"
                onClick={() => {
                  startEdit(selectedTicket);
                  setSelectedTicket(null);
                }}
              >
                Edit ticket
              </button>

              <button
                className="primary"
                onClick={() => setSelectedTicket(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setShowForm(false)
          }
        >
          <form className="modal" onSubmit={saveTicket}>
            <div className="modal-head">
              <div>
                <div className="eyebrow">TICKET MANAGEMENT</div>
                <h2>
                  {editing
                    ? `Edit ticket #${editing}`
                    : "Create a support ticket"}
                </h2>
              </div>

              <button
                type="button"
                className="close"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>

            <label>
              Issue title
              <input
                name="title"
                value={form.title}
                onChange={changeForm}
                required
                maxLength="200"
                placeholder="e.g. Laptop not connecting to Wi-Fi"
              />
            </label>

            <label>
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={changeForm}
                required
                rows="3"
                placeholder="Describe the issue..."
              />
            </label>

            <div className="form-row">
              <label>
                Requester name
                <input
                  name="requester"
                  value={form.requester}
                  onChange={changeForm}
                  required
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={changeForm}
                  required
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Category
                <select
                  name="category"
                  value={form.category}
                  onChange={changeForm}
                >
                  <option>Hardware</option>
                  <option>Software</option>
                  <option>Network</option>
                  <option>Access</option>
                  <option>General</option>
                </select>
              </label>

              <label>
                Priority
                <select
                  name="priority"
                  value={form.priority}
                  onChange={changeForm}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={changeForm}
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </label>

              <label>
                Assigned to
                <input
                  name="assigned_to"
                  value={form.assigned_to}
                  onChange={changeForm}
                  placeholder="Support agent (optional)"
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button className="primary" type="submit">
                {editing ? "Save changes" : "Create ticket"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}

export default App;
