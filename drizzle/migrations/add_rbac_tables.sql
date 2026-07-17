-- Add super_admin role to users table
ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'super_admin') DEFAULT 'user' NOT NULL;

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  type ENUM('system', 'custom') DEFAULT 'custom' NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roleId INT NOT NULL,
  permissionId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permissionId) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_permission (roleId, permissionId)
);

-- Create user_roles table (allows users to have multiple roles)
CREATE TABLE IF NOT EXISTS user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  roleId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_role (userId, roleId)
);

-- Create company_settings table for super admin configuration
CREATE TABLE IF NOT EXISTS company_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  companyName VARCHAR(255) NOT NULL,
  companyLogo LONGTEXT,
  companyLogoUrl VARCHAR(500),
  companyDescription TEXT,
  primaryColor VARCHAR(7),
  secondaryColor VARCHAR(7),
  timezone VARCHAR(50),
  dateFormat VARCHAR(20),
  currency VARCHAR(3),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Create user_permissions table for granular access control
CREATE TABLE IF NOT EXISTS user_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  permissionId INT NOT NULL,
  grantedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  grantedBy INT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permissionId) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (grantedBy) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_user_permission (userId, permissionId)
);

-- Create module_access table for feature-level access control
CREATE TABLE IF NOT EXISTS module_access (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  module VARCHAR(100) NOT NULL,
  canView BOOLEAN DEFAULT FALSE,
  canCreate BOOLEAN DEFAULT FALSE,
  canEdit BOOLEAN DEFAULT FALSE,
  canDelete BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_module (userId, module)
);

-- Insert default permissions
INSERT INTO permissions (name, description, category) VALUES
('users.view', 'View users', 'Users'),
('users.create', 'Create new users', 'Users'),
('users.edit', 'Edit user details', 'Users'),
('users.delete', 'Delete users', 'Users'),
('users.manage_roles', 'Manage user roles', 'Users'),
('roles.view', 'View roles', 'Roles'),
('roles.create', 'Create new roles', 'Roles'),
('roles.edit', 'Edit roles', 'Roles'),
('roles.delete', 'Delete roles', 'Roles'),
('specimens.view', 'View specimens', 'Specimens'),
('specimens.create', 'Create specimens', 'Specimens'),
('specimens.edit', 'Edit specimens', 'Specimens'),
('specimens.delete', 'Delete specimens', 'Specimens'),
('equipment.view', 'View equipment', 'Equipment'),
('equipment.create', 'Create equipment', 'Equipment'),
('equipment.edit', 'Edit equipment', 'Equipment'),
('equipment.delete', 'Delete equipment', 'Equipment'),
('courses.view', 'View courses', 'Courses'),
('courses.create', 'Create courses', 'Courses'),
('courses.edit', 'Edit courses', 'Courses'),
('courses.delete', 'Delete courses', 'Courses'),
('reports.view', 'View reports', 'Reports'),
('reports.create', 'Create reports', 'Reports'),
('reports.export', 'Export reports', 'Reports'),
('branches.view', 'View branches', 'Branches'),
('branches.create', 'Create branches', 'Branches'),
('branches.edit', 'Edit branches', 'Branches'),
('branches.delete', 'Delete branches', 'Branches'),
('settings.view', 'View settings', 'Settings'),
('settings.edit', 'Edit settings', 'Settings'),
('company.view', 'View company settings', 'Company'),
('company.edit', 'Edit company settings', 'Company');

-- Insert default roles
INSERT INTO roles (name, description, type) VALUES
('Super Admin', 'Full system access and configuration', 'system'),
('Admin', 'Administrative access to users and branches', 'system'),
('Manager', 'Can manage team members and view reports', 'system'),
('User', 'Standard user access', 'system');

-- Assign all permissions to Super Admin role
INSERT INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'Super Admin';

-- Assign user and branch management permissions to Admin role
INSERT INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'Admin' AND p.name IN (
  'users.view', 'users.create', 'users.edit', 'users.delete',
  'branches.view', 'branches.create', 'branches.edit', 'branches.delete',
  'specimens.view', 'equipment.view', 'courses.view', 'reports.view'
);

-- Assign view-only permissions to User role
INSERT INTO role_permissions (roleId, permissionId)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'User' AND p.name IN (
  'specimens.view', 'equipment.view', 'courses.view', 'reports.view'
);
