import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data }) => {
        setUser(data.user ?? null);
        setLoading(false);
      })
      // ↔ React Query / data audit finding: this is the most-consumed
      // hook in the app (nearly every screen reads user/loading from it)
      // — without a .catch() here, a network failure on the initial
      // getUser() call left `loading` stuck at `true` forever for every
      // single consumer, since nothing else ever calls setLoading(false).
      // Falling back to user=null is the safe default: whatever went
      // wrong, treat the session as unknown/absent rather than hang.
      .catch((err) => {
        console.warn("Failed to fetch current user:", err);
        setUser(null);
        setLoading(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const displayName =
    (user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || user?.email || "مستخدم";

  return { user, displayName, loading };
}
