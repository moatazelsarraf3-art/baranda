import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ↔ powers "العرض: فاتح / داكن / إعدادات الجهاز" in the account settings
// menu. This ships the real, persisted PREFERENCE plus the resolved
// light/dark value the rest of the app would need to actually re-skin —
// but re-theming every screen (all ~60 of them currently hardcode light
// colors directly in their StyleSheets) is a much larger follow-up than
// this hook itself. What's real here: the choice is saved, "device
// settings" genuinely tracks the OS's live appearance changes, and
// `resolvedTheme` is correct and ready for any screen to read.

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "diarino:theme";

interface ThemeSnapshot {
  preference: ThemePreference;
  systemScheme: "light" | "dark";
}

let preference: ThemePreference = "system";
let systemScheme: "light" | "dark" = Appearance.getColorScheme() === "dark" ? "dark" : "light";

// ↔ React Query / data audit finding: getSnapshot() must return a stable
// reference when nothing has actually changed — useSyncExternalStore
// compares snapshots with Object.is, and a getSnapshot that builds a new
// `{ preference, systemScheme }` object on every call looks "changed" on
// every single check even when the values are identical, which React
// flags as exactly the "getSnapshot should be cached" infinite-loop
// pattern. This cached object is only ever replaced (in emit(), below)
// when preference or systemScheme actually changes.
let snapshot: ThemeSnapshot = { preference, systemScheme };
const listeners = new Set<() => void>();

function emit() {
  snapshot = { preference, systemScheme };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ThemeSnapshot {
  return snapshot;
}

AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
  if (saved === "light" || saved === "dark" || saved === "system") {
    preference = saved;
    emit();
  }
});

Appearance.addChangeListener(({ colorScheme }) => {
  systemScheme = colorScheme === "dark" ? "dark" : "light";
  emit();
});

export function useTheme() {
  const { preference: pref, systemScheme: sys } = useSyncExternalStore(subscribe, getSnapshot);
  const resolvedTheme: "light" | "dark" = pref === "system" ? sys : pref;

  function setPreference(next: ThemePreference) {
    preference = next;
    AsyncStorage.setItem(STORAGE_KEY, next);
    emit();
  }

  return { preference: pref, resolvedTheme, setPreference };
}