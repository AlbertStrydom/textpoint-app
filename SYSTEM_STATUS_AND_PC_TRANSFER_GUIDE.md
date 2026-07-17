# TextPoint - Current Status, Test Checklist, and PC Transfer Guide

## 1. Current Technical Status

- Application type: full-stack web app
- Frontend: React 19 + TypeScript + Vite + Tailwind
- Backend: Express + tRPC + Node.js
- Database: MySQL via Drizzle ORM
- Current local server behaviour: runs on `http://localhost:3000` by default and will move to the next open port if `3000` is busy
- Build status: passing
- Typecheck status: passing
- Test status: passing
- Current automated test count: `29`

## 2. What Has Been Implemented

### 2.1 Core Platform

- Authentication with login, logout, password change, reset-password token flow, local auth support, and role handling
- Role-based access control with page/module access tick boxes
- Super Admin handling
- Grouped side navigation with cleaner layout
- Dark mode
- Dashboard / home page with operational overview
- South African English wording updates across the app

### 2.2 Branch and Administration

- Branch management
- Branch branding per branch
- Company name, company description, logo, and colour profile per branch
- User management
- Profile picture editing per user
- Method management in Admin
- Method colour management in Admin for schedule calendar colouring

### 2.3 CRM / Leads / Companies / Contacts

- Leads capture and update flow
- Duplicate detection
- Lead activities and follow-ups
- Calendar-style follow-up visibility
- Lead conversion to student
- Company records
- Contact records
- Existing company / contact linking

### 2.4 Students / Training Delivery

- Student creation and editing
- Auto-generated student numbers
- Duplicate checks for ID / passport
- Practical training / training record area inside Students
- Student-linked certificates
- PCN-related fields and carry-through from leads
- SNT-TC-1A certificate logic
- BINDT wording trigger based on PCN route / PCN number

### 2.5 Courses / Schedules / Enrolments / Attendance

- Course management
- Course schedules
- Branch-aware scheduling
- Branch filter in schedules
- Schedule calendar view
- Lecturer assignment
- Lecturer clash detection
- Capacity and seat tracking
- Enrolment validation
- Duplicate enrolment blocking
- Full-schedule blocking
- Attendance capture and update workflow
- End-of-course exam dates in schedules
- Imported 2026 branch training schedules
- Schedule import tooling

### 2.6 Lecturers / Training / Level II

- Lecturer CRUD
- Lecturer branch linkage
- Lecturer specialisation support using managed methods
- Training operational page
- Level II operational page

### 2.7 Equipment / Specimens

- Equipment management
- Equipment duplicate logic based on serial number
- Calibration-related fields and reminders logic foundation
- Equipment document links
- Equipment loans between branches
- Specimen management
- Specimen types managed from Admin
- Specimen document links
- Specimen loans between branches
- Specimen status support

### 2.8 KPI / Planner / Calendar / Notifications

- KPI templates
- KPI questions
- KPI records and approvals
- Private planner
- Recurring planner entries
- Shared calendar layer
- ICS import/export
- Unified calendar feeds
- Live subscription feed URLs for Google / Outlook style calendar subscription
- In-app notifications with persistence

### 2.9 Reports

- Reports module with generated report snapshots
- Preview in browser
- Editable HTML export

### 2.10 Level III Services

- Level III clients
- Level III technicians
- Multiple methods per technician
- PCN / internal assessment tracking path
- Level III assessments
- Level III activities
- Level III equipment
- Level III specimens
- Level III reminders and status indicators foundation

### 2.11 Quality / QMS Areas

- Nonconformance / corrective action register
- Internal audits
- Management review
- External providers / approved suppliers register
- QMS-aligned controlled documents groundwork

### 2.12 Documents System

- Manual document library
- Controlled template library
- Generated editable documents
- Starter training templates
- Sample document scenario loader
- Generation from Students
- Generation from Schedules
- Learner packs
- Lecturer packs
- Missing-document generation
- Pack issue workflow
- Pack preview / editable export
- Generated document revision control
- Template next-issue control
- Template control register
- Approval workflow for controlled documents
- DOCX template import
- Template token assistant
- Template validation wizard
- Document layout designer

## 3. What Still Needs Attention

### 3.1 Manual User Acceptance Testing

- The codebase is stable, but the system still needs deep business-side testing with real users and real workflows
- The biggest remaining risk is no longer missing modules, it is whether every workflow behaves exactly the way your business expects

### 3.2 Calendar Integration

- Current status:
  - ICS import/export exists
  - shared calendar exists
  - live ICS subscription feeds exist
- Still not implemented:
  - direct OAuth-linked Google Calendar sync
  - direct OAuth-linked Outlook / Microsoft 365 sync
  - true two-way live calendar sync

### 3.3 Email Delivery

- Forgot password currently creates a reset link
- A mailer / SMTP send flow is not yet wired in
- If you want users to receive reset links by email automatically, this still needs to be implemented

### 3.4 Document Production Readiness

