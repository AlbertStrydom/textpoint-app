ALTER TABLE users
  MODIFY COLUMN role ENUM('user', 'admin', 'super_admin') DEFAULT 'user' NOT NULL;
