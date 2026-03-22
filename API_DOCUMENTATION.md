# 🎓 CRM Backend — Complete API Documentation & Frontend Integration Guide

> **Base URL:** `http://localhost:5000/api`  
> **Auth:** All protected routes require `Authorization: Bearer <token>` header  
> **Content-Type:** `application/json` (except file uploads: `multipart/form-data`)

---

## 📦 Frontend Setup (React + Axios)

### Install Dependencies
```bash
npm install axios react-router-dom socket.io-client
```

### `src/api/axiosInstance.js`
```js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("crm_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("crm_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
```

### `src/socket.js` — Socket.io Connection
```js
import { io } from "socket.io-client";

let socket;

export const connectSocket = (userId) => {
  socket = io("http://localhost:5000", { transports: ["websocket"] });
  socket.on("connect", () => {
    socket.emit("join", userId); // Join personal notification room
  });
  return socket;
};

export const getSocket = () => socket;
export const disconnectSocket = () => socket?.disconnect();
```

---

## 1. 🔐 AUTH MODULE

### POST `/api/auth/register`
**Access:** Public (Agents)

**Request Body:**
```json
{
  "name": "Jane Agent",
  "email": "jane@crm.com",
  "phone": "9876543210",
  "password": "Jane@1234"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful, pending admin approval",
  "user": {
    "_id": "65f1a2b3...",
    "name": "Jane Agent",
    "email": "jane@crm.com",
    "role": "agent",
    "status": "pending"
  }
}
```

---

### POST `/api/auth/login`
**Access:** Public

**Request Body:**
```json
{
  "email": "admin@crm.com",
  "password": "Admin@1234"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Super Admin",
    "email": "admin@crm.com",
    "role": "admin",
    "phone": "9000000000"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### Frontend: `src/pages/Login.jsx`
```jsx
import { useState } from "react";
import api from "../api/axiosInstance";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/login", form);
      localStorage.setItem("crm_token", data.token);
      localStorage.setItem("crm_user", JSON.stringify(data.user));
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" placeholder="Email"
        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input type="password" placeholder="Password"
        value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## 2. 👤 USERS MODULE

### POST `/api/users/create-agent`
**Access:** Admin only

**Request Body:**
```json
{
  "name": "John Agent",
  "email": "john@crm.com",
  "phone": "9876543210",
  "password": "Agent@1234"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Agent created successfully",
  "agent": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d2",
    "name": "John Agent",
    "email": "john@crm.com",
    "phone": "9876543210",
    "status": "active"
  }
}
```

---

### GET `/api/users`
**Access:** Admin only

**Success Response (200):**
```json
{
  "success": true,
  "message": "Agents fetched",
  "count": 2,
  "agents": [
    {
      "_id": "65f1...",
      "name": "John Agent",
      "email": "john@crm.com",
      "role": "agent",
      "status": "active",
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### PUT `/api/users/:id`
**Access:** Admin only

**Request Body (any combination):**
```json
{
  "name": "John Updated",
  "phone": "9000000001",
  "status": "inactive"
}
```

---

### DELETE `/api/users/:id`
**Access:** Admin only  
*(Soft deletes — sets status to `inactive`)*

**Success Response (200):**
```json
{
  "success": true,
  "message": "Agent deactivated",
  "agent": { "_id": "65f1...", "status": "inactive" }
}
```

### Frontend: `src/services/userService.js`
```js
import api from "../api/axiosInstance";