- The document engine is strong, but your real production templates still need final alignment
- Still needs attention:
  - matching your current Word documents more closely
  - final branch-specific design polishing
  - print / PDF appearance checks
  - final wording review on each real form
  - final issue / approval workflow sign-off

### 3.5 Level III Depth

- Level III is operational, but still needs deeper business detail if you want the full vision
- Still possible future work:
  - richer client master data
  - stronger technician grouping and filtering
  - procedure register and revision tracking
  - eye-test and compliance depth
  - more renewal and certification automation

### 3.6 Imports

- Importing exists in several areas
- Still needs attention:
  - broader standardisation across all modules
  - more production import templates
  - more validation and error-reporting polish

### 3.7 Performance and Hardening

- The app builds successfully
- There is still a large frontend bundle warning
- Future hardening should include:
  - frontend code splitting
  - more automated tests
  - production backup / restore drills
  - production environment hardening

### 3.8 QMS / Organisational Change

- If this app is replacing older systems or manual processes, the QMS documents and procedures should be updated to reference the new platform formally
- This is a business / controlled-document step, not only a code step

## 4. Areas That Need Testing

Use this as the main user acceptance checklist.

### 4.1 Authentication and Access

- Login with existing user
- Logout
- Refresh after logout
- Create new user
- Login with new user credentials
- Change password
- Forgot password link generation
- Reset password using generated link
- Promote user to Admin
- Promote user to Super Admin
- Confirm page access tick boxes work correctly

### 4.2 Admin / Branches / Branding

- Add branch
- Edit branch
- Upload branch logo
- Save branch company colours
- Confirm branding changes appear in documents and reports
- Confirm branch editing is restricted correctly for non-Super Admin users

### 4.3 Leads / Companies / Contacts

- Add lead
- Edit lead
- Duplicate detection
- Lead activity creation
- Lead follow-up reminders
- Lead calendar visibility
- Link existing company
- Link existing contact
- Convert lead to student

### 4.4 Students / Enrolments / Certificates

- Add student
- Edit student
- Duplicate checks
- Create enrolment
- Block duplicate enrolment
- Block full schedule enrolment
- Add student training record
- Issue certificate
- Confirm SNT-TC-1A wording
- Confirm BINDT wording appears when PCN route / PCN number applies

### 4.5 Courses / Schedules / Attendance

- Add course
- Add schedule
- Edit schedule
- Branch filter in schedules
- Calendar view in schedules
- Lecturer clash detection
- End-of-course exam dates
- Attendance capture
- Attendance update on same date
- Imported schedule correctness for both branches

### 4.6 Lecturers / Methods / Training / Level II

- Add method
- Change method colour
- Confirm method colour appears in schedule calendar
- Add lecturer
- Edit lecturer
- Multi-method / specialisation checks
- Training offerings view
- Level II operational page filters and exports

### 4.7 Equipment / Specimens

- Add equipment
- Edit equipment
- Duplicate check by serial number
- Link external equipment document
- Create equipment loan
- Return equipment loan
- Add specimen type
- Add specimen
- Edit specimen
- Link external specimen document
- Create specimen loan
- Return specimen loan

### 4.8 KPI / Planner / Calendar

- Create KPI template
- Add KPI questions
- Create KPI record
- Save draft
- Submit KPI
- Approve / reject KPI
- Add private planner item
- Add recurring planner item
- Add shared event
- Export ICS
- Import ICS
- Copy and test calendar feed URL

### 4.9 Level III Services

- Add client
- Edit client
- Add technician
- Multi-method technician setup
- PCN / internal assessment dates
- Add Level III activity
- Confirm last visit / next visit behaviour
- Add Level III equipment
- Add Level III specimen
- Add Level III assessment

### 4.10 Quality

- Add quality action
- Edit quality action
- Add internal audit
- Add management review
- Add external provider
- Confirm due dates appear in planner / unified calendar where expected

### 4.11 Reports

- Generate each report type
- Preview report
- Export editable HTML
- Confirm branch filtering

### 4.12 Documents

- Load starter templates
- Load sample document scenario
- Import Word template
- Open token assistant
- Open validation wizard
- Open layout designer
- Generate document from student
- Generate document from schedule
- Create corrected revision
- Create next template issue
- Generate learner pack
- Generate lecturer pack
- Generate missing documents
- Submit document for review
- Approve document
- Reject document
- Issue pack
- Preview pack
- Export pack

## 5. What Must Be Backed Up Before Moving To Another PC

For a proper move, back up all of the following:

- The full project folder:
  - `C:\Users\Albert\Desktop\CRM Latest\textpoint-cleaned`
- Your `.env` file
- Your MySQL database
- The `uploads` folder if it exists in future
- Any external files or linked documents that are not stored inside MySQL

Important:

- Right now there is no `uploads` folder in this local project
- Most of the important business data is in MySQL
- Branch logos and many editable document records are stored in the database, not in a separate uploads folder

## 6. Required Environment Variables

The app requires these values in `.env`:

- `BETTER_AUTH_SECRET`
- `APP_BASE_URL`
- `DATABASE_URL`

Optional local testing values:

