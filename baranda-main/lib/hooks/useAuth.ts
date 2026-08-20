import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../supabase";
import { queryClient } from "../queryClient";
import { resetAdminDB } from "./useAdminDB";
import { clearCompareSelection } from "./useCompareSelection";

const SKIP_KEY = "diarino:skip_auth"; // must match app/index.tsx

WebBrowser.maybeCompleteAuthSession();

// ↔ translateOAuthError() — same error-message mapping, ported as-is.
export function translateOAuthError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("popup") && m.includes("closed")) return "تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.";
  if (m.includes("popup") && m.includes("block")) return "المتصفح منع النافذة المنبثقة. فعّل النوافذ لهذا الموقع وحاول مجدداً.";
  if (m.includes("unsupported provider") || m.includes("provider is not enabled"))
    return "مزوّد Google غير مفعّل في الخلفية. راجع إعدادات OAuth.";
  if (m.includes("redirect") && (m.includes("uri") || m.includes("mismatch")))
    return "عنوان إعادة التوجيه غير مطابق للمُسجَّل في Google Cloud.";
  if (m.includes("invalid_client") || m.includes("client_id"))
    return "بيانات اعتماد Google غير صحيحة (Client ID/Secret). حدّثها من صفحة الإعدادات.";
  if (m.includes("access_denied") || m.includes("denied")) return "تم رفض الإذن من قِبل المستخدم أو من قِبل Google.";
  if (m.includes("network") || m.includes("fetch")) return "تعذر الاتصال بالخادم. تحقق من الإنترنت.";
  if (m.includes("timeout") || m.includes("timed out")) return "انتهت مهلة الاتصال. حاول مرة أخرى.";
  if (m.includes("expired")) return "انقضت صلاحية الجلسة/الرمز. أعد المحاولة.";
  return raw || "تعذر تسجيل الدخول. حاول مرة أخرى.";
}

// ↔ signInGoogle() — the web version used @lovable.dev/cloud-auth-js's
// signInWithOAuth (window.location redirect, browser-only). Native
// equivalent: Supabase's own signInWithOAuth to get the provider URL, open
// it in an in-app browser tab (expo-web-browser), then extract the tokens
// from the redirect and hand them to supabase.auth.setSession() — this is
// the currently-documented pattern for Supabase + Expo (no extra native
// Google SDK/module needed, works in a dev client build).
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: "diarino", path: "auth-callback" });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectUri, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    return { error: translateOAuthError(error?.message || "") };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
  if (result.type !== "success" || !result.url) {
    // User closed the browser tab, or it timed out — not necessarily an
    // "error" worth alarming over, but the caller still needs to know
    // sign-in didn't complete.
    return { error: result.type === "cancel" ? null : "تعذر تسجيل الدخول. حاول مرة أخرى." };
  }

  const url = new URL(result.url);
  const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  const access_token = url.searchParams.get("access_token") || hashParams.get("access_token");
  const refresh_token = url.searchParams.get("refresh_token") || hashParams.get("refresh_token");

  if (!access_token || !refresh_token) {
    const errDesc = url.searchParams.get("error_description") || hashParams.get("error_description");
    return { error: translateOAuthError(errDesc || "") };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
  if (sessionError) return { error: translateOAuthError(sessionError.message) };

  // ↔ powers the admin "سجل نشاط المستخدمين" (user activity log) tab.
  // Logged here specifically (not via a global onAuthStateChange
  // listener) so it fires exactly once per real sign-in, not again on
  // every app restart when a persisted session is simply restored.
  const uid = sessionData?.session?.user?.id;
  if (uid) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
    supabase.from("user_activity_log").insert({
      user_id: uid, user_name: profile?.full_name ?? null, activity_type: "login",
    }).then(({ error }) => {
      if (error) console.warn("Failed to log login activity:", error);
    });
  }

  return { error: null };
}

// ↔ handleSkip() — "continue as guest". Every table's RLS select policy is
// scoped `to authenticated` (see supabase/migrations/*_create_*_table.sql),
// so without a real Supabase session a guest's reads are silently blocked
// by RLS — reels, search, menu, everything would render empty. This uses
// Supabase's anonymous auth so "guest" still gets a real authenticated
// session (with its own random uid) that RLS accepts, instead of just a
// local flag that never talks to Supabase at all.
// NOTE: requires "Allow anonymous sign-ins" enabled in the Supabase
// project's Auth settings — without it this call returns an error.
export async function signInAsGuest(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) return { error: translateOAuthError(error.message) };
  return { error: null };
}

// ↔ fullSignOut() — also clears the guest-skip flag, otherwise logging out
// while previously in guest mode would just bounce straight back into the
// tabs via the skip check in app/index.tsx instead of showing the login screen.
//
// ↔ React Query / data-security audit finding: this used to sign out of
// Supabase and stop there, leaving every cached query (chats, favorites,
// notifications, drafts, and — most sensitive — the admin dashboard's
// module-level store in useAdminDB.ts) sitting resident in memory. Most
// per-user React Query caches are already keyed by user.id so a
// *different* signed-in user wouldn't literally see the wrong data under
// their own queries, but there's no good reason to leave any of it
// around regardless — clearing everything here is simpler and safer than
// trying to enumerate which specific caches are "sensitive enough" to
// bother clearing.
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
  }
  await AsyncStorage.removeItem(SKIP_KEY).catch(() => {});
  queryClient.clear();
  resetAdminDB();
  clearCompareSelection();
}
