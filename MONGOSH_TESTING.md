# 🧪 CRM — MongoDB Shell (mongosh) Testing Guide

> Run these commands in **mongosh** after connecting to your database.
> All IDs written as `ObjectId(...)` below — mongosh v2+ supports `new ObjectId()`.

---

## 🔌 Step 1 — Connect to Database

```js
// Local MongoDB
mongosh "mongodb://localhost:27017"

// Atlas (replace with your URI)
mongosh "mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/crm_db"

// Switch to CRM database
use crm_db
```

---

## 📋 Step 2 — Check Collections Exist

```js
show collections
```

Expected output after first API call or seed:
```
users
leads
students
documents
messages
notifications
```

---

## 👤 Step 3 — Seed Admin User (Manual)

> **Alternative to `npm run seed`** — run directly in mongosh.

```js
use crm_db

db.users.insertOne({
  name: "Super Admin",
  email: "admin@crm.com",
  phone: "9000000000",
  // bcrypt hash of "Admin@1234" (10 rounds)
  password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.",
  role: "admin",
  status: "active",
  organizationId: null,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Verify admin inserted:**
```js
db.users.findOne({ email: "admin@crm.com" }, { password: 0 })
```

---

## 👨‍💼 Step 4 — Insert Test Agents

```js
// Agent 1
db.users.insertOne({
  name: "John Agent",
  email: "john@crm.com",
  phone: "9876543210",
  // bcrypt hash of "Agent@1234"
  password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.",
  role: "agent",
  status: "active",
  organizationId: null,
  createdAt: new Date(),
  updatedAt: new Date()
})

