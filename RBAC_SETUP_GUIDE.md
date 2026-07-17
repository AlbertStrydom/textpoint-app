# RBAC System Setup Guide

## Quick Start

This guide walks you through implementing the complete Role-Based Access Control (RBAC) system in your TextPoint application.

## Files Created

### Database & Schema
- `drizzle/migrations/add_rbac_tables.sql` - SQL migration for RBAC tables
- `drizzle/rbac_schema.ts` - TypeScript schema definitions for RBAC tables

### Backend
- `server/rbac_routers.ts` - tRPC routers for all RBAC operations

### Frontend
- `client/src/pages/AdminPageEnhanced.tsx` - Enhanced admin interface
- `client/src/pages/SuperAdminSettingsPage.tsx` - Super admin settings interface

### Documentation
- `RBAC_IMPLEMENTATION.md` - Complete implementation documentation
- `RBAC_SETUP_GUIDE.md` - This setup guide

## Step-by-Step Implementation

### Step 1: Database Setup

#### 1.1 Run Migration
Execute the SQL migration to create all RBAC tables:

```bash
cd /home/ubuntu/textpoint
mysql -u root -p < drizzle/migrations/add_rbac_tables.sql
```

Or if using a database management tool, execute the SQL statements in:
- `drizzle/migrations/add_rbac_tables.sql`

#### 1.2 Verify Tables Created
```sql
SHOW TABLES LIKE '%role%';
SHOW TABLES LIKE '%permission%';
SHOW TABLES LIKE '%company%';
SHOW TABLES LIKE '%module%';
```

### Step 2: Update User Model

Update the existing users table to support the super_admin role:

```sql
ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'super_admin') DEFAULT 'user' NOT NULL;
```

### Step 3: Update Drizzle Schema

Add the RBAC schema definitions to your main schema file:

1. Open `drizzle/schema.ts`
2. Add import at the top:
```typescript
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
  userPermissions,
  moduleAccess,
  companySettings,
  type Role,
  type Permission,
  type RolePermission,
  type UserRole,
  type UserPermission,
  type ModuleAccess,
  type CompanySettings,
} from "./rbac_schema";
```

3. Update the users table definition to include super_admin role:
```typescript
export const users = mysqlTable("users", {
  // ... existing fields
  role: mysqlEnum("role", ["user", "admin", "super_admin"]).default("user").notNull(),
  // ... rest of fields
});
```

### Step 4: Integrate RBAC Router

1. Open `server/routers.ts`
2. Add import at the top:
```typescript
import { rbacRouter } from "./rbac_routers";
```

3. Add to appRouter:
```typescript
export const appRouter = router({
  // ... existing routers
  rbac: rbacRouter,
});
```

### Step 5: Update Navigation

Add navigation links for admin and super admin users:

1. Open `client/src/components/DashboardLayout.tsx` or your main navigation component
2. Add conditional links:

```typescript
{user?.role === "super_admin" && (
  <NavLink to="/super-admin-settings">
    <Settings className="w-4 h-4" />
    Super Admin Settings
  </NavLink>
)}

{["admin", "super_admin"].includes(user?.role) && (
  <NavLink to="/admin">
    <Shield className="w-4 h-4" />
    Administration
  </NavLink>
)}
```

### Step 6: Update App Routes

1. Open `client/src/App.tsx`
2. Add route imports:
```typescript
import AdminPageEnhanced from "@/pages/AdminPageEnhanced";
import SuperAdminSettingsPage from "@/pages/SuperAdminSettingsPage";
```

3. Add routes:
```typescript
<Route path="/admin" component={AdminPageEnhanced} />
<Route path="/super-admin-settings" component={SuperAdminSettingsPage} />
```

### Step 7: Implement Permission Checks

Create a utility function for permission checking:

```typescript
// client/src/lib/permissions.ts
export type UserRole = "user" | "admin" | "super_admin";

export const canAccessAdmin = (role?: UserRole): boolean => {
  return ["admin", "super_admin"].includes(role || "");
};

export const canAccessSuperAdmin = (role?: UserRole): boolean => {
  return role === "super_admin";
};

export const hasModuleAccess = (
  moduleAccess: Record<string, any>,
  module: string,
  action: "view" | "create" | "edit" | "delete"
): boolean => {
  const access = moduleAccess?.[module];
  if (!access) return false;
  
  const actionMap = {
    view: "canView",
    create: "canCreate",
    edit: "canEdit",
    delete: "canDelete",
  };
  
  return access[actionMap[action]] === true;
};
```

### Step 8: Add Protected Routes

Create a protected route component:

