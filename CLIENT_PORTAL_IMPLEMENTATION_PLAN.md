# TextPoint Client Portal Implementation Plan

## Objective

Add a secure client-facing portal to TextPoint for Level III and compliance clients so each client can:

- access general company documents, forms, and useful links
- manage technician compliance records and uploads
- view controlled client documents such as procedures and appointment letters
- receive reminders for expiring certifications, eye tests, medicals, and review dates
- submit comments, requests, and contact prompts

The portal must be configurable per client and must keep each client isolated to its own records.

---

## Why this is viable in the current app

The current codebase already includes the main building blocks needed:

- authentication and session handling via Better Auth
- app users and RBAC via `users` and `module_access`
- CRM companies and contacts
- Level III client and technician data
- document storage and generation workflows
- reminder-ready date tracking patterns in planner, quality, and certificates

Relevant existing areas:

- auth and roles: `drizzle/schema.ts`, `server/_core/*`
- companies and contacts: `drizzle/schema.ts`, `server/db.ts`, `client/src/pages/CompaniesPage.tsx`
- Level III clients and technicians: `server/db.ts`, `client/src/pages/LevelIIIPage.tsx`
- controlled documents: `server/db.ts`, `client/src/pages/DocumentsPage.tsx`
- due/expiry reminder patterns: `server/notifications.ts`, `server/db.ts`

This means the portal can be built as an extension of the current platform rather than a separate app.

---

## Target portal structure

### 1. Client Home

Purpose:

- welcome screen for client users
- general uploads, forms, links, notices, and announcements
- summary cards for upcoming expiries and document review items

Typical widgets:

- expiring items in 30/60/90 days
- outstanding upload requests
- recently updated controlled documents
- quick links
- latest comments or requests

### 2. Technician Compliance

Purpose:

- each client sees only its own technicians
- upload and review technician-specific compliance files
- track validity dates and reminder windows

Typical record types:

- PCN certifications
- in-house certifications
- eye tests
- medical tests
- ID documents
- RT dosage records
- qualification certificates
- any custom client-required compliance records

### 3. Client Documents

Purpose:

- view and download current approved client-facing controlled documents
- show validity/review dates and reminder states

Typical document types:

- procedures
- appointment letters
- written instructions / practices
- internal client packs
- client-specific forms

### 4. Comments and Requests

Purpose:

- request callback or support
- suggest changes
- ask for document review or clarification
- maintain an audit-friendly conversation trail

### 5. Admin Configuration

Purpose:

- configure portal per client
- assign which internal staff and which client users have access
- configure client-required technician fields and document types
- configure reminder rules and review intervals

---

## Proposed access model

Add a dedicated client-facing role model instead of exposing internal pages to external users.

### Recommended roles

- `super_admin`
  Full platform control

- `admin`
  Internal operational admin

- `client_manager`
  Internal TextPoint user who manages one or more client portals

- `client_admin`
  External client representative with rights to manage technicians and uploads for that client

- `client_user`
  External client representative with read-only or limited edit rights

### Rules

- every external portal user must be linked to one client account
- client users must never see another client’s data
- internal users may be mapped to multiple clients
- permissions should be module-based and client-scoped, not only role-based

---

## Proposed data model

The current app already has `companies`, `contacts`, `levelIIIClients`, `levelIIITechnicians`, and `documents`. The cleanest approach is to introduce a dedicated client-portal layer that links to these instead of overloading unrelated tables.

### New tables

#### `portal_clients`

Represents a client that has access to the portal.

Fields:

- `id`
- `companyId` nullable FK to `companies`
- `levelIIIClientId` nullable FK to existing Level III client record
- `name`
- `code`
- `status`
- `primaryContactName`
- `primaryContactEmail`
- `primaryContactPhone`
- `portalEnabled`
- `brandingLogoUrl`
- `brandingPrimaryColor`
- `notes`
- `createdAt`
- `updatedAt`

#### `portal_client_users`

Maps app users to portal clients.

Fields:

- `id`
- `clientId`
- `userId`
- `portalRole` enum: `client_admin`, `client_user`, `client_manager`
- `canUpload`
- `canEditTechnicians`
- `canManageDocuments`
- `canComment`
- `active`
- `createdAt`
- `updatedAt`

#### `portal_sections`

Defines configurable sections visible for a client.

Fields:

- `id`
- `clientId`
- `sectionKey` such as `general`, `technicians`, `documents`, `comments`
- `title`
- `description`
- `enabled`
- `sortOrder`
- `settingsJson`

#### `portal_content_items`

General home-section items for uploads, forms, links, and notices.