// Agent 2
db.users.insertOne({
  name: "Priya Agent",
  email: "priya@crm.com",
  phone: "9123456789",
  password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.",
  role: "agent",
  status: "active",
  organizationId: null,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**View all users (no password):**
```js
db.users.find({}, { password: 0 }).pretty()
```

**Save agent IDs for use below:**
```js
// Run this to get IDs
db.users.find({ role: "agent" }, { _id: 1, name: 1 })
```

---

## 📋 Step 5 — Insert Test Leads

> Replace `AGENT_ID_1` and `AGENT_ID_2` with actual ObjectIds from Step 4.

```js
// Store agent IDs in variables first
const agent1 = db.users.findOne({ email: "john@crm.com" })._id
const agent2 = db.users.findOne({ email: "priya@crm.com" })._id
const admin  = db.users.findOne({ email: "admin@crm.com" })._id

// Lead 1 — Interested
db.leads.insertOne({
  name: "Rahul Sharma",
  phone: "9811223344",
  email: "rahul@gmail.com",
  leadSource: "Website",
  assignedAgent: agent1,
  status: "Interested",
  followUpDate: new Date("2026-03-20"),
  notes: [
    {
      _id: new ObjectId(),
      content: "Very interested in Canada MBA program",
      addedBy: agent1,
      createdAt: new Date()
    }
  ],
  createdBy: admin,
  organizationId: null,
  createdAt: new Date(),
  updatedAt: new Date()
})

// Lead 2 — New Lead
db.leads.insertOne({
  name: "Sneha Patel",
  phone: "9922334455",
  email: "sneha@gmail.com",
  leadSource: "Referral",
  assignedAgent: agent2,
  status: "New Lead",
  followUpDate: new Date("2026-03-15"),
  notes: [],
  createdBy: admin,
  organizationId: null,
  createdAt: new Date(),
  updatedAt: new Date()
})

// Lead 3 — Documents Pending
db.leads.insertOne({
  name: "Arjun Mehta",
  phone: "9733445566",
  email: "arjun@gmail.com",
  leadSource: "Social Media",
  assignedAgent: agent1,
  status: "Documents Pending",
  followUpDate: new Date("2026-03-18"),
  notes: [],
  createdBy: agent1,
  organizationId: null,
  createdAt: new Date(),
  updatedAt: new Date()
})

// Lead 4 — Converted
db.leads.insertOne({
  name: "Divya Nair",
  phone: "9655667788",
  email: "divya@gmail.com",
  leadSource: "Walk-in",
  assignedAgent: agent2,
  status: "Converted",
  followUpDate: null,
  notes: [],
  createdBy: admin,
  organizationId: null,
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  updatedAt: new Date()
})

// Lead 5 — Rejected
db.leads.insertOne({
  name: "Karan Singh",
  phone: "9544556677",
  email: "karan@gmail.com",
  leadSource: "Advertisement",
  assignedAgent: agent1,
  status: "Rejected",
  followUpDate: null,
  notes: [],
  createdBy: admin,
  organizationId: null,
  createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
  updatedAt: new Date()
})
```

**View all leads:**
```js
db.leads.find({}, { name: 1, status: 1, assignedAgent: 1 }).pretty()
```

---

## 🎓 Step 6 — Insert Student Profiles

```js
// Get lead IDs
const lead1 = db.leads.findOne({ email: "rahul@gmail.com" })._id
const lead2 = db.leads.findOne({ email: "sneha@gmail.com" })._id
const lead3 = db.leads.findOne({ email: "arjun@gmail.com" })._id

// Student 1 — for Rahul
db.students.insertOne({
  leadId: lead1,
  presentCourse: "B.Tech Computer Science",
  presentYear: "Final Year",
  presentCGPA: 8.2,
  backlogHistory: 0,
  tenthPercentage: 88.5,
  twelfthPercentage: 85.0,
  undergraduateCGPA: 8.2,
  englishTest: { type: "IELTS", score: 7.0 },
  preferredCountry: "Canada",
  preferredCourse: "MBA",
  preferredIntake: "September 2026",
  visaStatus: "Not Applied",
  applicationStatus: "Not Started",
  organizationId: null,
  createdAt: new Date(),
  updatedAt: new Date()
})

// Student 2 — for Sneha
db.students.insertOne({
  leadId: lead2,
  presentCourse: "BBA",
  presentYear: "Third Year",
  presentCGPA: 7.5,
  backlogHistory: 1,
  tenthPercentage: 80.0,
  twelfthPercentage: 78.5,
  undergraduateCGPA: 7.5,
  englishTest: { type: "TOEFL", score: 95 },
  preferredCountry: "UK",
  preferredCourse: "MSc Management",
  preferredIntake: "January 2027",
  visaStatus: "Not Applied",
  applicationStatus: "In Progress",
  organizationId: null,
  createdAt: new Date(),
  updatedAt: new Date()
})

// Student 3 — for Arjun
db.students.insertOne({
  leadId: lead3,
  presentCourse: "B.Com",
  presentYear: "Passed Out",
  presentCGPA: 7.8,
  backlogHistory: 0,
  tenthPercentage: 91.0,
  twelfthPercentage: 88.0,
  undergraduateCGPA: 7.8,
  englishTest: { type: "PTE", score: 65 },
  preferredCountry: "Australia",
  preferredCourse: "Master of Accounting",
  preferredIntake: "February 2027",
  visaStatus: "Applied",
  applicationStatus: "Submitted",
  organizationId: null,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**View all students:**
```js
db.students.find({}, { leadId: 1, preferredCountry: 1, applicationStatus: 1 }).pretty()
```

---

## 💬 Step 7 — Insert Test Messages

```js
const lead1 = db.leads.findOne({ email: "rahul@gmail.com" })._id
const agent1 = db.users.findOne({ email: "john@crm.com" })._id

db.messages.insertMany([
  {
    leadId: lead1,
    senderId: agent1,
    message: "Hello Rahul! This is John from ABC Consultancy. Are you still interested in studying in Canada?",
    type: "text",
    status: "sent",
    whatsappMessageId: "wamid.test001",
    organizationId: null,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    leadId: lead1,
    senderId: agent1,
    message: "Please share your IELTS scorecard when possible.",
    type: "text",
    status: "delivered",
    whatsappMessageId: "wamid.test002",
    organizationId: null,
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
  }
])
```

**View messages for a lead:**
```js
const lead1 = db.leads.findOne({ email: "rahul@gmail.com" })._id
db.messages.find({ leadId: lead1 }).sort({ timestamp: -1 }).pretty()
```

---

## 🔔 Step 8 — Insert Test Notifications

```js
const agent1 = db.users.findOne({ email: "john@crm.com" })._id
const agent2 = db.users.findOne({ email: "priya@crm.com" })._id
const lead1  = db.leads.findOne({ email: "rahul@gmail.com" })._id

db.notifications.insertMany([
  {
    userId: agent1,
    message: "You have been assigned a new lead: Rahul Sharma",
    type: "New Lead Assigned",
    isRead: false,
    relatedEntity: { entityType: "Lead", entityId: lead1 },
    organizationId: null,
    createdAt: new Date(Date.now() - 30 * 60 * 1000)
  },
  {
    userId: agent1,
    message: "Follow-up reminder: Lead \"Arjun Mehta\" follow-up was due",
    type: "Follow-up Reminder",
    isRead: false,
    relatedEntity: { entityType: "Lead", entityId: lead1 },
    organizationId: null,
    createdAt: new Date(Date.now() - 60 * 60 * 1000)
  },
  {
    userId: agent2,
    message: "Lead \"Sneha Patel\" status updated to \"Interested\"",
    type: "Lead Status Updated",
    isRead: true,
    relatedEntity: { entityType: "Lead", entityId: lead1 },
    organizationId: null,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
  }
])
```

---

## 🔍 Step 9 — Verification Queries

### Count all collections
```js
print("Users:        ", db.users.countDocuments())
print("Leads:        ", db.leads.countDocuments())
print("Students:     ", db.students.countDocuments())
print("Messages:     ", db.messages.countDocuments())
print("Notifications:", db.notifications.countDocuments())
```

### Leads by status
```js
db.leads.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### Leads by source
```js
db.leads.aggregate([
  { $group: { _id: "$leadSource", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### Agent performance (same as dashboard API)
```js
db.leads.aggregate([
  { $match: { assignedAgent: { $ne: null } } },
  {
    $group: {
      _id: "$assignedAgent",
      totalLeads: { $sum: 1 },
      converted: { $sum: { $cond: [{ $eq: ["$status", "Converted"] }, 1, 0] } }
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "agent"
    }
  },
  { $unwind: "$agent" },
  {
    $project: {
      agentName: "$agent.name",
      totalLeads: 1,
      converted: 1,
      conversionRate: {
        $multiply: [{ $divide: ["$converted", "$totalLeads"] }, 100]
      }
    }
  }
])
```

### Leads with upcoming follow-ups (overdue)
```js
db.leads.find({
  followUpDate: { $lte: new Date() },
  status: { $nin: ["Converted", "Rejected"] }
}, { name: 1, followUpDate: 1, status: 1 })
```

### Student with lead details (lookup join)
```js
db.students.aggregate([
  {
    $lookup: {
      from: "leads",
      localField: "leadId",
      foreignField: "_id",
      as: "lead"
    }
  },
  { $unwind: "$lead" },
  {
    $project: {
      "lead.name": 1,
      "lead.email": 1,
      preferredCountry: 1,
      preferredCourse: 1,
      applicationStatus: 1,
      visaStatus: 1
    }
  }
])
```

### Unread notifications for an agent
```js
const agent1 = db.users.findOne({ email: "john@crm.com" })._id
db.notifications.find({ userId: agent1, isRead: false }).sort({ createdAt: -1 })
```

---

## ✏️ Step 10 — Update Queries

### Update lead status
```js
const leadId = db.leads.findOne({ email: "rahul@gmail.com" })._id

db.leads.updateOne(
  { _id: leadId },
  {
    $set: { status: "Application Submitted", updatedAt: new Date() },
    $push: {
      notes: {
        _id: new ObjectId(),
        content: "Application submitted to University of Toronto",
        addedBy: db.users.findOne({ email: "john@crm.com" })._id,
        createdAt: new Date()
      }
    }
  }
)
```

### Assign lead to different agent
```js
const leadId = db.leads.findOne({ email: "sneha@gmail.com" })._id
const agent1 = db.users.findOne({ email: "john@crm.com" })._id

db.leads.updateOne(
  { _id: leadId },
  { $set: { assignedAgent: agent1, updatedAt: new Date() } }
)
```

### Update student visa status
```js
const studentId = db.students.findOne({ preferredCountry: "Canada" })._id

db.students.updateOne(
  { _id: studentId },
  { $set: { visaStatus: "Applied", applicationStatus: "Submitted", updatedAt: new Date() } }
)
```

### Mark all notifications as read
```js
const agent1 = db.users.findOne({ email: "john@crm.com" })._id

db.notifications.updateMany(
  { userId: agent1, isRead: false },
  { $set: { isRead: true } }
)
```

### Deactivate an agent
```js
db.users.updateOne(
  { email: "john@crm.com" },
  { $set: { status: "inactive", updatedAt: new Date() } }
)
```

---

## 🗑️ Step 11 — Delete / Cleanup Queries

### Delete a specific lead
```js
db.leads.deleteOne({ email: "karan@gmail.com" })
```

### Delete all messages for a lead
```js
const leadId = db.leads.findOne({ email: "rahul@gmail.com" })._id
db.messages.deleteMany({ leadId: leadId })
```

### Delete all notifications (reset)
```js
db.notifications.deleteMany({})
```

### ⚠️ FULL RESET — drop all CRM collections (fresh start)
```js
db.users.drop()
db.leads.drop()
db.students.drop()
db.documents.drop()
db.messages.drop()
db.notifications.drop()
print("✅ All collections dropped. Re-run seed to start fresh.")
```

---

## 📊 Step 12 — Monthly Leads Aggregation (Dashboard Test)

```js
db.leads.aggregate([
  {
    $group: {
      _id: {
        year:  { $year:  "$createdAt" },
        month: { $month: "$createdAt" }
      },
      count: { $sum: 1 }
    }
  },
  {
    $project: {
      _id: 0,
      year:  "$_id.year",
      month: "$_id.month",
      count: 1
    }
  },
  { $sort: { year: 1, month: 1 } }
])
```

---

## 🔑 Step 13 — Get IDs for API Testing (Postman/Thunder Client)

Run this one-liner to print all key IDs you need for API route testing:

```js
print("=== IDs FOR API TESTING ===")
print("Admin  ID:", db.users.findOne({ role: "admin" })._id)
print("Agent1 ID:", db.users.findOne({ email: "john@crm.com" })._id)
print("Agent2 ID:", db.users.findOne({ email: "priya@crm.com" })._id)
print("Lead1  ID:", db.leads.findOne({ email: "rahul@gmail.com" })._id)
print("Lead2  ID:", db.leads.findOne({ email: "sneha@gmail.com" })._id)
print("Lead3  ID:", db.leads.findOne({ email: "arjun@gmail.com" })._id)
print("Student1 ID:", db.students.findOne({ preferredCountry: "Canada" })._id)
print("Student2 ID:", db.students.findOne({ preferredCountry: "UK" })._id)
```

---

## ✅ Complete Setup Checklist

```
[ ] mongosh connected to crm_db
[ ] Admin user inserted (Step 3)
[ ] 2 agents inserted (Step 4)
[ ] 5 leads inserted (Step 5)
[ ] 3 student profiles inserted (Step 6)
[ ] 2 messages inserted (Step 7)
[ ] 3 notifications inserted (Step 8)
[ ] Verification counts checked (Step 9)
[ ] IDs copied for API testing (Step 13)
[ ] Login via POST /api/auth/login with admin@crm.com / Admin@1234
```

---

## 🔐 bcrypt Hash Reference

Both passwords below hash to the **same bcrypt string** used in the inserts above.  
This is the standard bcrypt hash of the string `Admin@1234`:

```
$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.
```

> ⚠️ **Note:** This is a commonly used test hash. For production, always use `npm run seed` which generates a proper unique hash via bcryptjs.

If you want a fresh hash from mongosh (requires Node):
```bash
# In your terminal (not mongosh):
node -e "const b=require('bcryptjs'); b.hash('MyPassword@123',10).then(h=>console.log(h))"
```
Then paste the output as the `password` field in your insert.
