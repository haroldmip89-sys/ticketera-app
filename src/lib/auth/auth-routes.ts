export const SIGN_IN_PATH = "/sign-in";
export const SIGN_UP_PATH = "/sign-up";
export const RESET_PASSWORD_PATH = "/reset-password";
export const SSO_CALLBACK_PATH = "/sso-callback";
export const MY_TICKETS_PATH = "/my-tickets";
export const ORGANIZER_PATH = "/organizer";
export const ORGANIZER_ONBOARDING_PATH = "/organizer/onboarding";
export const ADMIN_PATH = "/admin";
export const DEFAULT_AFTER_AUTH_PATH = "/";
export const REDIRECT_URL_PARAM = "redirect_url";

const MAX_REDIRECT_LENGTH = 2048;
const CHECKOUT_PATH = /^\/events\/[^/]+\/checkout\/?$/;

function isSameOrChild(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** true si la ruta exige sesión. Recibe solo el pathname (sin query). */
export function isProtectedPath(pathname: string): boolean {
  return (
    isSameOrChild(pathname, MY_TICKETS_PATH) ||
    isSameOrChild(pathname, ORGANIZER_PATH) ||
    isSameOrChild(pathname, ADMIN_PATH) ||
    CHECKOUT_PATH.test(pathname)
  );
}

/** true para sign-in, sign-up y reset-password, exactos o con subruta. */
export function isAuthPath(pathname: string): boolean {
  return [SIGN_IN_PATH, SIGN_UP_PATH, RESET_PASSWORD_PATH].some((base) =>
    isSameOrChild(pathname, base),
  );
}

/** Devuelve una ruta interna segura (pathname + search + hash) o null. */
export function getSafeRedirectPath(
  value: string | string[] | null | undefined,
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || raw === "" || raw.length > MAX_REDIRECT_LENGTH) {
    return null;
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (/[\\\u0000-\u001F\u007F]/.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw, "http://localhost");
  } catch {
    return null;
  }
  if (url.origin !== "http://localhost") return null;
  if (isAuthPath(url.pathname) || url.pathname === SSO_CALLBACK_PATH) {
    return null;
  }
  return raw;
}

export function resolveAfterAuthPath(
  value: string | string[] | null | undefined,
): string {
  return getSafeRedirectPath(value) ?? DEFAULT_AFTER_AUTH_PATH;
}

/** "/sign-in" si returnTo no es seguro o es "/"; si no, con `redirect_url`. */
export function buildSignInHref(returnTo?: string | null): string {
  const safe = getSafeRedirectPath(returnTo);
  if (!safe || safe === "/") return SIGN_IN_PATH;
  return `${SIGN_IN_PATH}?${REDIRECT_URL_PARAM}=${encodeURIComponent(safe)}`;
}