Fields:

- `id`
- `clientId`
- `sectionId`
- `title`
- `contentType` enum: `document`, `external_link`, `note`, `form`
- `documentId` nullable
- `url` nullable
- `body` nullable
- `visibleFrom`
- `visibleUntil`
- `active`
- `createdBy`
- `createdAt`
- `updatedAt`

#### `portal_technicians`

Client-scoped technician master records for the portal.

Recommended approach:

- either link directly to existing `levelIIITechnicians`
- or create a dedicated portal technician table and optionally cross-reference Level III records

Fields:

- `id`
- `clientId`
- `levelIIITechnicianId` nullable
- `employeeNumber`
- `firstName`
- `lastName`
- `email`
- `phone`
- `idNumber`
- `position`
- `status`
- `startDate`
- `endDate`
- `notes`
- `createdAt`
- `updatedAt`

#### `portal_requirement_definitions`

Client-specific configurable compliance requirements.

Examples:

- Eye test
- Medical test
- PCN certificate
- In-house certificate
- RT dosage record
- ID document

Fields:

- `id`
- `clientId`
- `name`
- `category`
- `description`
- `validityMode` enum: `none`, `fixed_days`, `manual_date`
- `validityDays` nullable
- `warningDays` nullable
- `requiresDocument`
- `allowsMultiple`
- `fieldsJson`
- `active`
- `sortOrder`

#### `portal_technician_requirements`

Stores each technician’s compliance record against a requirement definition.

Fields:

- `id`
- `clientId`
- `technicianId`
- `requirementDefinitionId`
- `status` enum: `valid`, `expiring`, `expired`, `missing`, `under_review`
- `issueDate`
- `validUntil`
- `reviewDate`
- `referenceNumber`
- `issuer`
- `result`
- `metadataJson`
- `lastVerifiedBy`
- `lastVerifiedAt`
- `createdAt`
- `updatedAt`

#### `portal_requirement_documents`

Uploaded files for a technician requirement.

Fields:

- `id`
- `requirementId`
- `fileName`
- `fileUrl`
- `mimeType`
- `fileSize`
- `uploadedBy`
- `uploadedAt`
- `notes`

#### `portal_client_documents`

Client-facing controlled documents visible in the third portal section.

This can either wrap existing `documents` records or maintain a portal-facing view table.

Fields:

- `id`
- `clientId`
- `documentId` nullable FK to existing `documents`
- `title`
- `documentType`
- `status`
- `version`
- `effectiveDate`
- `reviewDueDate`
- `validUntil`
- `downloadUrl`
- `notes`
- `visibleToClient`
- `createdAt`
- `updatedAt`

#### `portal_comments`

Comment and support thread records.

Fields:

- `id`
- `clientId`
- `technicianId` nullable
- `documentId` nullable
- `subject`
- `body`
- `commentType` enum: `note`, `request_contact`, `suggestion`, `issue`
- `status` enum: `open`, `in_progress`, `closed`
- `createdBy`
- `assignedTo` nullable
- `createdAt`
- `updatedAt`

---

## Recommended integration with existing tables

### Existing `companies`

Use as the CRM/business source and link it to `portal_clients`.

### Existing Level III data

Current Level III structures are the best starting point for the technician/compliance side. The plan should reuse these where practical:

- `levelIIIClients`
- `levelIIITechnicians`
- `levelIIIAssessments`

Short-term:

- link portal clients to current Level III clients
- link portal technicians to current Level III technicians

Long-term:

- gradually move compliance tracking into the new client-portal requirement model
- keep Level III operational records for internal workflows

### Existing `documents`

Use `documents` as the source of controlled files. Add a client-visibility wrapper rather than duplicating every file.

### Existing reminders

Reuse reminder logic patterns from:

- planner entries
- certificate expiry tracking
- Level III due summaries
- quality review reminders

---

## API / router plan

Create a dedicated router set for the client portal.

### `portal.auth`

- get current client context
- list clients available to logged-in user
- switch active client context if internal user manages multiple clients

### `portal.home`

- list dashboard summary cards
- list home content items
- create/update/delete general content items

### `portal.technicians`

- list technicians for active client
- get technician details
- create/update/archive technician
- list technician requirement statuses

### `portal.requirements`

- list requirement definitions for active client
- create/update/delete requirement definition
- create/update requirement record for technician
- upload / remove supporting document
- mark reviewed / verified

### `portal.documents`

- list client-facing documents
- download document
- assign existing internal document to client portal
- update review dates / visibility

### `portal.comments`

- list comments and requests
- create request
- update status
- assign internal owner

