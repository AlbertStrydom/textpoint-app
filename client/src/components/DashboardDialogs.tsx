import { lazy } from "react";
import { toast } from "sonner";

const LazyFormDialog = lazy(() =>
  import("@/components/FormDialog").then((module) => ({
    default: module.FormDialog,
  }))
);

interface DashboardUser {
  name?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
  role?: string | null;
  mustChangePassword?: boolean | null;
}

export interface DashboardDialogsProps {
  isProfileDialogOpen: boolean;
  setIsProfileDialogOpen: (open: boolean) => void;
  isPasswordDialogOpen: boolean;
  setIsPasswordDialogOpen: (open: boolean) => void;
  user: DashboardUser | null;
  updateProfileMutation: {
    mutateAsync: (data: any) => Promise<unknown>;
    isPending: boolean;
  };
  changePasswordMutation: {
    mutateAsync: (data: any) => Promise<unknown>;
    isPending: boolean;
  };
  passwordStatus: { hasPassword: boolean } | undefined;
  mustChangePassword: boolean;
  utils: {
    auth: {
      me: {
        setData: (key: undefined, data: any) => void;
        invalidate: () => Promise<unknown>;
      };
      passwordStatus: {
        invalidate: () => Promise<unknown>;
      };
    };
  };
  getSaveErrorMessage: (error: unknown, fallback: string) => string;
}

export function DashboardDialogs({
  isProfileDialogOpen,
  setIsProfileDialogOpen,
  isPasswordDialogOpen,
  setIsPasswordDialogOpen,
  user,
  updateProfileMutation,
  changePasswordMutation,
  passwordStatus,
  mustChangePassword,
  utils,
  getSaveErrorMessage,
}: DashboardDialogsProps) {
  return (
    <>
      <LazyFormDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
        title="Edit Profile"
        description="Update your display name and profile picture."
        fields={[
          { name: "name", label: "Display Name", type: "text", required: true },
          {
            name: "avatarUrl",
            label: "Profile Picture",
            type: "file",
            accept: "image/*",
            imageMaxWidth: 192,
            imageMaxHeight: 192,
            maxDataUrlLength: 60000,
          },
        ]}
        initialValues={{
          name: user?.name ?? "",
          avatarUrl: user?.avatarUrl ?? "",
        }}
        onSubmit={async (values) => {
          try {
            const avatarUrl = String(values.avatarUrl ?? "").trim();
            const avatarChanged = avatarUrl !== (user?.avatarUrl ?? "");
            const updatePayload: {
              name: string;
              avatarUrl?: string | null;
            } = {
              name: String(values.name ?? "").trim(),
            };

            if (avatarChanged) {
              updatePayload.avatarUrl = avatarUrl || null;
            }

            const updatedUser = await updateProfileMutation.mutateAsync(updatePayload);
            utils.auth.me.setData(undefined, updatedUser);
            await utils.auth.me.invalidate().catch(() => {
              toast.warning("Profile saved, but the live profile refresh failed. Refresh the page if the new picture is not visible yet.");
            });
            setIsProfileDialogOpen(false);
            toast.success("Profile updated");
          } catch (error) {
            toast.error(getSaveErrorMessage(error, "Failed to update profile"));
            throw error;
          }
        }}
        isLoading={updateProfileMutation.isPending}
        submitLabel="Save Profile"
      />

      <LazyFormDialog
        open={isPasswordDialogOpen}
        onOpenChange={(open) => {
          if (mustChangePassword) {
            if (open) {
              setIsPasswordDialogOpen(true);
            }
            return;
          }
          setIsPasswordDialogOpen(open);
        }}
        title={mustChangePassword ? "Change Temporary Password" : "Change Password"}
        description={
          mustChangePassword
            ? "Your temporary password must be changed before you can continue. Use the password you were given, then choose a new one."
            : passwordStatus?.hasPassword
              ? "Update your current password."
              : "Set your first password for local sign-in. You can leave the current password blank."
        }
        fields={[
          {
            name: "currentPassword",
            label: mustChangePassword ? "Temporary Password" : "Current Password",
            type: "password",
            required: mustChangePassword,
            placeholder: mustChangePassword
              ? "Enter the temporary password you were given"
              : passwordStatus?.hasPassword
                ? "Enter current password"
                : "Leave blank if none has been set",
          },
          { name: "newPassword", label: "New Password", type: "password", required: true, placeholder: "Minimum 8 characters" },
          { name: "confirmPassword", label: "Confirm Password", type: "password", required: true, placeholder: "Repeat the new password" },
        ]}
        initialValues={{ currentPassword: "", newPassword: "", confirmPassword: "" }}
        onSubmit={async (values) => {
          const newPassword = String(values.newPassword ?? "").trim();
          const confirmPassword = String(values.confirmPassword ?? "").trim();

          if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters long.");
            return;
          }

          if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
          }

          await changePasswordMutation.mutateAsync({
            currentPassword: String(values.currentPassword ?? "").trim() || "",
            newPassword,
          });
          utils.auth.me.setData(undefined, (current: unknown) =>
            current ? { ...(current as Record<string, unknown>), mustChangePassword: false } : current
          );
          await utils.auth.me.invalidate();
          setIsPasswordDialogOpen(false);
          await utils.auth.passwordStatus.invalidate();
          toast.success(
            mustChangePassword
              ? "Password changed. You can continue into the portal now."
              : passwordStatus?.hasPassword
                ? "Password updated"
                : "Password set"
          );
        }}
        isLoading={changePasswordMutation.isPending}
        submitLabel={mustChangePassword ? "Change Password" : "Save Password"}
        hideCancelButton={mustChangePassword}
        showCloseButton={!mustChangePassword}
        preventDismiss={mustChangePassword}
      />
    </>
  );
}