export const createAgent = (data) => api.post("/users/create-agent", data);
export const getAgents   = ()     => api.get("/users");
export const updateAgent = (id, data) => api.put(`/users/${id}`, data);
export const deactivateAgent = (id)  => api.delete(`/users/${id}`);
```

---

## 3. 📋 LEADS MODULE

### POST `/api/leads`
**Access:** Admin, Agent

**Request Body:**
```json
{
  "name": "Rahul Sharma",
  "phone": "9876543210",
  "email": "rahul@email.com",
  "leadSource": "Website",
  "assignedAgent": "65f1a2b3c4d5e6f7a8b9c0d2",
  "followUpDate": "2025-02-01T10:00:00.000Z"
}
```

**Lead Sources:** `Website` | `Referral` | `Social Media` | `Walk-in` | `Advertisement` | `Other`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Lead created successfully",
  "lead": {
    "_id": "65f2...",
    "name": "Rahul Sharma",
    "status": "New Lead",
    "leadSource": "Website",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### GET `/api/leads`
**Access:** Admin (all leads), Agent (own leads only)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Records per page (default: 20, max: 100) |
| `status` | string | Filter by status |
| `leadSource` | string | Filter by source |

**Example:** `GET /api/leads?page=1&limit=10&status=Interested`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Leads fetched",
  "leads": [
    {
      "_id": "65f2...",
      "name": "Rahul Sharma",
      "phone": "9876543210",
      "email": "rahul@email.com",
      "status": "Interested",
      "leadSource": "Website",
      "followUpDate": "2025-02-01T10:00:00.000Z",
      "assignedAgent": { "_id": "65f1...", "name": "John Agent", "email": "john@crm.com" },
      "createdBy": { "_id": "65f0...", "name": "Super Admin" },
      "notes": []
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 45, "pages": 5 }
}
```

---

### GET `/api/leads/:id`
**Success Response (200):**
```json
{
  "success": true,
  "lead": {
    "_id": "65f2...",
    "name": "Rahul Sharma",
    "notes": [
      {
        "_id": "65f3...",
        "content": "Interested in Canada MBA",
        "addedBy": { "name": "John Agent" },
        "createdAt": "2025-01-16T09:00:00.000Z"
      }
    ]
  }
}
```

---

### PUT `/api/leads/:id`
**Access:** Admin, Agent  
*(Handles status update, agent assignment, note addition simultaneously)*

**Request Body:**
```json
{
  "status": "Interested",
  "assignedAgent": "65f1...",
  "followUpDate": "2025-02-15T10:00:00.000Z",
  "note": "Called client, very interested in Canada PR pathway"
}
```

**Lead Statuses:**
- `New Lead` → `Contacted` → `Interested` → `Documents Pending`
- → `Application Submitted` → `Visa Process` → `Converted` / `Rejected`

---

### DELETE `/api/leads/:id`
**Access:** Admin only

### Frontend: `src/services/leadService.js`
```js
import api from "../api/axiosInstance";

export const createLead  = (data)        => api.post("/leads", data);
export const getLeads    = (params = {}) => api.get("/leads", { params });
export const getLeadById = (id)          => api.get(`/leads/${id}`);
export const updateLead  = (id, data)    => api.put(`/leads/${id}`, data);
export const deleteLead  = (id)          => api.delete(`/leads/${id}`);
```

### Frontend: `src/pages/Leads.jsx` (List with pagination)
```jsx
import { useEffect, useState } from "react";
import { getLeads } from "../services/leadService";

export default function Leads() {
  const [leads, setLeads]       = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState("");

  useEffect(() => {
    getLeads({ page, limit: 10, status }).then(({ data }) => {
      setLeads(data.leads);
      setPagination(data.pagination);
    });
  }, [page, status]);

  return (
    <div>
      <select onChange={(e) => setStatus(e.target.value)}>
        <option value="">All Statuses</option>
        {["New Lead","Contacted","Interested","Documents Pending",
          "Application Submitted","Visa Process","Converted","Rejected"]
          .map((s) => <option key={s}>{s}</option>)}
      </select>

      <table>
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Status</th><th>Agent</th></tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l._id}>
              <td>{l.name}</td>
              <td>{l.phone}</td>
              <td>{l.status}</td>
              <td>{l.assignedAgent?.name || "Unassigned"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
      <span> Page {pagination.page} of {pagination.pages} </span>
      <button disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>Next</button>
    </div>
  );
}
```

---

## 4. 🎓 STUDENTS MODULE

### POST `/api/students`
**Access:** Admin, Agent  
*(Note: This is an **Upsert** endpoint. If a profile already exists for the `leadId`, it updates it; otherwise, it creates a new one.)*

**Request Body:**
```json
{
  "leadId": "65f2...",
  "presentCourse": "B.Tech Computer Science",
  "preferredCountry": "Canada",
  "applicationStatus": "In Progress"
}
```

