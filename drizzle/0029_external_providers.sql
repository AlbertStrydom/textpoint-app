CREATE TABLE IF NOT EXISTS externalProviders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referenceNumber VARCHAR(60) NOT NULL UNIQUE,
  companyName VARCHAR(255) NOT NULL,
  providerType ENUM(
    'Lecturer',
    'Assessor',
    'Calibration',
    'Consumables',
    'Venue',
    'Equipment',
    'Level III Consultant',
    'Document / Printing',
    'Other'
  ) NOT NULL DEFAULT 'Other',
  status ENUM(
    'Approved',
    'Conditional',
    'Under Review',
    'Suspended',
    'Inactive'
  ) NOT NULL DEFAULT 'Approved',
  rating ENUM('Preferred', 'Acceptable', 'Probationary') NOT NULL DEFAULT 'Acceptable',
  branchId INT NULL,
  primaryContact VARCHAR(255) NULL,
  email VARCHAR(320) NULL,
  phone VARCHAR(50) NULL,
  serviceScope TEXT NOT NULL,
  approvalDate DATE NULL,
  lastEvaluationDate DATE NULL,
  nextEvaluationDate DATE NULL,
  notes TEXT NULL,
  correctiveActionNotes TEXT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
