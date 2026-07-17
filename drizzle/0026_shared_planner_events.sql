CREATE TABLE sharedPlannerEvents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  eventType ENUM('Meeting', 'Training', 'Deadline', 'Reminder', 'Visit', 'General') NOT NULL DEFAULT 'General',
  branchId INT NULL,
  createdByUserId INT NOT NULL,
  startAt DATETIME NOT NULL,
  endAt DATETIME NULL,
  isAllDay BOOLEAN NOT NULL DEFAULT FALSE,
  location VARCHAR(255) NULL,
  notes TEXT NULL,
  recurrence VARCHAR(30) NULL,
  recurrenceUntil DATE NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