### `portal.admin`

- manage portal clients
- manage portal client users
- configure enabled sections
- configure reminder windows and custom fields

---

## Frontend plan

### New routes

- `/portal`
- `/portal/home`
- `/portal/technicians`
- `/portal/technicians/:id`
- `/portal/documents`
- `/portal/comments`
- `/portal/settings`

### Navigation behavior

Do not mix portal pages into the normal internal navigation for external users.

Recommended behavior:

- internal users see both normal app modules and a portal-admin entry
- external client users see a reduced navigation with only portal sections

### Reusable UI foundations from current app

- `DashboardLayout`
- `DataTable`
- `FormDialog`
- `DocumentsPage` patterns for upload, review, and download
- `LevelIIIPage` patterns for technician data
- `NotificationCenter` patterns for due items

---

## Reminder and expiry model

### Events to track

- eye test valid until
- medical valid until
- PCN certificate valid until
- in-house certification valid until
- appointment letter valid until
- procedure review due
- any custom requirement review date

### Reminder behavior

Each requirement definition should support:

- warning days before expiry
- overdue alerts
- optional repeat reminders
- optional dashboard-only vs notification-enabled reminders

### Surfaces

- client portal dashboard cards
- internal dashboard cards
- planner/calendar feed integration for internal staff
- notification center items

---

## File storage approach

For internal testing, current local upload storage can work.

For production, portal uploads should move to object storage because client compliance files are business-critical.

Recommended target:

- S3-compatible storage
- per-client folder/prefix structure
- signed download URLs
- metadata retained in the database

---

## Security requirements

- every portal query must be client-scoped on the server side
- never rely only on frontend filtering
- file URLs should not be publicly guessable
- uploads and downloads must be permission-checked
- audit trail required for create/update/delete/upload/download actions
- external users should not have access to internal-only modules

---

## Audit trail requirements

Track at minimum:

- who created or changed technician compliance records
- who uploaded a file
- who verified a requirement
- who changed a document visibility/review date
- who posted or closed a request/comment

This can extend the existing audit approach already present in the app.

---

## Delivery phases

### Phase 1. Foundation

- add `portal_clients` and `portal_client_users`
- add portal roles and server-side access helpers
- add client context selection
- add portal shell and basic navigation

Outcome:

- users can securely enter a client-scoped portal

### Phase 2. Technician compliance MVP

- add technician portal records
- add requirement definitions
- add requirement status tracking
- add file upload support per requirement
- add expiry dashboards

Outcome:

- client can manage technicians, expiries, and uploads

### Phase 3. Client document library

- expose client-facing approved documents
- add review/validity dates
- add download experience
- add reminders for review due items

Outcome:

- client can view current procedures and controlled documents

### Phase 4. Comments and requests

- add comment/request module
- assign requests to internal staff
- add status tracking and resolution

Outcome:

- communication loop exists inside the platform

### Phase 5. Client-specific customization

- custom requirement fields
- per-client enabled sections
- per-client reminder settings
- client branding options

Outcome:

- portal becomes configurable by client need

### Phase 6. Production hardening

- move files to object storage
- add audit logging expansion
- add notification delivery options
- add bulk import/export tooling

Outcome:

- ready for real client use beyond internal testing

---

## Recommended build order for this project

The safest sequence for this specific codebase is:

1. Create portal data model and access helpers
2. Add portal client/user management for internal admins
3. Build technician compliance MVP using existing Level III data as the bridge
4. Add expiry dashboards and reminder logic
5. Add client documents section by reusing the existing documents system
6. Add comments/requests
7. Add customization layer
8. Move uploads to object storage

---

## High-risk areas to handle carefully

- client data isolation
- upload storage and access control
- mixing internal roles with external portal roles
- reusing Level III tables without creating conflicting business rules
- keeping document approval workflows separate from client-facing visibility

---

## Suggested first implementation milestone

If the goal is to get value quickly, the best MVP is:

- portal login and client-scoped access
- technician list
- eye test, medical, PCN, in-house certification tracking
- upload files per technician
- expiry dashboard

This would prove the core portal concept before investing in the full document and comments modules.

---

## What can be reused immediately

- existing auth and user model
- module access pattern
- company/contact relationships
- Level III client and technician logic
- document upload/display patterns
- reminder classification logic
- dashboard cards and table components

---

## Next step

The next practical step after approving this plan is to implement **Phase 1 + Phase 2 MVP**:

- database migrations
- portal access control
- portal routes
- technician compliance pages
- upload handling
- expiry dashboard

That will produce the first usable client portal slice with the highest operational value.
