# Role-Based Access Control (RBAC) Implementation Guide

## Overview

This document outlines the comprehensive Role-Based Access Control (RBAC) system implemented in the TextPoint application. The system provides granular control over user access, permissions, and system configuration.

## Architecture

### User Roles

The system supports three primary user roles:

1. **Super Admin**
   - Full system access and configuration
   - Can manage all users and roles
   - Can upload company logo and configure branding
   - Can add/remove branches
   - Can modify system settings
   - Can manage all permissions

2. **Admin**
   - Administrative access to users and branches
   - Can add/remove users (but not other admins)
   - Can view and manage branches
   - Can view reports and data
   - Limited system configuration access

3. **User**
   - Standard user access
   - Can view assigned modules
   - Can perform operations based on module permissions
   - Cannot access admin functions

### Permission Model

Permissions are organized by category and module:

- **Users**: View, Create, Edit, Delete, Manage Roles
- **Roles**: View, Create, Edit, Delete
- **Specimens**: View, Create, Edit, Delete
- **Equipment**: View, Create, Edit, Delete
- **Courses**: View, Create, Edit, Delete
- **Students**: View, Create, Edit, Delete
- **Lecturers**: View, Create, Edit, Delete
- **Reports**: View, Create, Export
- **Branches**: View, Create, Edit, Delete
- **Settings**: View, Edit
- **Company**: View, Edit

### Module Access Control

Each user can have granular access control per module with four permission levels:

- **canView**: Can view/list items in the module
- **canCreate**: Can create new items
- **canEdit**: Can modify existing items
- **canDelete**: Can remove items

## Database Schema

### Tables

#### `users`
Extended with role field:
- `id`: Primary key
- `openId`: OAuth identifier
- `name`: User name
- `email`: Email address
- `role`: Enum (user, admin, super_admin)
- `createdAt`: Creation timestamp
- `updatedAt`: Update timestamp
- `lastSignedIn`: Last login timestamp

#### `roles`
- `id`: Primary key
- `name`: Role name (unique)
- `description`: Role description
- `type`: Enum (system, custom) - System roles cannot be deleted
- `createdAt`: Creation timestamp
- `updatedAt`: Update timestamp

#### `permissions`
- `id`: Primary key
- `name`: Permission name (unique)
- `description`: Permission description
- `category`: Permission category
- `createdAt`: Creation timestamp
- `updatedAt`: Update timestamp

#### `role_permissions`
Junction table linking roles to permissions:
- `id`: Primary key
- `roleId`: Foreign key to roles
- `permissionId`: Foreign key to permissions
- `createdAt`: Creation timestamp

#### `user_roles`
Junction table allowing users to have multiple roles:
- `id`: Primary key
- `userId`: Foreign key to users
- `roleId`: Foreign key to roles
- `createdAt`: Creation timestamp

#### `user_permissions`
Granular user-level permissions:
- `id`: Primary key
- `userId`: Foreign key to users
- `permissionId`: Foreign key to permissions
- `grantedAt`: Grant timestamp
- `grantedBy`: Admin who granted permission
- `createdAt`: Creation timestamp

#### `module_access`
Module-level access control:
- `id`: Primary key
- `userId`: Foreign key to users
- `module`: Module identifier
- `canView`: Boolean
- `canCreate`: Boolean
- `canEdit`: Boolean
- `canDelete`: Boolean
- `createdAt`: Creation timestamp
- `updatedAt`: Update timestamp

#### `company_settings`
Super admin configuration:
- `id`: Primary key
- `companyName`: Company name
- `companyLogo`: Logo data (base64)
- `companyLogoUrl`: Logo URL
- `companyDescription`: Company description
- `primaryColor`: Primary brand color
- `secondaryColor`: Secondary brand color
- `timezone`: System timezone
- `dateFormat`: Date format preference
- `currency`: Currency code
- `createdAt`: Creation timestamp
- `updatedAt`: Update timestamp

## API Endpoints

### User Management

#### List Users
```
GET /trpc/rbac.users.list
```
Requires: Admin or Super Admin role

#### Get User
```
GET /trpc/rbac.users.getById?input={userId}
```
Requires: Admin or Super Admin role

#### Create User
```
POST /trpc/rbac.users.create
Body: {
  name: string,
  email: string,
  role: "user" | "admin" | "super_admin"
}
```
Requires: Super Admin role

#### Update User
```
POST /trpc/rbac.users.update
Body: {
  id: number,
  name?: string,
  email?: string,
  role?: "user" | "admin" | "super_admin"
}
```
Requires: Admin or Super Admin role

#### Delete User
```
POST /trpc/rbac.users.delete
Body: userId (number)
```
Requires: Super Admin role

### Role Management

#### List Roles
```
GET /trpc/rbac.roles.list
```
Requires: Admin or Super Admin role

#### Get Role with Permissions
```
GET /trpc/rbac.roles.getById?input={roleId}
```
Requires: Admin or Super Admin role

#### Create Custom Role
```
POST /trpc/rbac.roles.create
Body: {
  name: string,
  description?: string,
  permissionIds: number[]
}
```
Requires: Super Admin role

#### Update Role
```
POST /trpc/rbac.roles.update
Body: {
  id: number,
  name?: string,
  description?: string,
  permissionIds?: number[]
}
```
Requires: Super Admin role

#### Delete Role
```
POST /trpc/rbac.roles.delete
Body: roleId (number)
```
Requires: Super Admin role

### Permission Management

#### List Permissions
```
GET /trpc/rbac.permissions.list
```
Requires: Admin or Super Admin role

