import { useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { isAuthSyncPaused } from "../lib/authSync";
import * as db from "../lib/db";
import { useStore } from "../store/useStore";

const INIT_TIMEOUT_MS = 8000;

/** Restore Supabase session and load app data on startup */
export function useAppInit() {
  const setReady = useStore((s) => s.setReady);
  const setSession = useStore((s) => s.setSession);
  const loadAllData = useStore((s) => s.loadAllData);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }

    let cancelled = false;

    const finishInit = () => {
      if (!cancelled) setReady(true);
    };

    const timeoutId = window.setTimeout(finishInit, INIT_TIMEOUT_MS);

    const init = async () => {
      try {
        const session = await db.fetchSessionProfile();
        if (cancelled) return;
        setSession(session);
        if (session) {
          void loadAllData().catch(() => undefined);
        }
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        window.clearTimeout(timeoutId);
        finishInit();
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (isAuthSyncPaused()) return;

      if (event === "SIGNED_OUT") {
        setSession(null);
        useStore.setState({
          branches: [],
          managers: [],
          students: [],
          attendance: [],
          dataLoading: false,
        });
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const profile = await db.fetchSessionProfile();
        setSession(profile);
        if (profile) {
          void loadAllData().catch(() => undefined);
        }
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [setReady, setSession, loadAllData]);
}