**Success Response (201/200):**
```json
{
  "success": true,
  "message": "Student profile created / updated",
  "student": { "_id": "65f4...", "leadId": "65f2...", "preferredCountry": "Canada" }
}
```

---

### GET `/api/students/lead/:leadId`
**Access:** Admin, Agent

**Success Response (200):**
```json
{
  "success": true,
  "student": {
    "_id": "65f4...",
    "leadId": { "name": "Rahul Sharma", "email": "rahul@email.com" },
    "preferredCountry": "Canada",
    "applicationStatus": "In Progress"
  }
}
```

---

### GET `/api/students`
**Access:** Admin, Agent

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Records per page (default: 10) |
| `searchTerm` | string | Search by Lead name or email |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Students fetched",
  "students": [
    {
      "_id": "65f4...",
      "leadId": { "name": "Rahul Sharma", "email": "rahul@email.com" },
      "preferredCountry": "Canada",
      "applicationStatus": "In Progress"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 25, "pages": 3 }
}
```

---

### GET `/api/students/:id`
**Success Response (200):**
```json
{
  "success": true,
  "student": {
    "_id": "65f4...",
    "leadId": { "_id": "65f2...", "name": "Rahul Sharma", "email": "rahul@email.com", "status": "Interested" },
    "presentCourse": "B.Tech Computer Science",
    "englishTest": { "type": "IELTS", "score": 7.0 },
    "preferredCountry": "Canada",
    "visaStatus": "Not Applied"
  }
}
```

---

### PUT `/api/students/:id`
**Request Body (partial update supported):**
```json
{
  "visaStatus": "Applied",
  "applicationStatus": "Submitted",
  "preferredIntake": "January 2026"
}
```

### Frontend: `src/services/studentService.js`
```js
import api from "../api/axiosInstance";

