import { router } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useCompareSelection } from "../../lib/hooks/useCompareSelection";
import { useLanguage } from "../../lib/hooks/useLanguage";

// ↔ floats above the tab bar (rendered from app/(tabs)/_layout.tsx) any
// time at least one property is in the compare basket, on every tab —
// picking properties on the feed then switching to search to add more
// should feel like one continuous selection, not something that resets
// per screen.
export function CompareBar() {
  const { ids, count, max, clear } = useCompareSelection();
  const { t } = useLanguage();
  if (count === 0) return null;

  return (
    <View style={styles.bar} pointerEvents="box-none">
      <View style={styles.card}>
        <Pressable style={styles.clearBtn} onPress={clear} hitSlop={8}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2.2}>
            <Path d="M18 6L6 18M6 6l12 12" />
          </Svg>
        </Pressable>
        <Text style={styles.label}>{t("للمقارنة")} ({count}/{max})</Text>
        <Pressable style={styles.compareBtn} onPress={() => router.push(`/compare?ids=${ids.join(",")}`)}>
          <Text style={styles.compareBtnText}>{t("قارن الآن")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: "absolute", left: 0, right: 0, bottom: 100, alignItems: "center", zIndex: 60 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "white", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  clearBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, fontWeight: "800", color: "#111827" },
  compareBtn: { backgroundColor: "#22A652", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  compareBtnText: { color: "white", fontSize: 12.5, fontWeight: "900" },
});
