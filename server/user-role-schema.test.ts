import { describe, expect, it } from "vitest";
import {
  buildUserRoleEnumRepairSql,
  userRoleColumnSupportsSuperAdmin,
} from "./db";

describe("user role schema compatibility", () => {
  it("detects legacy role enums that cannot store Super Admin users", () => {
    expect(userRoleColumnSupportsSuperAdmin("enum('user','admin')")).toBe(false);
    expect(userRoleColumnSupportsSuperAdmin(null)).toBe(false);
  });

  it("detects role enums that already support Super Admin users", () => {
    expect(userRoleColumnSupportsSuperAdmin("enum('user','admin','super_admin')")).toBe(true);
    expect(userRoleColumnSupportsSuperAdmin("ENUM('user','admin','super_admin')")).toBe(true);
  });

  it("builds the non-destructive role enum repair statement", () => {
    expect(buildUserRoleEnumRepairSql()).toBe(
      "ALTER TABLE `users` MODIFY COLUMN `role` ENUM('user','admin','super_admin') NOT NULL DEFAULT 'user'"
    );
  });
});