export const createStudent  = (data)     => api.post("/students", data);
export const getStudentById = (id)       => api.get(`/students/${id}`);
export const updateStudent  = (id, data) => api.put(`/students/${id}`, data);
```

---

## 5. 📄 DOCUMENTS MODULE

### POST `/api/documents/upload`
**Access:** Admin, Agent  
**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required |
|-------|------|----------|
| `file` | File | ✅ |
| `studentId` | string (ObjectId) | ✅ |
| `documentType` | string | ✅ |

**Document Types:** `Passport` | `10th Marksheet` | `12th Marksheet` | `Degree Certificate` | `Transcripts` | `Resume` | `SOP` | `LOR`

**Allowed File Types:** JPG, PNG, PDF, DOC, DOCX (max 10 MB)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "document": {
    "_id": "65f5...",
    "studentId": "65f4...",
    "documentType": "Passport",
    "fileUrl": "https://your-bucket-name.s3.your-region.amazonaws.com/crm/documents/.../passport.pdf",
    "uploadedBy": "65f0...",
    "uploadedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### GET `/api/documents/student/:id`
**Success Response (200):**
```json
{
  "success": true,
  "count": 3,
  "documents": [
    {
      "_id": "65f5...",
      "documentType": "Passport",
      "fileUrl": "https://your-bucket-name.s3.amazonaws.com/...",
      "uploadedBy": { "name": "John Agent", "email": "john@crm.com" },
      "uploadedAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### DELETE `/api/documents/:id`
**Access:** Admin, Agent  
*(Deletes from AWS S3 AND database)*

**Success Response (200):**
```json
{
  "success": true,
  "message": "Document deleted"
}
```

### Frontend: `src/pages/DocumentUpload.jsx`
```jsx
import { useState } from "react";
import api from "../api/axiosInstance";

const DOC_TYPES = ["Passport","10th Marksheet","12th Marksheet",
  "Degree Certificate","Transcripts","Resume","SOP","LOR"];

export default function DocumentUpload({ studentId }) {
  const [file, setFile]       = useState(null);
  const [docType, setDocType] = useState("");
  const [status, setStatus]   = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !docType) return setStatus("Select file and type");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("studentId", studentId);
    formData.append("documentType", docType);

    try {
      setStatus("Uploading...");
      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus("✅ Uploaded successfully!");
    } catch (err) {
      setStatus("❌ " + (err.response?.data?.message || "Upload failed"));
    }
  };

  return (
    <form onSubmit={handleUpload}>
      <select value={docType} onChange={(e) => setDocType(e.target.value)}>
        <option value="">Select Document Type</option>
        {DOC_TYPES.map((d) => <option key={d}>{d}</option>)}
      </select>
      <input type="file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
        onChange={(e) => setFile(e.target.files[0])} />
      <button type="submit">Upload</button>
      <p>{status}</p>
    </form>
  );
}
```

---

## 6. 💬 MESSAGES MODULE (WhatsApp)

### POST `/api/messages/send`
**Access:** Admin, Agent

**Request Body:**
```json
{
  "leadId": "65f2...",
  "message": "Hello Rahul, this is John from ABC Education Consultancy. Are you still interested in studying in Canada?",
  "type": "text"
}
```

**Message Types:** `text` | `template` | `media`  
*(Phone number is automatically fetched from the Lead record)*

**Success Response (201):**
```json
{
  "success": true,
  "message": "Message sent",
  "message": {
    "_id": "65f6...",
    "leadId": "65f2...",
    "senderId": "65f0...",
    "message": "Hello Rahul...",
    "type": "text",
    "status": "sent",
    "whatsappMessageId": "wamid.HBgM...",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### GET `/api/messages/:leadId`
**Success Response (200):**
```json
{
  "success": true,
  "count": 5,
  "messages": [
    {
      "_id": "65f6...",
      "message": "Hello Rahul...",
      "type": "text",
      "status": "sent",
      "senderId": { "name": "John Agent", "email": "john@crm.com" },
      "timestamp": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

### Frontend: `src/pages/MessagePanel.jsx`
```jsx
import { useState, useEffect } from "react";
import api from "../api/axiosInstance";

export default function MessagePanel({ leadId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);

  const fetchMessages = () =>
    api.get(`/messages/${leadId}`).then(({ data }) => setMessages(data.messages));

  useEffect(() => { fetchMessages(); }, [leadId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.post("/messages/send", { leadId, message: text, type: "text" });
      setText("");
      fetchMessages();
    } catch (err) {
      alert(err.response?.data?.message || "Send failed");
    } finally { setSending(false); }
  };

  return (
    <div>
      <div style={{ height: 300, overflowY: "auto" }}>
        {messages.map((m) => (
          <div key={m._id} style={{ margin: "8px 0" }}>
            <strong>{m.senderId?.name}:</strong> {m.message}
            <small style={{ marginLeft: 8, color: m.status === "failed" ? "red" : "green" }}>
              [{m.status}]
            </small>
          </div>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
      <button onClick={send} disabled={sending}>
        {sending ? "Sending..." : "Send WhatsApp"}
      </button>
    </div>
  );
}
```

---

## 7. 🔔 NOTIFICATIONS MODULE

### GET `/api/notifications`
**Access:** Admin, Agent

**Success Response (200):**
```json
{
  "success": true,
  "message": "Notifications fetched",
  "unreadCount": 3,
  "notifications": [
    {
      "_id": "65f7...",
      "message": "You have been assigned a new lead: Rahul Sharma",
      "type": "New Lead Assigned",
      "isRead": false,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "relatedEntity": { "entityType": "Lead", "entityId": "65f2..." }
    }
  ]
}
```

**Notification Types:**
- `New Lead Assigned` — When a lead is assigned to agent
- `Follow-up Reminder` — Hourly cron job trigger
- `Document Uploaded` — When a document is uploaded
- `Lead Status Updated` — When lead status changes

---

### PUT `/api/notifications/read`
**Mark all unread as read:**
```json
{}
```

**Mark specific notifications as read:**
```json
{
  "ids": ["65f7...", "65f8..."]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "3 notification(s) marked as read"
}
```

### Frontend: `src/components/NotificationBell.jsx`
```jsx
import { useState, useEffect } from "react";
import api from "../api/axiosInstance";
import { getSocket } from "../socket";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread]               = useState(0);
  const [open, setOpen]                   = useState(false);

  const fetchNotifications = () =>
    api.get("/notifications").then(({ data }) => {
      setNotifications(data.notifications);
      setUnread(data.unreadCount);
    });

  useEffect(() => {
    fetchNotifications();

    // Listen for real-time notifications
    const socket = getSocket();
    if (socket) {
      socket.on("notification", (notif) => {
        setNotifications((prev) => [notif, ...prev]);
        setUnread((u) => u + 1);
      });
    }
    return () => socket?.off("notification");
  }, []);

  const markAllRead = async () => {
    await api.put("/notifications/read");
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(!open)}>
        🔔 {unread > 0 && <span style={{ background:"red",color:"white",borderRadius:"50%",padding:"2px 6px" }}>{unread}</span>}
      </button>
      {open && (
        <div style={{ position:"absolute",right:0,width:320,background:"white",border:"1px solid #ccc",borderRadius:8,zIndex:999 }}>
          <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 12px" }}>
            <b>Notifications</b>
            <button onClick={markAllRead}>Mark all read</button>
          </div>
          {notifications.slice(0, 10).map((n) => (
            <div key={n._id} style={{ padding:"8px 12px", background: n.isRead ? "#fff" : "#f0f4ff", borderBottom:"1px solid #eee" }}>
              <p style={{ margin:0, fontSize:13 }}>{n.message}</p>
              <small style={{ color:"#888" }}>{new Date(n.createdAt).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 8. 📊 REPORTS MODULE

### GET `/api/reports/dashboard`
**Access:** Admin only

**Success Response (200):**
```json
{
  "success": true,
  "message": "Dashboard data fetched",
  "stats": {
    "totalLeads": 150,
    "newLeadsToday": 12,
    "pendingFollowups": 5,
    "convertedStudents": 25,
    "activeAgents": 8
  },
  "leadPipeline": [
    { "_id": "New Lead", "count": 40 },
    { "_id": "Interested", "count": 35 },
    { "_id": "Converted", "count": 25 }
  ],
  "recentLeads": [
    {
      "_id": "65f2...",
      "name": "Rahul Sharma",
      "email": "rahul@email.com",
      "status": "New Lead",
      "createdAt": "2025-01-15T10:00:00.000Z",
      "assignedAgent": { "name": "John Agent" }
    }
  ],
  "followUpReminders": [
    {
      "_id": "65f3...",
      "name": "Amit Patel",
      "followUpDate": "2025-01-16T10:00:00.000Z",
      "status": "Interested",
      "assignedAgent": { "name": "John Agent" }
    }
  ],
  "agentPerformance": [
    {
      "_id": "65f1...",
      "name": "John Agent",
      "email": "john@crm.com",
      "totalLeads": 20,
      "converted": 5,
      "conversionRate": 25.0
    }
  ]
}
```

### Frontend: `src/pages/Dashboard.jsx`
```jsx
import { useEffect, useState } from "react";
import api from "../api/axiosInstance";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/reports/dashboard").then(({ data }) => setData(data));
  }, []);

  if (!data) return <p>Loading dashboard...</p>;

  return (
    <div style={{ padding: 24 }}>
      <h1>CRM Dashboard</h1>

      {/* Summary KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns: "repeat(5, 1fr)", gap:16, marginBottom: 32 }}>
        {[
          { label: "Total Leads", val: data.stats.totalLeads, color: "#4f46e5" },
          { label: "New Today", val: data.stats.newLeadsToday, color: "#10b981" },
          { label: "Pending Followups", val: data.stats.pendingFollowups, color: "#f59e0b" },
          { label: "Converted", val: data.stats.convertedStudents, color: "#06b6d4" },
          { label: "Active Agents", val: data.stats.activeAgents, color: "#8b5cf6" },
        ].map((card) => (
          <div key={card.label} style={{ background: card.color, color:"white", padding:20, borderRadius:8 }}>
            <h4 style={{ margin: 0 }}>{card.label}</h4>
            <p style={{ fontSize:32, fontWeight:"bold", margin:0 }}>{card.val}</p>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Pipeline Overview */}
        <section>
          <h2>Lead Pipeline</h2>
          {data.leadPipeline.map(item => (
            <div key={item._id} style={{ display:"flex", justifyContent:"space-between", padding:8, borderBottom:"1px solid #eee" }}>
              <span>{item._id}</span>
              <b>{item.count}</b>
            </div>
          ))}
        </section>

        {/* Agent Performance */}
        <section>
          <h2>Agent Performance (This Month)</h2>
          <table width="100%" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background:"#f9fafb", textAlign:"left" }}>
                <th style={{ padding:8 }}>Agent</th>
                <th style={{ padding:8 }}>Leads</th>
                <th style={{ padding:8 }}>Win</th>
                <th style={{ padding:8 }}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.agentPerformance.map(a => (
                <tr key={a._id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding:8 }}>{a.name}</td>
                  <td style={{ padding:8 }}>{a.totalLeads}</td>
                  <td style={{ padding:8 }}>{a.converted}</td>
                  <td style={{ padding:8 }}>{a.conversionRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div style={{ display:"grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 32 }}>
        {/* Recent Leads */}
        <section>
          <h2>Recent Leads</h2>
          {data.recentLeads.map(lead => (
            <div key={lead._id} style={{ padding:12, border:"1px solid #eee", borderRadius:8, marginBottom:8 }}>
              <b>{lead.name}</b> <small style={{ color:"#666" }}>({lead.status})</small>
              <div style={{ fontSize:12, color:"#888" }}>Assigned to: {lead.assignedAgent?.name || 'Unassigned'}</div>
            </div>
          ))}
        </section>

        {/* Follow-up Reminders */}
        <section>
          <h2>Upcoming Follow-ups</h2>
          {data.followUpReminders.map(rem => (
            <div key={rem._id} style={{ padding:12, border:"1px solid #eee", borderRadius:8, marginBottom:8, borderLeft:"4px solid #f59e0b" }}>
              <b>{rem.name}</b>
              <div style={{ fontSize:12 }}>📅 {new Date(rem.followUpDate).toLocaleString()}</div>
              <div style={{ fontSize:12, color:"#888" }}>Agent: {rem.assignedAgent?.name}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
```

---

## 9. ❌ ERROR RESPONSES

All errors follow this consistent format:

```json
{
  "success": false,
  "message": "Human readable error message"
}
```

| HTTP Code | Meaning |
|-----------|---------|
| `400` | Bad request / missing required fields |
| `401` | Unauthorized — invalid or missing token |
| `403` | Forbidden — insufficient role |
| `404` | Resource not found |
| `409` | Conflict — duplicate (email already exists) |
| `413` | File too large (> 10 MB) |
| `422` | Validation error — invalid input fields |
| `429` | Too many requests (rate limit hit) |
| `500` | Internal server error |

**Validation Error (422):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Valid email is required" },
    { "field": "password", "message": "Password must be at least 6 characters" }
  ]
}
```

---

## 10. 🔌 Frontend Auth Context

### `src/context/AuthContext.jsx`
```jsx
import { createContext, useContext, useState, useEffect } from "react";
import { connectSocket, disconnectSocket } from "../socket";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("crm_user");
    return u ? JSON.parse(u) : null;
  });

  const login = (userData, token) => {
    localStorage.setItem("crm_token", token);
    localStorage.setItem("crm_user", JSON.stringify(userData));
    setUser(userData);
    connectSocket(userData._id); // Connect socket on login
  };

  const logout = () => {
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_user");
    setUser(null);
    disconnectSocket();
    window.location.href = "/login";
  };

  useEffect(() => {
    if (user) connectSocket(user._id);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### `src/components/PrivateRoute.jsx`
```jsx
import { Navigate } from "react-router-dom";
import { useAuth }  from "../context/AuthContext";

export default function PrivateRoute({ children, adminOnly = false }) {
  const { user, isAdmin } = useAuth();
  if (!user)              return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" />;
  return children;
}
```

### `src/App.jsx` (Route Setup)
```jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Login       from "./pages/Login";
import Dashboard   from "./pages/Dashboard";
import Leads       from "./pages/Leads";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <PrivateRoute adminOnly><Dashboard /></PrivateRoute>
          } />
          <Route path="/leads" element={
            <PrivateRoute><Leads /></PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

---

## 11. 🩺 Health Check

### GET `/api/reports/agent-dashboard`
**Access:** Agent, Admin

**Success Response (200):**
```json
{
  "success": true,
  "message": "Agent dashboard data fetched",
  "stats": {
    "totalLeads": { "value": 45, "trend": "+12%" },
    "newLeadsToday": { "value": 8, "trend": "+5%" },
    "pendingTasks": { "value": 3, "trend": "-2" },
    "conversions": { "value": 12, "trend": "High" },
    "activeAgents": { "value": 5 }
  },
  "leadPipeline": [
    { "_id": "New Lead", "count": 10 },
    { "_id": "Interested", "count": 15 },
    { "_id": "Converted", "count": 12 }
  ],
  "priorityFocus": [
    {
      "name": "Srinivas",
      "followUpDate": "2025-01-20T10:00:00.000Z",
      "status": "Interested"
    }
  ],
  "recentActivity": []
}
```

---

### GET `/health`
**Access:** Public

**Response (200):**
```json
{
  "success": true,
  "message": "CRM API is running",
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

---

## 12. 📋 Quick Reference — All Endpoints

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/login` | Public | Login |
| `POST` | `/users/create-agent` | Admin | Create agent |
| `GET` | `/users` | Admin | List agents |
| `PUT` | `/users/:id` | Admin | Update agent |
| `DELETE` | `/users/:id` | Admin | Deactivate agent |
| `POST` | `/leads` | Admin/Agent | Create lead |
| `GET` | `/leads` | Admin/Agent | List leads (paginated) |
| `GET` | `/leads/:id` | Admin/Agent | Get lead |
| `PUT` | `/leads/:id` | Admin/Agent | Update lead / add note |
| `DELETE` | `/leads/:id` | Admin | Delete lead |
| `POST` | `/students` | Admin/Agent | Create student profile |
| `GET` | `/students/:id` | Admin/Agent | Get student |
| `PUT` | `/students/:id` | Admin/Agent | Update student |
| `POST` | `/documents/upload` | Admin/Agent | Upload document |
| `GET` | `/documents/student/:id` | Admin/Agent | Get student docs |
| `DELETE` | `/documents/:id` | Admin/Agent | Delete document |
| `POST` | `/messages/send` | Admin/Agent | Send WhatsApp |
| `GET` | `/messages/:leadId` | Admin/Agent | Message history |
| `GET` | `/notifications` | Admin/Agent | Get notifications |
| `PUT` | `/notifications/read` | Admin/Agent | Mark as read |
| `GET` | `/reports/dashboard` | Admin | Admin Analytics |
| `GET` | `/reports/agent-dashboard` | Agent/Admin | Agent Dashboard |
| `GET` | `/health` | Public | Health check |

---

## 13. 🗓️ FOLLOW-UPS MODULE

### POST `/api/follow-ups`
**Access:** Admin, Agent

**Request Body:**
```json
{
  "leadId": "65f2...",
  "scheduledDate": "2025-02-15T10:00:00.000Z",
  "note": "Client requested call back after 3 PM"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Follow-up scheduled successfully",
  "followUp": {
    "_id": "65f8...",
    "leadId": "65f2...",
    "scheduledDate": "2025-02-15T10:00:00.000Z",
    "status": "Scheduled",
    "note": "Client requested call back after 3 PM"
  }
}
```

---

### GET `/api/follow-ups/lead/:leadId`
**Success Response (200):**
```json
{
  "success": true,
  "followUps": [
    {
      "_id": "65f8...",
      "scheduledDate": "2025-02-15T10:00:00.000Z",
      "status": "Scheduled",
      "note": "...",
      "createdBy": { "name": "John Agent" }
    }
  ]
}
```

---

### PUT `/api/follow-ups/:id`
**Access:** Admin, Agent

**Request Body:**
```json
{
  "status": "Completed",
  "note": "Call successful, client is interested"
}
```

**Statuses:** `Scheduled` | `Completed` | `Cancelled`
