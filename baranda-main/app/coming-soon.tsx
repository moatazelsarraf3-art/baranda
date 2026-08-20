import { router, useLocalSearchParams } from "expo-router";
import { useLanguage } from "../lib/hooks/useLanguage";
import { View, Text, Pressable, StyleSheet } from "react-native";

// Both "انشر عقارك" (publish a listing) and "اطلب عقارك" (post a request)
// are full multi-step flows in app-viewer.html — media upload, per-track
// music preview, I18N'd validation, draft/publish states. That's a
// substantial feature on the same scale as live streaming or chat were,
// so rather than half-build it inline here, this is an explicit "not yet"
// screen instead of a silently-broken button.
export default function ComingSoonScreen() {
  const { title } = useLocalSearchParams<{ title?: string }>();
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title ? t(title) : "قريبًا"}</Text>
      <Text style={styles.subtitle}>{t("هذه الميزة قيد التطوير حاليًا")}</Text>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>{t("رجوع")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  title: { fontSize: 16, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 13, color: "#9ca3af" },
  backBtn: { marginTop: 10, backgroundColor: "#22A652", borderRadius: 999, paddingVertical: 10, paddingHorizontal: 24 },
  backBtnText: { color: "white", fontWeight: "900" },
});
