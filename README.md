<div align="center">

# ⚡ FlowVibe

### High-Velocity, Real-Time Collaborative Project Management Platform

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.2-092E20?style=for-the-badge&logo=django&logoColor=white)](https://djangoproject.com)
[![WebSockets](https://img.shields.io/badge/WebSockets-Channels%204.0-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://channels.readthedocs.io)
[![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla%20ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org)
[![License](https://img.shields.io/badge/License-MIT-6366F1?style=for-the-badge)](LICENSE)

<p align="center">
  <b>FlowVibe</b> is a lightweight, responsive project workspace engineered for agile development teams. Featuring real-time Kanban boards, instant WebSocket state broadcasts, threaded task discussions, and open backend access — built with <b>Django REST Framework</b>, <b>Django Channels</b>, and <b>pure Vanilla JavaScript (ES6+)</b> without bloated frontend frameworks.
</p>

[Key Features](#-key-features) • [System Architecture](#-system-architecture) • [Quick Start](#-quick-start) • [Demo Credentials](#-instant-demo-accounts) • [API & WebSocket Reference](#-api--websocket-reference) • [Configuration](#-environment-variables)

</div>

---

## 🚀 Key Features

<table>
  <tr>
    <td width="50%">
      <h3>⚡ Sub-50ms Live Synchronization</h3>
      <p>Powered by <b>Django Channels (ASGI)</b> and WebSockets. Task state changes, priority adjustments, drag-and-drop column moves, and new task assignments are instantly pushed to every connected team member without polling or page reloads.</p>
    </td>
    <td width="50%">
      <h3>🎯 Interactive Kanban Board</h3>
      <p>Fluid, native HTML5 drag-and-drop interface with dynamic column counts (<b>To Do</b>, <b>In Progress</b>, <b>Done</b>), live progress meters, custom task priority flags (<i>High / Medium / Low</i>), and overdue date indicators.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>💬 Contextual Task Discussions</h3>
      <p>Threaded comment feeds directly inside task modals. Includes live author badge pills, dynamic relative timestamps (<i>"just now"</i>, <i>"5m ago"</i>), and inline permission checks for edits and deletions.</p>
    </td>
    <td width="50%">
      <h3>👥 Role-Based Project Collaboration</h3>
      <p>Granular workspace permissions. Project creators have full administrative control, while invited collaborators can manage tasks, assign team members, and participate in discussion streams.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🎨 Custom Glassmorphism UI</h3>
      <p>Zero external UI libraries or heavy frontend dependencies. Handcrafted with semantic HTML5, pure CSS variables, dark-mode glassmorphism, responsive typography, and smooth 60fps micro-animations.</p>
    </td>
    <td width="50%">
      <h3>🔒 Hardened Session & Token Auth</h3>
      <p>Integrated authentication pipeline with password hashing, secure session management, automatic CSRF handling on Fetch requests, and support for Firebase Auth sign-in.</p>
    </td>
  </tr>
</table>

---

## 🏛️ System Architecture

FlowVibe pairs a high-performance **Django ASGI backend** with a **modular ES6+ frontend**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER CLIENT                                 │
│                                                                             │
│   ┌───────────────┐   ┌────────────────┐   ┌──────────────┐   ┌─────────┐   │
│   │ Dashboard App │   │  Kanban Matrix │   │  Task Modal  │   │ Auth/UI │   │
│   └───────┬───────┘   └───────┬────────┘   └──────┬───────┘   └────┬────┘   │
│           │                   │                   │                │        │
│           └───────────────────┼───────────────────┴────────────────┘        │
│                               │                                             │
│                ┌──────────────┴──────────────┐                              │
│                │   Vanilla API / WS Client   │                              │
│                └──────────────┬──────────────┘                              │
└───────────────────────────────┼─────────────────────────────────────────────┘
                                │
                 HTTP/REST API  │  WebSocket (ws://)
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DJANGO SERVER (Daphne / ASGI)                        │
│                                                                             │
│   ┌──────────────────────────────┐     ┌────────────────────────────────┐   │
│   │   Django REST Framework      │     │    Django Channels Router      │   │
│   │   (Auth, Projects, Tasks)    │     │    (Project Consumer / Rooms)  │   │
│   └──────────────┬───────────────┘     └───────────────┬────────────────┘   │
│                  │                                     │                    │
│                  ▼                                     ▼                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      Django Models & ORM Layer                      │   │
│   │          (User ──── Project ──── Task ──── Comment)                 │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│                        ┌───────────────────────────┐                        │
│                        │   Database (SQLite/Postgres)                      │
│                        └───────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

### Prerequisites
- **Python 3.10+** (Tested on Python 3.12)
- **Git**

### 1. Clone Repository
```bash
git clone https://github.com/flowvibe/FlowVibe.git
cd FlowVibe
```

### 2. Set Up Virtual Environment & Dependencies
```bash
# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate

# macOS / Linux:
source venv/bin/activate

# Install requirements
pip install -r teamflow/backend/requirements.txt
```

### 3. Initialize Database & Seed Data
```bash
# Apply migrations
python teamflow/backend/manage.py migrate

# Seed sample projects, members, and Kanban tasks
python teamflow/backend/manage.py seed_data
```

### 4. Start Development Server
```bash
# Run server via npm script (or directly via Python)
npm run dev

# Or directly:
python teamflow/backend/manage.py runserver 127.0.0.1:8000
```

Visit **[http://127.0.0.1:8000/](http://127.0.0.1:8000/)** in your browser.

---

## 🔑 Instant Demo Accounts

You can immediately test collaboration by logging in using any of the preloaded demo accounts (**Password for all accounts:** `password123`):

| User | Username | Role / Designation | Email |
| :--- | :--- | :--- | :--- |
| **Alex Chen** | `alex` | Product Lead & Owner | `alex.chen@flowvibe.io` |
| **Sarah Miller** | `sarah` | Senior Frontend Engineer | `sarah.miller@flowvibe.io` |
| **David Kim** | `david` | Backend Architect | `david.kim@flowvibe.io` |
| **Elena Rostova** | `elena` | UI/UX Designer | `elena.rostova@flowvibe.io` |
| **Demo User** | `demo` | Full-Stack Developer | `demo@flowvibe.io` |

> 💡 **Multi-User Realtime Test:** Open `http://127.0.0.1:8000/` in an incognito window as `alex` and in a normal window as `sarah`. Move tasks on the project board and watch the cards update in real time across both screens.

---

## 📂 Project Organization

```text
FlowVibe/
├── package.json                        # Root npm script runner
├── README.md                           # Documentation & guides
├── .gitignore                          # Security exclusions (.env, db, caches)
├── .env.example                        # Template for environment variables
└── teamflow/
    ├── backend/
    │   ├── manage.py                   # Django CLI management entrypoint
    │   ├── requirements.txt            # Python dependencies
    │   ├── config/                     # Core ASGI/WSGI settings & root router
    │   │   ├── asgi.py                 # ASGI configuration for WebSocket support
    │   │   ├── settings.py             # App configurations & middleware
    │   │   └── urls.py                 # REST & static asset routing
    │   ├── users/                      # Authentication & user profiles
    │   │   └── management/commands/    # Database seeder (`seed_data.py`)
    │   ├── projects/                   # Project CRUD, memberships & WS Consumers
    │   ├── tasks/                      # Kanban tasks & status transitions
    │   └── comments/                   # Task discussion threads
    └── frontend/
        ├── index.html                  # Landing page & feature showcase
        ├── login.html                  # Sign-in portal
        ├── register.html               # Account registration
        ├── dashboard.html              # Workspace overview & project management
        ├── project.html                # Live interactive Kanban board
        ├── profile.html                # User profile & account preferences
        ├── css/
        │   ├── style.css               # Core design tokens & layout system
        │   ├── responsive.css          # Tablet & mobile media queries
        │   └── datepicker.css          # Custom calendar picker styles
        └── js/
            ├── api.js                  # Centralized Fetch client with CSRF injection
            ├── auth.js                 # Session lifecycle & route guards
            ├── dashboard.js            # Project grid & statistics controller
            ├── project.js              # Project detail & member controller
            ├── tasks.js                # Kanban board & drag-and-drop engine
            ├── comments.js             # Real-time discussion thread controller
            ├── datepicker.js           # Lightweight standalone datepicker
            └── websocket.js            # Auto-reconnecting WebSocket client
```

---

## 🔌 API & WebSocket Reference

### Core REST Endpoints

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register/` | Register a new user account | Public |
| `POST` | `/api/auth/login/` | Authenticate user & start session | Public |
| `POST` | `/api/auth/logout/` | Terminate session & clear cookies | Session |
| `GET` | `/api/auth/me/` | Fetch authenticated user profile & stats | Session |
| `GET` / `POST` | `/api/projects/` | List user projects or create new project | Session |
| `GET` / `PUT` / `DELETE` | `/api/projects/<id>/` | Retrieve, update or delete a project | Member / Owner |
| `POST` | `/api/projects/<id>/members/` | Add a member to project by email/username | Owner |
| `DELETE` | `/api/projects/<id>/members/<user_id>/` | Remove a collaborator from project | Owner |
| `GET` / `POST` | `/api/projects/<id>/tasks/` | List all tasks or create a new task | Member |
| `PUT` / `DELETE` | `/api/tasks/<id>/` | Update task details / status or delete task | Member |
| `GET` / `POST` | `/api/tasks/<id>/comments/` | Fetch task discussion feed or post comment | Member |

### Real-Time WebSocket Events

Connect to `ws://<host>/ws/projects/<project_id>/` to listen for and dispatch room events:

```json
// Example: Task moved across Kanban columns
{
  "type": "task.moved",
  "data": {
    "task_id": 42,
    "new_status": "in_progress",
    "updated_by": "sarah"
  }
}
```

- `task.created` — Broadcast when a new task is posted.
- `task.updated` — Broadcast on title, description, priority, or due date changes.
- `task.deleted` — Broadcast when a card is removed.
- `comment.added` — Broadcast instantly into the open discussion modal.

---

## ⚙️ Environment Variables

For production or cloud deployments, copy `.env.example` to `.env`:

```env
# Django Settings
SECRET_KEY=your-secure-production-key
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,127.0.0.1

# Real-Time Redis Layer (Optional for multi-instance scaling)
USE_REDIS=False
REDIS_URL=redis://127.0.0.1:6379/0

# Firebase Web App (Optional client authentication)
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
```

---

## 🧪 Testing

Run backend test suites:
```bash
python teamflow/backend/manage.py test
```

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use, customize, and extend for your own projects.
