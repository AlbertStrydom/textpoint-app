import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  clearLoginIntent,
  getClientLoginUrl,
  getLoginIntent,
  getLoginUrl,
} from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { useNotifications } from "@/hooks/useNotifications";
import { trpc } from "@/lib/trpc";
import { preloadRouteModule } from "@/routes";
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  Gauge,
  Hammer,
  LayoutDashboard,
  LogOut,
  Moon,
  KeyRound,
  User,
  PanelLeft,
  Settings,
  Sun,
  Users2,
  Beaker,
  ChevronDown,
  Code2,
  GraduationCap,
  Search,
  TrendingUp,
  Shield,
  Cog,
  Award,
  ShieldAlert,
} from "lucide-react";
import { CSSProperties, Suspense, lazy, useEffect, useRef, useState, type ComponentType } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DashboardDialogs } from "@/components/DashboardDialogs";

const LazyNotificationCenter = lazy(() =>
  import("@/components/NotificationCenter").then((module) => ({
    default: module.NotificationCenter,
  }))
);

type MenuItem = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  path: string;
  module?: string;
};

const isDevelopment = import.meta.env.DEV;

const menuSections: { label: string; items: MenuItem[] }[] = [
  {
    label: "Overview",
    items: [{ icon: LayoutDashboard, label: "Dashboard", path: "/" }],
  },
  {
    label: "CRM",
    items: [
      { icon: Users2, label: "Students", path: "/students", module: "students" },
      { icon: TrendingUp, label: "Leads", path: "/leads", module: "leads" },
      { icon: Building2, label: "Companies", path: "/companies", module: "companies" },
    ],
  },
  {
    label: "Training",
    items: [
      { icon: BookOpen, label: "Courses", path: "/courses", module: "courses" },
      { icon: Calendar, label: "Schedules", path: "/schedules", module: "schedules" },
      { icon: ClipboardList, label: "Enrolments", path: "/enrollments", module: "enrollments" },
      { icon: Gauge, label: "Attendance", path: "/attendance", module: "attendance" },
      { icon: GraduationCap, label: "Lecturers", path: "/lecturers", module: "lecturers" },
      { icon: BookOpen, label: "Training", path: "/training", module: "training" },
      { icon: Award, label: "Level II", path: "/level-ii", module: "level_ii" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: Hammer, label: "Equipment", path: "/equipment", module: "equipment" },
      { icon: Beaker, label: "Specimens", path: "/specimens", module: "specimens" },
      { icon: FileText, label: "Documents", path: "/documents", module: "documents" },
      { icon: Shield, label: "Level III Services", path: "/level-iii", module: "level_iii" },
      { icon: Building2, label: "Client Portal", path: "/client-portal", module: "client_portal" },
    ],
  },
  {
    label: "Quality & Insight",
    items: [
      { icon: Gauge, label: "KPI", path: "/kpi", module: "kpi" },
      { icon: ShieldAlert, label: "Quality", path: "/quality", module: "quality" },
      { icon: Calendar, label: "Planner", path: "/planner", module: "planner" },
      { icon: BarChart3, label: "Reports", path: "/reports", module: "reports" },
    ],
  },
  {
    label: "Administration",
    items: [
      { icon: Settings, label: "Admin", path: "/admin", module: "admin" },
      { icon: Shield, label: "Admin Panel", path: "/admin", module: "admin" },
      { icon: Cog, label: "Super Admin", path: "/admin", module: "admin" },
      ...(isDevelopment
        ? [{ icon: Code2, label: "Samples", path: "/components", module: "admin" }]
        : []),
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const SIDEBAR_SECTION_STATE_KEY = "sidebar-section-state";
const DEFAULT_WIDTH = 300;
const MIN_WIDTH = 260;
const MAX_WIDTH = 480;
const DEFAULT_SECTION_EXPANSION: Record<string, boolean> = {
  Overview: true,
  CRM: true,
  Training: true,
  Operations: false,
  "Quality & Insight": false,
  Administration: false,
};

function getSaveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === "Failed to fetch") {
    return "Could not reach the app server. Please restart the dev server, refresh the page, and try again.";
  }

  return error instanceof Error ? error.message : fallback;
}

function NotificationCenterSlot() {
  return (
    <Suspense
      fallback={<div className="h-9 w-9 shrink-0 rounded-md border border-transparent" aria-hidden="true" />}
    >
      <LazyNotificationCenter />
    </Suspense>
  );
}

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
Access to this dashboard requires authentication. Sign in with your TextPoint account to continue, or use the Client Portal Login option if your company has been allocated portal access.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <Button
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
              size="lg"
              className="w-full shadow-lg hover:shadow-xl transition-all"
            >
              Internal Sign In
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = getClientLoginUrl();
              }}
              size="lg"
              className="w-full shadow-lg hover:shadow-xl transition-all"
            >
              Client Portal Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const isSystemAdmin = user?.role === "admin" || user?.role === "super_admin";
  useNotifications({
    enabled: Boolean(user),
    allowAdminChecks: isSystemAdmin,
  });
  const utils = trpc.useUtils();
  const { data: myAccess = [], isLoading: myAccessLoading } = trpc.access.myAccess.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: portalClients = [], isLoading: portalClientsLoading } = trpc.clientPortal.access.list.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [location, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(SIDEBAR_SECTION_STATE_KEY);
    if (!saved) {
      return DEFAULT_SECTION_EXPANSION;
    }

    try {
      return {
        ...DEFAULT_SECTION_EXPANSION,
        ...(JSON.parse(saved) as Record<string, boolean>),
      };
    } catch {
      return DEFAULT_SECTION_EXPANSION;
    }
  });
  const sidebarRef = useRef<HTMLDivElement>(null);
  const allMenuItems = menuSections.flatMap((section) => section.items);
  const activeMenuItem = allMenuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const updateProfileMutation = trpc.auth.updateProfile.useMutation();
  const { data: passwordStatus } = trpc.auth.passwordStatus.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const changePasswordMutation = trpc.auth.changePassword.useMutation();

  const accessMap = new Map(myAccess.map((entry) => [entry.module, entry]));
  const hasPortalAccess = portalClients.length > 0;
  const mustChangePassword = Boolean(user?.mustChangePassword);
  const internalModuleViewCount = myAccess.filter(
    (entry) => entry.module !== "client_portal" && entry.canView
  ).length;
  const clientLoginIntent = getLoginIntent() === "client";
  const portalOnlyUser =
    user?.role === "user" && hasPortalAccess && internalModuleViewCount === 0;
  const clientPortalSession =
    user?.role === "user" &&
    hasPortalAccess &&
    (portalOnlyUser || clientLoginIntent);
  const waitingForPortalRouting =
    Boolean(user) &&
    user?.role === "user" &&
    clientLoginIntent &&
    (myAccessLoading || portalClientsLoading);
  const canAccessItem = (item: MenuItem) => {
    if (clientPortalSession) {
      return item.module === "client_portal";
    }
    if (!item.module) return true;
    if (isSystemAdmin) return true;
    if (item.module === "client_portal" && hasPortalAccess) return true;
    return accessMap.get(item.module)?.canView ?? false;
  };

  const visibleMenuSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter(canAccessItem),
    }))
    .filter((section) => section.items.length > 0);
  const activeSectionLabel =
    visibleMenuSections.find((section) => section.items.some((item) => item.path === location))
      ?.label || "";
  const filteredMenuSections = visibleMenuSections
    .map((section) => ({
      ...section,
      items: navQuery.trim()
        ? section.items.filter((item) =>
            item.label.toLowerCase().includes(navQuery.trim().toLowerCase())
          )
        : section.items,
    }))
    .filter((section) => section.items.length > 0);
  const canAccessActiveRoute = activeMenuItem ? canAccessItem(activeMenuItem) : true;

  const handlePrepareRoute = (path: string) => {
    preloadRouteModule(path);
  };

  const handleNavigate = (path: string) => {
    preloadRouteModule(path);
    if (path !== "/client-portal" && path !== "/client-login") {
      clearLoginIntent();
    }
    setLocation(path);
  };

  useEffect(() => {
    if (isSystemAdmin && clientLoginIntent) {
      clearLoginIntent();
      return;
    }
    if (!clientLoginIntent) return;
    if (portalClientsLoading) return;
    if (!hasPortalAccess) {
      clearLoginIntent();
    }
  }, [clientLoginIntent, hasPortalAccess, isSystemAdmin, portalClientsLoading]);

  useEffect(() => {
    if (!clientPortalSession) return;
    if (location === "/client-portal") return;
    setLocation("/client-portal");
  }, [clientPortalSession, location, setLocation]);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_SECTION_STATE_KEY, JSON.stringify(expandedSections));
  }, [expandedSections]);

  useEffect(() => {
    if (!activeSectionLabel) {
      return;
    }

    setExpandedSections((current) =>
      current[activeSectionLabel] ? current : { ...current, [activeSectionLabel]: true }
    );
  }, [activeSectionLabel]);

  useEffect(() => {
    if (!mustChangePassword) return;
    setIsPasswordDialogOpen(true);
  }, [mustChangePassword]);

  if (waitingForPortalRouting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-xl border bg-card px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <div>
              <p className="font-medium">Opening client portal</p>
              <p className="text-sm text-muted-foreground">
                Loading your allocated Level III client access.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="border-b px-2 py-3">
            <div className="flex items-center gap-3 px-1 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="min-w-0">
                  <p className="font-semibold tracking-tight truncate">Workspace</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {activeSectionLabel || "Navigation"}
                  </p>
                </div>
              ) : null}
            </div>
            {!isCollapsed ? (
              <div className="px-1">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <SidebarInput
                    value={navQuery}
                    onChange={(event) => setNavQuery(event.target.value)}
                    placeholder="Quick find a page..."
                    className="h-9 rounded-lg border-sidebar-border/60 bg-sidebar-accent/10 pl-8"
                  />
                </div>
              </div>
            ) : null}
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">
            {isCollapsed ? (
              visibleMenuSections.map((section, sectionIndex) => (
                <SidebarGroup key={section.label} className="py-1">
                  <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="px-0 py-1">
                      {section.items.map((item) => {
                        const isActive = location === item.path;
                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              isActive={isActive}
                              onMouseEnter={() => handlePrepareRoute(item.path)}
                              onFocus={() => handlePrepareRoute(item.path)}
                              onClick={() => handleNavigate(item.path)}
                              tooltip={item.label}
                              className="min-h-10 h-auto items-start py-2 transition-all font-normal"
                            >
                              <item.icon
                                className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                              />
                              <span className="min-w-0 flex-1 whitespace-normal leading-snug">{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                  {sectionIndex < visibleMenuSections.length - 1 ? (
                    <SidebarSeparator className="mt-2" />
                  ) : null}
                </SidebarGroup>
              ))
            ) : filteredMenuSections.length === 0 ? (
              <div className="mx-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                No pages match <span className="font-medium text-foreground">{navQuery}</span>.
              </div>
            ) : (
              filteredMenuSections.map((section, sectionIndex) => {
                const isOpen = navQuery.trim()
                  ? true
                  : expandedSections[section.label] ?? DEFAULT_SECTION_EXPANSION[section.label] ?? true;

                return (
                  <SidebarGroup key={section.label} className="py-1">
                    <Collapsible
                      open={isOpen}
                      onOpenChange={(open) => {
                        if (navQuery.trim()) return;
                        setExpandedSections((current) => ({
                          ...current,
                          [section.label]: open,
                        }));
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <button className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="whitespace-normal text-xs font-semibold uppercase tracking-[0.18em] leading-snug">
                              {section.label}
                            </span>
                            <span className="rounded-full bg-sidebar-accent/60 px-2 py-0.5 text-[10px] font-medium text-sidebar-foreground/70">
                              {section.items.length}
                            </span>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarGroupContent>
                          <SidebarMenu className="px-0 py-1">
                            {section.items.map((item) => {
                              const isActive = location === item.path;
                              return (
                                <SidebarMenuItem key={item.path}>
                                  <SidebarMenuButton
                                    isActive={isActive}
                                    onMouseEnter={() => handlePrepareRoute(item.path)}
                                    onFocus={() => handlePrepareRoute(item.path)}
                                    onClick={() => handleNavigate(item.path)}
                                    tooltip={item.label}
                                    className="min-h-10 h-auto items-start py-2 transition-all font-normal"
                                  >
                                    <item.icon
                                      className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                                    />
                                    <span className="min-w-0 flex-1 whitespace-normal leading-snug">{item.label}</span>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </CollapsibleContent>
                    </Collapsible>
                    {sectionIndex < filteredMenuSections.length - 1 ? (
                      <SidebarSeparator className="mt-2" />
                    ) : null}
                  </SidebarGroup>
                );
              })
            )}
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.name ?? "User"} />
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setIsProfileDialogOpen(true)}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Edit profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsPasswordDialogOpen(true)}
                  className="cursor-pointer"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>Change password</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="cursor-pointer"
                >
                  {theme === "dark" ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenterSlot />
            </div>
          </div>
        )}
        <div className="border-b h-16 flex items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-9 w-9 rounded-lg" />
            <span className="text-sm font-medium text-muted-foreground">
              {activeMenuItem?.label ?? "Dashboard"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenterSlot />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </Button>
          </div>
        </div>
        <main className="flex-1 p-4">
          {canAccessActiveRoute ? (
            children
          ) : (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="max-w-md text-center space-y-2">
                <h2 className="text-2xl font-semibold">Access Restricted</h2>
                <p className="text-muted-foreground">
                  Your profile does not currently have permission to view this page.
                </p>
              </div>
            </div>
          )}
        </main>
      </SidebarInset>

      <Suspense fallback={null}>
        <DashboardDialogs
          isProfileDialogOpen={isProfileDialogOpen}
          setIsProfileDialogOpen={setIsProfileDialogOpen}
          isPasswordDialogOpen={isPasswordDialogOpen}
          setIsPasswordDialogOpen={setIsPasswordDialogOpen}
          user={user}
          updateProfileMutation={updateProfileMutation}
          changePasswordMutation={changePasswordMutation}
          passwordStatus={passwordStatus}
          mustChangePassword={mustChangePassword}
          utils={utils}
          getSaveErrorMessage={getSaveErrorMessage}
        />
      </Suspense>
    </>
  );
}
