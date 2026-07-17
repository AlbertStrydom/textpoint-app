import { lazy, type ComponentType, type LazyExoticComponent } from "react";

type PageModule = {
  default: ComponentType<Record<string, never>>;
};

type RouteLoader = () => Promise<PageModule>;

export type AppRoute = {
  path: string;
  component: LazyExoticComponent<ComponentType<Record<string, never>>>;
};

const routeLoaders = {
  "/": () => import("./pages/Home"),
  "/students": () => import("./pages/StudentsPage"),
  "/leads": () => import("./pages/LeadsPage"),
  "/companies": () => import("./pages/CompaniesPage"),
  "/courses": () => import("./pages/CoursesPage"),
  "/schedules": () => import("./pages/CourseSchedulesPage"),
  "/enrollments": () => import("./pages/EnrollmentsPage"),
  "/attendance": () => import("./pages/AttendancePage"),
  "/equipment": () => import("./pages/EquipmentPage"),
  "/specimens": () => import("./pages/SpecimensPage"),
  "/kpi": () => import("./pages/KPIPage"),
  "/lecturers": () => import("./pages/LecturerPage"),
  "/training": () => import("./pages/TrainingPage"),
  "/level-ii": () => import("./pages/LevelIIPage"),
  "/level-iii": () => import("./pages/LevelIIIPage"),
  "/client-portal": () => import("./pages/ClientPortalPage"),
  "/client-portal/:rest*": () => import("./pages/ClientPortalPage"),
  "/planner": () => import("./pages/PlannerPage"),
  "/quality": () => import("./pages/QualityPage"),
  "/reports": () => import("./pages/ReportsPage"),
  "/documents": () => import("./pages/DocumentsPage"),
  "/admin": () => import("./pages/AdminPage"),
  "/login": () => import("./pages/LoginPage"),
  "/client-login": () => import("./pages/LoginPage"),
  "/client-login/:rest*": () => import("./pages/LoginPage"),
  "/forgot-password": () => import("./pages/ForgotPasswordPage"),
  "/reset-password": () => import("./pages/ResetPasswordPage"),
  "/login-not-configured": () => import("./pages/LoginNotConfigured"),
  "/404": () => import("./pages/NotFound"),
  ...(import.meta.env.DEV
    ? {
        "/components": () => import("./pages/ComponentShowcase"),
      }
    : {}),
} satisfies Record<string, RouteLoader>;

const isDevelopment = import.meta.env.DEV;
const preloadedRoutes = new Set<string>();

function createLazyRoute(path: keyof typeof routeLoaders) {
  const loader = routeLoaders[path];
  if (!loader) {
    throw new Error(`Route loader not found for ${path}`);
  }

  return lazy(loader);
}

export const appRoutes: AppRoute[] = [
  { path: "/", component: createLazyRoute("/") },
  { path: "/students", component: createLazyRoute("/students") },
  { path: "/leads", component: createLazyRoute("/leads") },
  { path: "/companies", component: createLazyRoute("/companies") },
  { path: "/courses", component: createLazyRoute("/courses") },
  { path: "/schedules", component: createLazyRoute("/schedules") },
  { path: "/enrollments", component: createLazyRoute("/enrollments") },
  { path: "/attendance", component: createLazyRoute("/attendance") },
  { path: "/equipment", component: createLazyRoute("/equipment") },
  { path: "/specimens", component: createLazyRoute("/specimens") },
  { path: "/kpi", component: createLazyRoute("/kpi") },
  { path: "/lecturers", component: createLazyRoute("/lecturers") },
  { path: "/training", component: createLazyRoute("/training") },
  { path: "/level-ii", component: createLazyRoute("/level-ii") },
  { path: "/level-iii", component: createLazyRoute("/level-iii") },
  { path: "/client-portal", component: createLazyRoute("/client-portal") },
  {
    path: "/client-portal/:rest*",
    component: createLazyRoute("/client-portal/:rest*"),
  },
  { path: "/planner", component: createLazyRoute("/planner") },
  { path: "/quality", component: createLazyRoute("/quality") },
  { path: "/reports", component: createLazyRoute("/reports") },
  { path: "/documents", component: createLazyRoute("/documents") },
  { path: "/admin", component: createLazyRoute("/admin") },
  { path: "/login", component: createLazyRoute("/login") },
  { path: "/client-login", component: createLazyRoute("/client-login") },
  {
    path: "/client-login/:rest*",
    component: createLazyRoute("/client-login/:rest*"),
  },
  { path: "/forgot-password", component: createLazyRoute("/forgot-password") },
  { path: "/reset-password", component: createLazyRoute("/reset-password") },
  {
    path: "/login-not-configured",
    component: createLazyRoute("/login-not-configured"),
  },
  { path: "/404", component: createLazyRoute("/404") },
];

if (isDevelopment) {
  appRoutes.splice(8, 0, {
    path: "/components",
    component: createLazyRoute("/components"),
  });
}

export const NotFoundRoute = createLazyRoute("/404");

export function preloadRouteModule(path: string) {
  const loader = routeLoaders[path as keyof typeof routeLoaders];
  if (!loader || preloadedRoutes.has(path)) {
    return;
  }

  preloadedRoutes.add(path);
  void loader().catch(() => {
    preloadedRoutes.delete(path);
  });
}
