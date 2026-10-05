// Public surface of the identity module. Other modules import ONLY from here.
export { can, isStaff, homeFor, type Access, type CompanyAccess } from "./rbac";
export { getSession, setSessionCookie, clearSessionCookie, readSessionToken, SESSION_COOKIE } from "./session";
export { requireUser, requireBuyer, requireSupplier, requireStaff } from "./guards";
export { requestOtp, verifyOtp, createSession, destroySession, sessionFromToken, type CurrentSession } from "./service";
export { googleEnabled, googleAuthUrl, completeGoogleLogin } from "./google";
export { emailSchema, codeSchema, intentSchema, purposeSchema, type Intent, type OtpPurpose } from "./schemas";