#### Get Permissions by Category
```
GET /trpc/rbac.permissions.getByCategory?input={category}
```
Requires: Admin or Super Admin role

### User Permissions

#### Get User Permissions
```
GET /trpc/rbac.userPermissions.getByUserId?input={userId}
```
Requires: Admin or Super Admin role

#### Set Module Access
```
POST /trpc/rbac.userPermissions.setModuleAccess
Body: {
  userId: number,
  module: string,
  canView: boolean,
  canCreate: boolean,
  canEdit: boolean,
  canDelete: boolean
}
```
Requires: Admin or Super Admin role

#### Grant Permission
```
POST /trpc/rbac.userPermissions.grantPermission
Body: {
  userId: number,
  permissionId: number
}
```
Requires: Admin or Super Admin role

#### Revoke Permission
```
POST /trpc/rbac.userPermissions.revokePermission
Body: {
  userId: number,
  permissionId: number
}
```
Requires: Admin or Super Admin role

### Company Settings

#### Get Company Settings
```
GET /trpc/rbac.companySettings.get
```
Accessible to all authenticated users

#### Update Company Settings
```
POST /trpc/rbac.companySettings.update
Body: {
  companyName?: string,
  companyDescription?: string,
  companyLogoUrl?: string,
  primaryColor?: string,
  secondaryColor?: string,
  timezone?: string,
  dateFormat?: string,
  currency?: string
}
```
Requires: Super Admin role

#### Upload Logo
```
POST /trpc/rbac.companySettings.uploadLogo
Body: {
  logoData: string (base64),
  fileName: string
}
```
Requires: Super Admin role

### Branch Management

#### List Branches
```
GET /trpc/rbac.branches.list
```
Accessible to all authenticated users

#### Get Branch
```
GET /trpc/rbac.branches.getById?input={branchId}
```
Accessible to all authenticated users

#### Create Branch
```
POST /trpc/rbac.branches.create
Body: {
  name: string,
  code?: string,
  description?: string
}
```
Requires: Admin or Super Admin role

#### Update Branch
```
POST /trpc/rbac.branches.update
Body: {
  id: number,
  name?: string,
  code?: string,
  description?: string,
  active?: boolean
}
```
Requires: Admin or Super Admin role

#### Delete Branch
```
POST /trpc/rbac.branches.delete
Body: branchId (number)
```
Requires: Admin or Super Admin role

## Frontend Components

### AdminPageEnhanced.tsx
Enhanced admin interface with:
- User management (add, edit, delete)
- Permission management per user
- Role management
- Branch management
- System settings

### SuperAdminSettingsPage.tsx
Super admin configuration interface with:
- Company branding (logo, colors)
- Company information
- Branch management
- System configuration

## Implementation Steps

### 1. Database Migration
Run the migration file to create RBAC tables:
```bash
npm run db:migrate -- add_rbac_tables.sql
```

### 2. Update User Model
Update the users table to include the super_admin role:
```sql
ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'super_admin') DEFAULT 'user' NOT NULL;
```

### 3. Integrate RBAC Router
Add the RBAC router to the main appRouter in `server/routers.ts`:
```typescript
import { rbacRouter } from "./rbac_routers";

export const appRouter = router({
  // ... existing routers
  rbac: rbacRouter,
});
```

### 4. Update Navigation
Add links to admin and super admin pages in the main navigation:
- Admin users: Link to AdminPageEnhanced
- Super admin users: Link to SuperAdminSettingsPage

### 5. Implement Permission Checks
Add permission checks in components:
```typescript
const { data: user } = trpc.auth.getMe.useQuery();

if (!["admin", "super_admin"].includes(user?.role)) {
  return <NotAuthorized />;
}
```

## Security Considerations

1. **Role-Based Authorization**: All API endpoints check user role before executing
2. **Permission Isolation**: Users can only access modules they have permission for
3. **Audit Trail**: All permission changes should be logged
4. **Secure Logo Upload**: Validate file types and size before storing
5. **API Rate Limiting**: Implement rate limiting on sensitive endpoints
6. **HTTPS Only**: All API calls should use HTTPS in production

## Usage Examples

### Checking User Permissions
```typescript
const hasPermission = (user: User, permission: string) => {
  return user.role === "super_admin" || 
         user.permissions?.includes(permission);
};

// Usage
if (hasPermission(user, "specimens.create")) {
  // Show create button
}
```

### Conditional Rendering
```typescript
{user?.role === "super_admin" && (
  <Button onClick={() => navigateTo("/super-admin-settings")}>
    System Settings
  </Button>
)}

{["admin", "super_admin"].includes(user?.role) && (
  <Button onClick={() => navigateTo("/admin")}>
    Admin Panel
  </Button>
)}
```

## Testing

### Test Cases

1. **User Creation**: Super admin can create users with different roles
2. **Permission Assignment**: Admin can assign permissions to users
3. **Module Access**: Users can only access modules they have permission for
4. **Company Branding**: Super admin can upload logo and set colors
5. **Branch Management**: Admin can add/remove branches
6. **Role Enforcement**: Non-admins cannot access admin functions

## Future Enhancements

1. **Audit Logging**: Log all permission changes and admin actions
2. **Two-Factor Authentication**: Add 2FA for admin accounts
3. **Session Management**: Implement session timeout for security
4. **Permission Templates**: Pre-built permission sets for common roles
5. **Delegation**: Allow admins to delegate specific permissions
6. **Activity Dashboard**: Real-time activity monitoring for super admins
7. **Backup & Restore**: Automated database backup functionality
8. **API Key Management**: Allow users to generate API keys with specific permissions

## Support

For issues or questions regarding the RBAC implementation, please contact the development team.