- `LOCAL_AUTH_BYPASS=true`
- `LOCAL_AUTH_EMAIL=admin@company.com`
- `LOCAL_AUTH_NAME=Admin`

## 7. Step-By-Step Guide To Move The Application To Another PC / Laptop

This guide assumes Windows and MySQL.

### Step 1. On the Old PC, Stop the App

Close any running dev or production terminal window for the app.

### Step 2. Back Up the Project Folder

Copy this folder to an external drive, network share, or cloud storage:

`C:\Users\Albert\Desktop\CRM Latest\textpoint-cleaned`

You do not need to rely on `node_modules`, but copying the full folder is fine if you want a quick raw backup.

### Step 3. Back Up the `.env` File

Copy the `.env` file from the project root.

This is important because it contains:

- database connection
- auth secret
- base URL
- local auth settings

### Step 4. Back Up the MySQL Database

Open a terminal on the old PC and run:

```powershell
mysqldump -u root -p --single-transaction --routines --triggers textpoint > textpoint.sql
```

If your database name is different, replace `textpoint` with your real database name.

### Step 5. Back Up the Uploads Folder If It Exists

If this folder exists in future, copy it too:

`C:\Users\Albert\Desktop\CRM Latest\textpoint-cleaned\uploads`

At the moment it does not exist in this local project, so this may not apply right now.

### Step 6. Prepare the New PC

Install:

- Node.js
- MySQL Server
- Git if you want source control tools

Recommended:

- use the same or a very similar Node.js major version as the old PC
- current old-PC Node version is `v24.14.0`

### Step 7. Copy the Project Folder to the New PC

Place the project in your preferred location, for example:

`C:\Users\Albert\Desktop\CRM Latest\textpoint-cleaned`

### Step 8. Restore the `.env` File

Put the backed-up `.env` file into the project root on the new PC.

If the app URL or database server changes, update:

- `APP_BASE_URL`
- `DATABASE_URL`

Example local format:

```env
APP_BASE_URL=http://localhost:3000
DATABASE_URL=mysql://root:yourpassword@localhost:3306/textpoint
BETTER_AUTH_SECRET=your-secret-value
LOCAL_AUTH_BYPASS=true
LOCAL_AUTH_EMAIL=albert@TextPoint.com
LOCAL_AUTH_NAME=Albert
```

### Step 9. Create the Database on the New PC

Open MySQL and create the target database if it does not already exist:

```sql
CREATE DATABASE textpoint CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 10. Restore the SQL Backup

From terminal:

```powershell
mysql -u root -p textpoint < textpoint.sql
```

Important:

- If you restore the full SQL dump, your data and schema should come across together
- In that case, do **not** run schema generation first unless you know the restored database is incomplete

### Step 11. Install Node Dependencies

Open a terminal in the project folder and run:

```powershell
npm.cmd install
```

### Step 12. Only If Needed, Apply Database Schema Commands

Use this only if:

- you did not restore a full SQL backup, or
- you created a fresh empty database and want the app schema rebuilt

Command:

```powershell
npm.cmd run db:push
```

Important:

- If you already restored a full working SQL backup, this step is usually not required

### Step 13. Start the App in Development

```powershell
npm.cmd run dev
```

Open:

`http://localhost:3000`

If `3000` is in use, the app may automatically move to the next open port.

### Step 14. Or Build and Run in Production Mode

```powershell
npm.cmd run build
npm.cmd run start
```

### Step 15. Validate the Move

After startup, test these first:

- login
- dashboard opens
- users and branches load
- schedules load
- students load
- documents load
- one document preview works
- one report generates
- planner opens

### Step 16. Restore the Uploads Folder If Needed

If you had an `uploads` folder in the old environment, copy it into the project root on the new PC so this path exists:

`C:\Users\Albert\Desktop\CRM Latest\textpoint-cleaned\uploads`

### Step 17. Re-run Any Optional Data Scripts Only If Required

Example:

```powershell
npm.cmd run import:schedules:2026
```

Do this only if you intentionally want to re-import those schedules.  
Do **not** do this blindly if the restored database already contains the correct data.

## 8. Recommended Safer Move Order

If you want the lowest-risk move, use this order:

1. Back up project folder
2. Back up `.env`
3. Dump MySQL database
4. Move files to new PC
5. Install Node.js and MySQL
6. Restore `.env`
7. Restore database
8. Run `npm.cmd install`
9. Start app with `npm.cmd run dev`
10. Run the testing checklist

## 9. Things To Watch Out For During the Move

- Wrong `DATABASE_URL`
- Missing `.env`
- MySQL service not running
- Restoring to the wrong database name
- Running `db:push` against the wrong database
- Using a different port without noticing
- Forgot password emails not arriving because SMTP mail sending is not implemented yet
- Missing future `uploads` folder if file uploads are used later

## 10. Recommended Next Operational Steps

- Complete the manual test checklist above
- Finalise the real production document templates
- Decide whether you want true Google / Outlook calendar sync or whether ICS feeds are enough
- Decide whether forgot-password should email links automatically
- Do one full move test to a second PC before relying on the system operationally

