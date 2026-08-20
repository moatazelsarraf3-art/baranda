import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Video, ResizeMode } from "expo-av";
import Svg, { Path } from "react-native-svg";
import { useLiveReplayById } from "../../../lib/hooks/useMyContent";
import { useLanguage } from "../../../lib/hooks/useLanguage";
import { ReportModal } from "../../../components/shared/ReportModal";

// ↔ playSavedLive() in app-viewer.html — the difference here is there's a
// real file behind it (LiveKit Egress → Supabase Storage), not a mock.
export default function ReplayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: live } = useLiveReplayById(id);
  const { t } = useLanguage();
  const [reportVisible, setReportVisible] = useState(false);

  if (!live || !live.recordingUrl) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t("التسجيل غير متاح")}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{t("رجوع")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        source={{ uri: live.recordingUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls
        shouldPlay
        isLooping={false}
      />
      <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={8}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
          <Path d="M6 6l12 12M18 6L6 18" />
        </Svg>
      </Pressable>
      <Pressable style={styles.reportBtn} onPress={() => setReportVisible(true)} hitSlop={8}>
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
          <Path d="M4 22V4" /><Path d="M4 4h13l-2 4 2 4H4" />
        </Svg>
      </Pressable>
      <View style={styles.titleBar}>
        <Text style={styles.titleText} numberOfLines={1}>{t(live.title)}</Text>
      </View>

      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        targetType="live"
        targetId={live.id}
        targetTitle={live.title || "بث مباشر"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", gap: 16 },
  errorText: { color: "white", fontSize: 14, fontWeight: "800" },
  backBtn: { backgroundColor: "#22A652", borderRadius: 999, paddingVertical: 10, paddingHorizontal: 24 },
  backBtnText: { color: "white", fontWeight: "900" },
  closeBtn: { position: "absolute", top: 50, left: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  reportBtn: { position: "absolute", top: 50, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  titleBar: { position: "absolute", top: 50, left: 54, right: 54 },
  titleText: { color: "white", fontSize: 13, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
});
