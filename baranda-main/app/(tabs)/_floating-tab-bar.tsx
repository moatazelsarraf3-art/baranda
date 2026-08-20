import { View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useLanguage } from "../../lib/hooks/useLanguage";
import { RequestsIcon, MenuIcon as GridIcon, ReelsIcon, SearchSparkleIcon } from "./_tab-icons";

// ↔ the new floating bottom nav from the approved design: a dark pill
// holding three icons (طلبات / قائمة / رئيسية) plus a separate raised
// circular button for البحث, both floating above the screen content
// rather than docking to the bottom edge like the old full-width bar.
//
// This fully replaces the default <Tabs> tab bar via the `tabBar` prop,
// but only renders buttons for the four routes that belong in the bar —
// "account" is intentionally left out (its functions moved to the menu
// page's "إدارة الحساب" card) while its route file still works fine when
// reached via router.push, it's just not shown here.

export const BAR_ROUTES = ["requests", "menu", "index"] as const;
const ICON_COLOR = "#C9B896";
const ICON_COLOR_ACTIVE = "#F3E4BE";
const BAR_BG = "#26262A";

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isAr = language !== "en";

  function go(routeName: string) {
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;
    const isFocused = state.routes[state.index].name === routeName;
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  }

  const activeName = state.routes[state.index]?.name;

  return (
    // Icon order is pinned to the *app language*, not the device's RTL flag:
    //  - Arabic: بحث (right) ← رئيسية ← قائمة ← طلبات (left)
    //  - English: search (left) → home → menu → requests (right) — the
    //    mirror image, read left-to-right as the person asked.
    // `direction` locks physical layout regardless of I18nManager.isRTL
    // (which is forced true for Arabic and false for English — see
    // lib/hooks/useLanguage.ts) — "ltr" keeps the row exactly as authored
    // below, "rtl" flips it, so the two language cases end up mirrored on
    // purpose instead of both collapsing to the same physical layout.
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 14, direction: isAr ? "ltr" : "rtl" }]}>
      <View style={styles.pill}>
        <TabButton active={activeName === "requests"} onPress={() => go("requests")}>
          <RequestsIcon color={activeName === "requests" ? ICON_COLOR_ACTIVE : ICON_COLOR} size={22} />
        </TabButton>
        <TabButton active={activeName === "menu"} onPress={() => go("menu")}>
          <GridIcon color={activeName === "menu" ? ICON_COLOR_ACTIVE : ICON_COLOR} size={22} />
        </TabButton>
        <TabButton active={activeName === "index"} onPress={() => go("index")}>
          <ReelsIcon color={activeName === "index" ? ICON_COLOR_ACTIVE : ICON_COLOR} size={22} />
        </TabButton>
      </View>

      <Pressable style={styles.searchCircle} onPress={() => go("search")} hitSlop={8}>
        <SearchSparkleIcon color={activeName === "search" ? "#FFE9B0" : "#D9B76B"} size={22} />
      </Pressable>
    </View>
  );
}

function TabButton({ children, onPress }: { children: React.ReactNode; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tabBtn} onPress={onPress} hitSlop={8}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute", left: 16, right: 16,
    flexDirection: "row", alignItems: "flex-end", gap: 12,
  },
  pill: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-evenly",
    height: 60, borderRadius: 30, backgroundColor: BAR_BG,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  tabBtn: { flex: 1, alignItems: "center", justifyContent: "center", height: "100%" },
  searchCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: BAR_BG,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
});
