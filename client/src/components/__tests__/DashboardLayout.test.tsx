// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";

let mockUser: unknown = null;
let mockLoading = false;

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser, loading: mockLoading, logout: vi.fn() }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { setData: vi.fn(), invalidate: vi.fn() }, passwordStatus: { invalidate: vi.fn() } } }),
    access: { myAccess: { useQuery: () => ({ data: [], isLoading: false }) } },
    clientPortal: { access: { list: { useQuery: () => ({ data: [], isLoading: false }) } } },
    auth: {
      me: { useQuery: () => ({}) },
      passwordStatus: { useQuery: () => ({ data: { hasPassword: true } }) },
      updateProfile: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      changePassword: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
  },
}));

vi.mock("@/const", () => ({
  clearLoginIntent: vi.fn(),
  getClientLoginUrl: () => "/client-login",
  getLoginIntent: vi.fn(() => null),
  getLoginUrl: () => "/login",
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: vi.fn(),
}));

vi.mock("@/routes", () => ({
  preloadRouteModule: vi.fn(),
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: ReactNode }) => <>{children}</>,
  AvatarImage: (props: Record<string, unknown>) => <img {...props} />,
  AvatarFallback: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: { children: ReactNode }) => <>{children}</>,
  CollapsibleContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  CollapsibleTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/DashboardLayoutSkeleton", () => ({
  DashboardLayoutSkeleton: () => <div data-testid="skeleton" />,
}));

vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: { children: ReactNode }) => <nav>{children}</nav>,
  SidebarContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SidebarFooter: ({ children }: { children: ReactNode }) => <>{children}</>,
  SidebarGroup: ({ children }: { children: ReactNode }) => <>{children}</>,
  SidebarGroupContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SidebarGroupLabel: ({ children }: { children: ReactNode }) => <>{children}</>,
  SidebarHeader: ({ children }: { children: ReactNode }) => <>{children}</>,
  SidebarInput: (props: Record<string, unknown>) => <input {...props} />,
  SidebarInset: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  SidebarMenu: ({ children }: { children: ReactNode }) => <ul>{children}</ul>,
  SidebarMenuButton: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <li><button onClick={onClick}>{children}</button></li>
  ),
  SidebarMenuItem: ({ children }: { children: ReactNode }) => <li>{children}</li>,
  SidebarProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  SidebarSeparator: () => <hr />,
  SidebarTrigger: () => <button>Toggle</button>,
  useSidebar: () => ({ state: "expanded", toggleSidebar: vi.fn() }),
}));

import { DashboardLayout } from "../DashboardLayout";

describe("DashboardLayout", () => {
  beforeEach(() => {
    mockUser = null;
    mockLoading = false;
  });

  it("shows skeleton while loading", () => {
    mockLoading = true;
    render(<DashboardLayout><div>Content</div></DashboardLayout>);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("shows sign-in prompt when unauthenticated", () => {
    render(<DashboardLayout><div>Content</div></DashboardLayout>);
    expect(screen.getByText("Sign in to continue")).toBeInTheDocument();
    expect(screen.getByText("Internal Sign In")).toBeInTheDocument();
  });

  it("renders user name when authenticated", () => {
    mockUser = { id: 1, name: "Admin User", email: "admin@test.com", role: "admin", avatarUrl: null };
    render(<DashboardLayout><div>Content</div></DashboardLayout>);
    expect(screen.getAllByText("Admin User").length).toBeGreaterThanOrEqual(1);
  });

  it("renders email when authenticated", () => {
    mockUser = { id: 1, name: "Admin", email: "admin@test.com", role: "admin" };
    render(<DashboardLayout><div>Content</div></DashboardLayout>);
    expect(screen.getAllByText("admin@test.com").length).toBeGreaterThanOrEqual(1);
  });
});
