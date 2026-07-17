CREATE TABLE IF NOT EXISTS qualityAudits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referenceNumber VARCHAR(60) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  auditType ENUM(
    'Internal Audit',
    'Process Audit',
    'Training Audit',
    'Equipment Audit',
    'Document Audit',
    'Branch Audit'
  ) NOT NULL DEFAULT 'Internal Audit',
  status ENUM('Planned', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Planned',
  branchId INT NULL,
  leadAuditor VARCHAR(255) NULL,
  auditee VARCHAR(255) NULL,
  plannedDate DATE NOT NULL,
  completedDate DATE NULL,
  nextAuditDate DATE NULL,
  scope TEXT NOT NULL,
  criteria TEXT NULL,
  summary TEXT NULL,
  findingsSummary TEXT NULL,
  followUpSummary TEXT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS managementReviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referenceNumber VARCHAR(60) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  status ENUM('Planned', 'Held', 'Closed', 'Cancelled') NOT NULL DEFAULT 'Planned',
  branchId INT NULL,
  meetingDate DATE NOT NULL,
  nextReviewDate DATE NULL,
  chairperson VARCHAR(255) NULL,
  attendees TEXT NULL,
  agenda TEXT NULL,
  inputsSummary TEXT NULL,
  decisionsSummary TEXT NULL,
  actionSummary TEXT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
