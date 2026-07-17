export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export type TextPointLoginIntent = "internal" | "client";

const LOGIN_INTENT_STORAGE_KEY = "textpoint-login-intent";

export const getLoginUrl = () => {
  return "/login";
};

export const getClientLoginUrl = () => {
  return "/client-login";
};

export const getLoginIntent = (): TextPointLoginIntent | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.sessionStorage.getItem(LOGIN_INTENT_STORAGE_KEY);
  return value === "client" || value === "internal" ? value : null;
};

export const setLoginIntent = (intent: TextPointLoginIntent) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(LOGIN_INTENT_STORAGE_KEY, intent);
};

export const clearLoginIntent = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(LOGIN_INTENT_STORAGE_KEY);
};
