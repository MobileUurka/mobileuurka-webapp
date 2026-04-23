# MobileUurka Web App — Frontend Documentation

**Version:** 2.0  
**Stack:** React 18 + TypeScript + Vite + Redux Toolkit + Tailwind CSS  
**Last Updated:** April 2026

## Table of Contents

1. [Project Structure](#project-structure)
2. [Environment Setup](#environment-setup)
3. [Architecture Overview](#architecture-overview)
4. [Authentication Flow](#authentication-flow)
5. [State Management (Redux)](#state-management-redux)
6. [Services Layer](#services-layer)
7. [Pages](#pages)
8. [Patient Sub-Views](#patient-sub-views)
9. [Components](#components)
10. [Charts](#charts)
11. [Real-time (Socket.IO)](#real-time-socketio)
12. [Routing](#routing)
13. [Types](#types)
14. [Utilities](#utilities)
15. [Constants](#constants)

---

## Project Structure

```
mobileuurka-webapp/src/
├── App.tsx                    # Root component, auth guard, routing
├── main.tsx                   # Entry point
├── pages/                     # Top-level route pages
│   ├── Auth.tsx               # Login / signup
│   ├── Dashboard.tsx          # Main dashboard
│   ├── Patients.tsx           # Patient list
│   ├── Patient.tsx            # Single patient view (tabs)
│   ├── Screening.tsx          # Screening forms
│   ├── Staff.tsx              # Staff management
│   ├── Hospital.tsx           # Hospital view
│   ├── Hospitals.tsx          # Hospital list
│   ├── Notifications.tsx      # Notifications
│   ├── Alerts.tsx             # Alerts
│   ├── Settings.tsx           # User settings
│   ├── Onboarding.tsx         # Organization onboarding
│   ├── Verify.tsx             # Email verification
│   ├── ForgotPassword.tsx     # Password reset request
│   ├── ResetPassword.tsx      # Password reset form
│   └── Sidebar.tsx            # Sidebar navigation
├── patient/                   # Patient detail sub-views
│   ├── Overview.tsx           # Charts & summary
│   ├── Profile.tsx            # Patient profile info
│   ├── Documents.tsx          # All patient records list
│   ├── Document.tsx           # Single document viewer
│   ├── Notes.tsx              # Notes list
│   ├── Note.tsx               # Single note viewer
│   ├── Medication.tsx         # Medication details
│   └── SymptomReport.tsx      # AI symptom analysis report
├── components/                # Shared UI components
│   ├── Layout.tsx             # App shell with sidebar
│   ├── SocketProvider.tsx     # Real-time event handler
│   ├── DataTable.tsx          # Reusable table
│   ├── ScreeningForm.tsx      # Dynamic form renderer
│   ├── Riskassessment.tsx     # Risk assessment widget
│   ├── LoginForm.tsx          # Login form
│   ├── SignUpForm.tsx         # Signup form
│   ├── OTPForm.tsx            # OTP verification form
│   ├── AddStaffModal.tsx      # Add staff modal
│   ├── HospitalSelector.tsx   # Hospital picker
│   ├── PatientSelector.tsx    # Patient picker
│   ├── MainSearch.tsx         # Global search
│   ├── SearchContainer.tsx    # Search wrapper
│   ├── Notepad.tsx            # Note editor
│   ├── Chat.tsx               # AI chatbot
│   ├── Toast.tsx              # Toast notifications
│   ├── LoadingSpinner.tsx     # Loading indicator
│   ├── Overlay.tsx            # Modal overlay
│   ├── Pagination.tsx         # Pagination controls
│   ├── DropdownMenu.tsx       # Dropdown menu
│   └── PasswordChangeForm.tsx # Password change form
├── charts/                    # Data visualization
│   ├── BloodPressure.tsx      # BP trend chart
│   ├── BloodPressureChart.tsx # BP chart component
│   ├── Fetal.tsx              # Fetal measurements
│   ├── FetalGraph.tsx         # Fetal growth graph
│   ├── Lab.tsx                # Lab results chart
│   ├── LabChart.tsx           # Lab chart component
│   ├── Medications.tsx        # Medication timeline
│   ├── Piechart.tsx           # Pie chart
│   ├── Predisposition.tsx     # Risk predisposition
│   ├── Symptom.tsx            # Symptom analysis
│   ├── WeightChart.tsx        # Weight chart
│   └── Weights.tsx            # Weight trend
├── services/                  # API communication
│   ├── apiClient.ts           # Base HTTP client
│   ├── authServices.ts        # Auth operations
│   ├── patientServices.ts     # Patient API calls
│   ├── hospitalServices.ts    # Hospital API calls
│   ├── notificationService.ts # Notification API calls
│   ├── paymentServices.ts     # Payment API calls
│   ├── userServices.ts        # User API calls
│   └── socketService.ts       # Socket.IO client
├── store/                     # Redux state
│   ├── index.ts               # Store configuration
│   ├── hooks.ts               # Typed hooks
│   ├── patientsSlice.ts       # Patients state
│   ├── hospitalsSlice.ts      # Hospitals state
│   ├── staffSlice.ts          # Staff state
│   ├── patientProfileSlice.ts # Patient profile state
│   └── notificationsSlice.ts  # Notifications state
├── types/
│   └── patient.ts             # Patient TypeScript types
├── constants/
│   ├── patientColumns.tsx     # Patient table columns
│   ├── hospitalColumns.tsx    # Hospital table columns
│   ├── screening.ts           # Screening form config
│   └── screeningForms.ts      # Screening form definitions
├── contexts/
│   └── ToastContext.tsx       # Toast notification context
├── hooks/
│   └── usePagination.ts       # Pagination hook
└── utils/
    └── encryption.ts          # Client-side encryption
```

---

## Environment Setup

### Required Environment Variables (`.env`)
```env
VITE_API_URL=http://localhost:5500/api/v1
VITE_INTERNAL_API_KEY=your_internal_api_key
```

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

---

## Architecture Overview

### Data Flow
```
User Action
    ↓
React Component
    ↓
Redux Action / Service Call
    ↓
apiClient.ts (handles auth, token refresh, errors)
    ↓
Backend API
    ↓
Redux Store Update
    ↓
Component Re-render
```

### Real-time Flow
```
Backend Event
    ↓
Socket.IO Server
    ↓
socketService.ts (client)
    ↓
SocketProvider.tsx (event handlers)
    ↓
Redux Store Dispatch
    ↓
Component Re-render
```

---

## Authentication Flow

### Initial Load
1. `App.tsx` calls `authService.initializeEncryption()`
2. Fetches encryption key from `/auth/encryption-key`
3. Sets key in memory for decrypting stored tokens
4. Checks if valid access token exists
5. Routes to `/auth` or authenticated layout

### Login
1. User submits credentials
2. `authService.signIn()` called
3. Encryption key set from response
4. Tokens stored encrypted in `sessionStorage` (access) and `localStorage` (refresh)
5. User, organization data stored encrypted in `localStorage`
6. App re-renders with authenticated state

### Token Refresh
- Proactive: Checks expiry before every request (5-minute window)
- Reactive: Handles 401 responses with automatic retry
- Concurrent: Multiple parallel 401s share a single refresh promise

### Logout
1. Calls `POST /auth/logout` with refresh token and session ID
2. Clears all localStorage/sessionStorage
3. Wipes encryption key from memory
4. Dispatches `resetStore()` to clear Redux
5. Disconnects Socket.IO
6. Redirects to `/auth`

### Encryption
All sensitive data (tokens, user info, organization) is encrypted client-side using a server-provided key via `utils/encryption.ts`.

---

## State Management (Redux)

### Store Structure
```typescript
{
  patients: PatientsState,
  hospitals: HospitalsState,
  staff: StaffState,
  patientProfile: PatientProfileState,
  notifications: NotificationsState
}
```

### Patients Slice (`patientsSlice.ts`)
Manages the patient list for the Patients page.

**State:**
```typescript
{
  data: Patient[],
  status: 'idle' | 'loading' | 'succeeded' | 'failed',
  error: string | null,
  lastFetched: number | null
}
```

**Actions:**
- `fetchPatients` — async thunk, fetches risk overview, skips if data is fresh (< 60s)
- `invalidatePatients` — marks data stale, triggers background re-fetch
- `patientRemoved(id)` — removes patient from list (on delete)
- `patientAdded(patient)` — adds patient to list
- `patientUpdated(patient)` — updates patient in list

**Stale threshold:** 60 seconds

### Patient Profile Slice (`patientProfileSlice.ts`)
Manages individual patient complete profiles.

**Actions:**
- `fetchPatientProfile(patientId)` — fetches complete profile
- `invalidateProfile(patientId)` — marks profile stale
- `profileUpdated({ patientId, data })` — partial update
- `profileEvicted(patientId)` — removes profile from cache

### Notifications Slice (`notificationsSlice.ts`)
Manages in-app notifications.

**Actions:**
- `fetchNotifications` — loads notifications from API
- `addNotification(notification)` — adds real-time notification
- `markRead(id)` — marks single notification read
- `markAllRead` — marks all read

### Reset on Logout
All slices handle `RESET_ALL` action dispatched on logout:
```typescript
.addCase('RESET_ALL', () => initialState)
```

---

## Services Layer

### `apiClient.ts`
Base HTTP client with automatic auth handling.

**Features:**
- Automatic token validation before every request
- Proactive token refresh (5-minute window)
- Reactive 401 handling with retry
- Concurrent refresh deduplication
- Auto-logout on refresh failure

**Usage:**
```typescript
import { api } from './apiClient';

api.get('/patients')
api.post('/patients', data)
api.put('/patients/uuid', data)
api.delete('/patients/uuid')
```

### `authServices.ts`
All authentication operations and token management.

**Key Methods:**
- `signIn(credentials)` — login
- `logout()` — logout and cleanup
- `refreshToken()` — refresh access token
- `validateAndRefreshToken()` — proactive refresh check
- `initializeEncryption()` — restore session on page load
- `getAccessToken()` — get decrypted access token
- `getUser()` — get decrypted user object
- `getOrganization()` — get decrypted organization

### `patientServices.ts`
Patient CRUD and record operations.

**Key Methods:**
- `createPatient(data)` — create patient
- `getPatients(params)` — list patients with pagination
- `getPatientCompleteProfile(id)` — full profile with all records
- `getPatientsRiskOverview(params)` — patients with risk data
- `updatePatient(id, data)` — update patient
- `deletePatient(id)` — delete patient
- `createRecord(tableName, data)` — create any patient record
- `getRecords(tableName, params)` — get records by type
- `updateRecord(tableName, id, data)` — update record
- `deleteRecord(tableName, id)` — delete record

### `hospitalServices.ts`
Hospital management operations.

**Key Methods:**
- `getHospitals(orgId, params)` — get org hospitals
- `getAvailableHospitals()` — hospitals for dropdown
- `getAllHospitals(search)` — all hospitals with search
- `createHospital(data)` — create new hospital
- `linkHospitalToOrganization(hospitalId)` — link hospital
- `searchHospitals(term, page, limit)` — search with pagination

### `notificationService.ts`
Notification operations.

**Key Methods:**
- `getMyNotifications()` — fetch user notifications
- `markAsRead(id)` — mark single read
- `markAllAsRead()` — mark all read
- `send(payload)` — send notification (admin only)

### `paymentServices.ts`
M-Pesa payment operations.

**Key Methods:**
- `getMpesaAuth()` — get M-Pesa token
- `processPayment(request)` — initiate STK push
- `checkPaymentStatus(merchantRequestId)` — check status
- `verifyPaymentForSignup(merchantRequestId, email)` — verify for signup
- `pollPaymentStatus(merchantRequestId)` — poll until complete

### `socketService.ts`
Socket.IO client management.

**Key Methods:**
- `connect()` — connect with auth token
- `disconnect()` — disconnect and cleanup
- `on(event, handler)` — subscribe to event
- `off(event, handler)` — unsubscribe from event

**Socket Events:**
```typescript
SOCKET_EVENTS = {
  PATIENT_CREATED: 'patient:created',
  PATIENT_UPDATED: 'patient:updated',
  PATIENT_DELETED: 'patient:deleted',
  PATIENT_RECORD_CREATED: 'patient:record:created',
  PATIENT_RECORD_UPDATED: 'patient:record:updated',
  PATIENT_RECORD_DELETED: 'patient:record:deleted',
  HOSPITAL_LINKED: 'hospital:linked',
  HOSPITAL_UNLINKED: 'hospital:unlinked',
  HOSPITAL_CREATED: 'hospital:created',
  STAFF_ADDED: 'staff:added',
  STAFF_UPDATED: 'staff:updated',
  STAFF_DELETED: 'staff:deleted',
  NOTIFICATION_NEW: 'notification:new',
}
```

---

## Pages

### `Auth.tsx`
Login and signup entry point. Renders `LoginForm`, `SignUpForm`, or `OTPForm` based on state.

### `Dashboard.tsx`
Main dashboard with summary statistics and overview charts.

### `Patients.tsx`
Patient list page.
- Fetches from Redux `patientsSlice`
- Displays risk levels, diagnosis, last visit
- Search and pagination
- Real-time updates via socket invalidation

### `Patient.tsx`
Single patient view with tab navigation.

**Tabs:**
- `overview` → `Overview.tsx`
- `profile` → `Profile.tsx`
- `documents` → `Documents.tsx`
- `notes` → `Notes.tsx`
- `medication` → `Medication.tsx`
- `document` → `Document.tsx` (when a document is selected)
- `note` → `Note.tsx` (when a note is selected)
- `notepad` → `Notepad.tsx` (new note)
- `symptomReport` → `SymptomReport.tsx` (when AI report selected)

Fetches complete profile via `patientProfileSlice`.

### `Screening.tsx`
Dynamic screening form page.
- Renders forms based on `screeningForms.ts` config
- Handles triage, lab work, pregnancy info, infections, etc.
- Submits to `POST /patients/data/{tableName}`

### `Staff.tsx`
Staff management page.
- Lists organization users
- Add/edit/delete staff
- Role management

### `Hospital.tsx`
Single hospital view with patient statistics.

### `Hospitals.tsx`
Hospital list for the organization.

### `Notifications.tsx`
Notification center.
- Lists all notifications
- Mark read/unread
- Real-time new notifications via socket

### `Alerts.tsx`
Patient alerts view.

### `Settings.tsx`
User settings and password change.

### `Onboarding.tsx`
Multi-step organization onboarding flow:
1. License verification
2. Payment (M-Pesa)
3. Hospital setup
4. Admin account creation

### `Verify.tsx`
Email verification page for new organization users.

### `ForgotPassword.tsx` / `ResetPassword.tsx`
Password reset flow.

---

## Patient Sub-Views

### `Overview.tsx`
Dashboard-style overview with charts:
- Weight trend (triage data)
- Fetal measurements
- Risk predisposition
- Risk assessment widget
- Lab results
- Medications
- Blood pressure
- Symptom analysis

### `Profile.tsx`
Patient demographic and medical information.

### `Documents.tsx`
All patient records in a unified list.

**Record Types Shown:**
- Symptom Analysis (AI report) — shown with brain icon
- Triage records
- Lab Work records
- Pregnancy Journey records
- Infection records

**Features:**
- Sorted newest first
- Search by document type
- Risk badge for AI reports
- Editor name resolution (UUID → full name)
- Click to view full document

### `Document.tsx`
Renders a single patient record in detail view.

### `SymptomReport.tsx`
AI-generated symptom analysis report viewer.

**Displays:**
- Risk level and score bar
- Current state (overall, maternal, fetal)
- Key risk factors
- Primary concerns
- Immediate actions
- Recommendations
- Monitoring requirements
- Vital signs assessment
- Lab interpretation
- Clinical reasoning
- Historical risk factors
- Gestational considerations

**Features:**
- Download as `.txt` file
- Back navigation
- Color-coded risk levels (Critical/High/Moderate/Low)

### `Notes.tsx` / `Note.tsx`
Clinical notes list and detail view.

### `Medication.tsx`
Medication records detail view.

---

## Components

### `Layout.tsx`
App shell. Renders sidebar + `<Outlet>` for page content. Mounts `SocketProvider`.

### `SocketProvider.tsx`
Invisible component that manages all real-time event subscriptions.

**Event → Redux Action Mapping:**
| Event | Action |
|-------|--------|
| `patient:created` | `invalidatePatients()` |
| `patient:updated` | `invalidatePatients()` + `profileUpdated()` |
| `patient:deleted` | `patientRemoved()` + `profileEvicted()` |
| `patient:record:*` | `invalidatePatients()` + `invalidateProfile()` |
| `hospital:linked` | `hospitalLinked()` |
| `hospital:unlinked` | `hospitalUnlinked()` |
| `staff:added` | `staffMemberAdded()` |
| `staff:updated` | `staffMemberUpdated()` |
| `staff:deleted` | `staffMemberRemoved()` |
| `notification:new` | `addNotification()` |

### `DataTable.tsx`
Reusable table component with configurable columns, pagination, and row click handler.

**Props:**
```typescript
{
  columns: Column[],
  data: any[],
  onRowClick?: (row: any) => void,
  emptyMessage?: string,
  initialItemsPerPage?: number
}
```

### `ScreeningForm.tsx`
Dynamic form renderer for all patient record types.
- Reads form config from `screeningForms.ts`
- Handles validation
- Submits to appropriate API endpoint

### `Riskassessment.tsx`
Risk assessment visualization widget showing risk history and current level.

### `Chat.tsx`
AI chatbot component for patient-specific queries.

### `Toast.tsx` / `ToastContext.tsx`
Toast notification system.

**Usage:**
```typescript
const { showToast } = useToast();
showToast('Patient saved successfully', 'success');
showToast('Error saving patient', 'error');
```

### `AddStaffModal.tsx`
Modal for adding new staff members to the organization.

### `HospitalSelector.tsx`
Searchable hospital picker component.

### `PatientSelector.tsx`
Searchable patient picker component.

### `MainSearch.tsx`
Global search bar for patients and records.

### `OTPForm.tsx`
OTP input form for email verification.

### `LoginForm.tsx` / `SignUpForm.tsx`
Authentication forms.

### `PasswordChangeForm.tsx`
Password change form for settings page.

---

## Charts

All charts receive patient data as props and render using a charting library.

### `Weights.tsx` / `WeightChart.tsx`
Weight trend over pregnancy visits.

### `BloodPressure.tsx` / `BloodPressureChart.tsx`
Systolic/diastolic blood pressure trend.

### `Fetal.tsx` / `FetalGraph.tsx`
Fetal measurements (head circumference, femur length, etc.).

### `Lab.tsx` / `LabChart.tsx`
Lab results visualization (haemoglobin, platelets, etc.).

### `Medications.tsx`
Medication timeline and current medications.

### `Predisposition.tsx`
Risk predisposition chart based on patient history.

### `Symptom.tsx`
Symptom analysis visualization.

### `Piechart.tsx`
Generic pie chart component.

---

## Real-time (Socket.IO)

### Connection Lifecycle
1. `SocketProvider` mounts inside authenticated `Layout`
2. Calls `socketService.connect()` with current access token
3. Socket joins `org:{slug}` room on server
4. All events scoped to organization

### Token Refresh on Reconnect
Before each reconnect attempt, the socket refreshes the JWT:
```typescript
socket.io.on('reconnect_attempt', async () => {
  await authService.validateAndRefreshToken();
  const freshToken = authService.getAccessToken();
  if (freshToken) socket.auth = { token: freshToken };
});
```

### Transport Strategy
Uses `['polling', 'websocket']` — starts with polling (always works), upgrades to WebSocket when available.

---

## Routing

### Public Routes (unauthenticated)
- `/auth` — Login/Signup
- `/forgot-password` — Password reset request
- `/reset-password` — Password reset form
- `/verify` — Email verification
- `/onboarding` — Organization onboarding
- `*` — Redirects to `/auth`

### Protected Routes (authenticated)
- `/` → Patients list
- `/Dashboard` — Dashboard
- `/Patients` — Patient list
- `/Patient/:id` — Single patient
- `/Screening` — Screening forms
- `/Screening/:tabId` — Screening with specific tab
- `/Staff` — Staff management
- `/Hospital` — Hospital view
- `/Alerts` — Alerts
- `/Notifications` — Notifications
- `/Settings` — Settings
- `/auth` → Redirects to `/`

---

## Types

### `PatientData` (`types/patient.ts`)
```typescript
interface PatientData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  dob: string;
  bloodgroup: string;
  rh: string;
  phone: string;
  email: string;
  address: string;
  occupation: string;
  hospital: string;
  isActive: boolean;
  visits?: any[];
  triage?: any[];
  labwork?: any[];
  patientHistory?: any[];
  patientLifestyle?: any[];
  allergies?: any[];
  medications?: any[];
  symptomReasoningReport?: any[];
  riskAssessment?: any[];
  explanation?: any[];
  notes?: any[];
  [key: string]: any;
}
```

### `TabType`
```typescript
type TabType = 
  | "overview" 
  | "profile" 
  | "medication" 
  | "documents" 
  | "notes" 
  | "document" 
  | "note" 
  | "notepad" 
  | "symptomReport";
```

---

## Utilities

### `encryption.ts`
Client-side AES encryption for sensitive data.

**Methods:**
- `setKey(key)` — set encryption key from server
- `encrypt(data)` — encrypt string
- `decrypt(data)` — decrypt string
- `hasKey()` — check if key is set
- `clearKey()` — wipe key from memory

---

## Constants

### `screeningForms.ts`
Defines all screening form configurations including:
- Field definitions (type, label, validation)
- Form sections
- Submission targets (table names)

### `screening.ts`
Screening form metadata and tab configuration.

### `patientColumns.tsx`
Column definitions for the patient list table.

### `hospitalColumns.tsx`
Column definitions for the hospital list table.

---

## Key Patterns

### Optimistic UI
Patient list uses stale-while-revalidate: existing data stays visible while re-fetching after socket events.

### Cache Invalidation
Socket events trigger Redux invalidation → components re-fetch automatically on next render.

### Error Boundaries
API errors are caught in service layer and surfaced via toast notifications.

### Encrypted Storage
All auth data is encrypted before storage and decrypted on read using a server-provided key.

---

**Last Updated**: April 2026  
**Version**: 2.0