```typescript
// client/src/components/ProtectedRoute.tsx
import { Navigate } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "super_admin";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole === "super_admin" && user.role !== "super_admin") {
    return <Navigate to="/" />;
  }

  if (requiredRole === "admin" && !["admin", "super_admin"].includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}
```

### Step 9: Initialize Default Data

Create a script to initialize default roles and permissions:

```typescript
// server/scripts/init-rbac.ts
import { db } from "@/server/db";
import { roles, permissions } from "@/drizzle/rbac_schema";

export async function initializeRBAC() {
  // Insert default roles
  await db.insert(roles).values([
    { name: "Super Admin", description: "Full system access", type: "system" },
    { name: "Admin", description: "Administrative access", type: "system" },
    { name: "Manager", description: "Team management", type: "system" },
    { name: "User", description: "Standard user access", type: "system" },
  ]);

  // Insert default permissions
  const defaultPermissions = [
    // Users
    { name: "users.view", description: "View users", category: "Users" },
    { name: "users.create", description: "Create users", category: "Users" },
    { name: "users.edit", description: "Edit users", category: "Users" },
    { name: "users.delete", description: "Delete users", category: "Users" },
    // ... add more permissions
  ];

  await db.insert(permissions).values(defaultPermissions);
}
```

### Step 10: Test the Implementation

1. **Test User Creation**:
   - Log in as super admin
   - Navigate to Admin panel
   - Create a new user with admin role
   - Verify user can access admin functions

2. **Test Permission Management**:
   - Select a user
   - Click "Manage Permissions"
   - Modify module access
   - Verify permissions are saved

3. **Test Company Settings**:
   - Log in as super admin
   - Navigate to Super Admin Settings
   - Upload company logo
   - Change brand colors
   - Verify changes are reflected

4. **Test Branch Management**:
   - Add new branch
   - Edit branch details
   - Delete branch
   - Verify operations complete successfully

## Configuration

### Default Roles

The system comes with four default system roles:

| Role | Permissions | Can Manage |
|------|-------------|-----------|
| Super Admin | All | Everything |
| Admin | User, Branch, View Reports | Users, Branches |
| Manager | View, Create, Edit (own data) | Team Members |
| User | View assigned modules | Own data only |

### Default Permissions

Permissions are organized by category:

- **Users**: view, create, edit, delete, manage_roles
- **Roles**: view, create, edit, delete
- **Specimens**: view, create, edit, delete
- **Equipment**: view, create, edit, delete
- **Courses**: view, create, edit, delete
- **Students**: view, create, edit, delete
- **Lecturers**: view, create, edit, delete
- **Reports**: view, create, export
- **Branches**: view, create, edit, delete
- **Settings**: view, edit
- **Company**: view, edit

## Troubleshooting

### Issue: "Unauthorized" error when accessing admin panel

**Solution**: Verify user role is set to "admin" or "super_admin" in database:
```sql
SELECT id, name, email, role FROM users WHERE email = 'user@example.com';
```

### Issue: Permissions not updating

**Solution**: Clear browser cache and verify API endpoint is returning updated permissions:
```bash
curl http://localhost:3000/trpc/rbac.userPermissions.getByUserId?input=1
```

### Issue: Logo upload not working

**Solution**: Verify file size is under 5MB and format is PNG/JPG. Check server logs for upload errors.

### Issue: Database migration fails

**Solution**: Verify MySQL version supports the enum values. Run migration step by step:
```sql
-- First, add the new role to users table
ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'super_admin') DEFAULT 'user' NOT NULL;

-- Then create each table individually
CREATE TABLE IF NOT EXISTS roles (
  -- ... table definition
);
```

## Next Steps

After implementing the RBAC system:

1. **Add Audit Logging**: Log all admin actions for compliance
2. **Implement 2FA**: Add two-factor authentication for admin accounts
3. **Create Reports**: Build admin dashboards for system monitoring
4. **Set Up Backups**: Implement automated database backups
5. **Add API Keys**: Allow users to generate API keys with specific permissions

## Support & Questions

For detailed API documentation, see `RBAC_IMPLEMENTATION.md`.

For implementation questions, refer to the inline comments in the source files.

## Security Checklist

- [ ] All admin endpoints check user role
- [ ] Sensitive operations require super admin role
- [ ] File uploads are validated
- [ ] HTTPS is enabled in production
- [ ] Rate limiting is implemented
- [ ] Audit logging is enabled
- [ ] Default passwords are changed
- [ ] Database backups are scheduled
- [ ] API keys are rotated regularly
- [ ] Sessions timeout after inactivity
