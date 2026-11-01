# Heat Treatment Inspection Report Entry Web Application

A production-ready web application designed to digitize the assignment, entry, metallurgical validation, tracking, and auditing of Heat Treatment Inspection Reports.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite 6, TypeScript 5
- **UI Framework**: Chakra UI v2 with custom industrial QC theme (`#2E7D32` OK, `#D32F2F` Not OK, `#ED6C02` Pending/In Progress, `#757575` Draft/Cancelled)
- **Icons**: Lucide React
- **Data Visualization**: Recharts
- **Backend**: NestJS 11, TypeScript 5, Express
- **Database & ORM**: PostgreSQL 18, TypeORM
- **Authentication & Security**: Passport JWT, salted bcrypt password hashing, server-side RBAC guards
- **Reporting & Export**: PDFKit server-side PDF generator and browser print styling
- **Testing**: Standalone native Node.js E2E test runner (`e2e/test-runner.mjs`) covering 91 requirement & boundary tests, plus 22 Tier-5 adversarial stress tests

---

## 🏗️ Architecture & Modules

### Backend Domains (`backend/src/`)
- `auth`: JWT token authentication, login, secure logout, and session payload resolution.
- `users`: User profiles, role-based controls, permission flags (`canManageUsers`), and digital signatures (canvas drawing and file uploads).
- `parts`: Part Master CRUD, search/autocomplete, and CSV/XLSX bulk import with preview and row-level validation.
- `requests`: Inspection Request lifecycle (`Draft` → `Assigned` → `In Progress` → `Completed` / `Cancelled`), atomic sequence number generation with retry loops, and assignment/reassignment history tracking.
- `reports`: Metallurgical calculations service, report submissions, post-submission controlled revisions, and immutable signature snapshotting.
- `dashboard`: Role-tailored KPI aggregates, status bar charts, result donut charts, and recent activity queues.
- `audit`: Append-only, immutable audit logging capturing user, action, entity, previous values, and new values.

### Frontend Views (`frontend/src/`)
- **Login Screen**: Secure credential login with automatic role-based redirect.
- **Production Engineer Dashboard**: 7 KPI cards, status bar chart, QC distribution donut chart, Last 5 Completed Requests table, and quick request creation modal.
- **Quality Inspector Dashboard**: 5 KPI cards, assigned workload charts, task queue table, and quick action to open the next pending task.
- **Request Management**: Multi-filter toolbar (date range, Part Name, Part Number, Inspector, Request Status, Report Result), sorting, pagination, cancellation dialog, and inspector reassignment modal with assignment history.
- **Report Entry Screen**: Read-only request metadata, inputs for Heat Treatment Batch #, Furnace, Auto Report, Sample Received Batch Date, live calculation of Hardness (BHN) and Mechanical properties (YS, UTS, E%) with instant visual status badges, conditional mandatory remarks on Not OK, and digital signature capture.
- **Part Master**: Interactive part catalog with bulk CSV/XLSX upload, commit preview modal, row error highlighting, and template download.
- **User Management & Signatures**: User administration with permission toggles and signature pad.
- **Audit Log Viewer**: Filterable audit trail viewer displaying previous vs. new values.

---

## ⚙️ Metallurgical Calculation Engine Rules

- **Hardness Validation**:
  - Rule: $\text{Spec / Hardness (BHN)} \ge 80.0$
  - Result: $\ge 80.0 \implies \mathbf{OK}$, $< 80.0 \implies \mathbf{Not\ OK}$
- **Mechanical Properties Validation**:
  - $\text{Yield Strength (YS)} \ge 220.0\,\text{MPa}$
  - $\text{Ultimate Tensile Strength (UTS)} \ge 280.0\,\text{MPa}$
  - $\text{Elongation (E)} \ge 1.00\%$
  - Result: Passes only if **all three** meet or exceed their thresholds; fails if any is below.
- **Overall Status**:
  - $\mathbf{OK}$ if and only if **both** Hardness Status and Mechanical Status are $\mathbf{OK}$.
  - $\mathbf{Not\ OK}$ if either status is $\mathbf{Not\ OK}$.
- **Inspector Remarks**:
  - Mandatory whenever Overall Status is $\mathbf{Not\ OK}$.
- **Immutability & Tamper Protection**:
  - Status calculations are strictly enforced on the server. Any client-submitted status overrides are ignored and recalculated dynamically.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20+ (v24 recommended)
- **npm**: v10+
- **PostgreSQL**: v14+ (v18 verified) running on `localhost:5432`

### 1. Database & Backend Setup
```bash
cd backend

# Install dependencies (if not already installed)
npm install

# Configure environment variables (.env is preconfigured for local postgres)
# Ensure the database 'heat_treatment_inspection' exists in PostgreSQL:
# CREATE DATABASE heat_treatment_inspection;

# Seed initial roles, users, parts, and sample requests
npm run seed

# Start the NestJS backend
npm run start:dev
```
The backend REST API will run on `http://localhost:3000`.

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```
The frontend application will run on `http://localhost:5173`.

---

## 👥 Default Seeded Credentials

| Username | Password | Role | Permissions |
|:---|:---|:---|:---|
| `pe_john` | `Password123!` | Production Engineer | Full access + User Management |
| `pe_mary` | `Password123!` | Production Engineer | Full access (no User Management) |
| `qi_david` | `Password123!` | Quality Inspector | Inspector task execution & report entry |
| `qi_sarah` | `Password123!` | Quality Inspector | Inspector task execution & report entry |

---

## 🧪 Testing

The repository contains a standalone, zero-dependency end-to-end automated test suite:

```bash
cd e2e

# Run all 91 E2E tests (Tiers 1-4)
npm test

# Run individual tiers
npm run test:tier1    # Tier 1: 40 Feature coverage tests
npm run test:tier2    # Tier 2: 28 Boundary value analysis tests
npm run test:tier3    # Tier 3: 18 Security & RBAC invariant tests
npm run test:tier4    # Tier 4: 5 End-to-end industrial workflows
```

All 91 E2E tests and 22 Tier-5 adversarial stress tests have achieved a **100% pass rate** and passed the independent **Victory Audit**.



# InspectionSummary
