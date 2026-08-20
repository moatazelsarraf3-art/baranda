import { useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet, TextInput, Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import Svg, { Path } from "react-native-svg";
import { useLanguage } from "../../lib/hooks/useLanguage";
import { useSubmitReport, ReportTargetType } from "../../lib/hooks/useReports";
import { showToast } from "./Toast";

type Props = {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle: string;
  // ↔ the long-press "الإبلاغ عن المحتوى" flow from a reel/live/request
  // card in a feed — reason only, no link attached or required, per the
  // product requirement that distinguishes it from the full report flow
  // reachable from the content's own detail screen (which always attaches
  // its link and requires a copy of it).
  quickMode?: boolean;
};

const REASONS = ["محتوى مخالف", "معلومات مضللة أو غير صحيحة", "محاولة احتيال", "محتوى غير لائق", "سبب آخر"];

function linkFor(targetType: ReportTargetType, targetId: string): string {
  if (targetType === "property") return `https://diarino.app/property/${targetId}`;
  if (targetType === "request") return `https://diarino.app/requests?id=${targetId}`;
  return `https://diarino.app/live/replay/${targetId}`;
}

// ↔ the report entry point that was missing everywhere until now — the
// public.reports table + admin support center existed since
// 20260802000000_notifications_backend.sql / 20260815000000_support_center.sql,
// but nothing could actually create a row in it. In full mode the
// content's link is mandatory and gets copied into the submitted reason
// alongside the person's own text; in quickMode (long-press) it's skipped
// entirely — reason only, nothing else attached.
export function ReportModal({ visible, onClose, targetType, targetId, targetTitle, quickMode = false }: Props) {
  const { t } = useLanguage();
  const [reason, setReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [copied, setCopied] = useState(false);
  const submitReport = useSubmitReport();
  if (!visible) return null;

  const link = linkFor(targetType, targetId);

  const finalReason = reason === "سبب آخر" ? customReason.trim() : reason;

  async function copyLink() {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    showToast(t("✓ تم نسخ الرابط"));
  }

  async function submit() {
    if (!finalReason) return;
    // ↔ "مع ارسال نسخ لينك الشيء الذى يتم الابلاغ عنه اجباري" — the
    // reports table has no dedicated link column, so in full mode the
    // link rides along inside the submitted reason text itself, making
    // it something that's actually sent to the admin, not just shown.
    const submittedReason = quickMode ? finalReason : `${finalReason}\n\nرابط المحتوى: ${link}`;
    try {
      await submitReport.mutateAsync({ targetType, targetId, targetTitle, reason: submittedReason });
      onClose();
      setReason(null);
      setCustomReason("");
      setCopied(false);
      Alert.alert(t("تم الإرسال"), t("شكرًا، تم استلام بلاغك وسيتم مراجعته."));
    } catch (err) {
      Alert.alert(t("حدث خطأ"), t("تعذر إرسال البلاغ، حاول مرة أخرى."));
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{t("الإبلاغ عن هذا المحتوى")}</Text>

        <View style={{ gap: 8, marginTop: 12 }}>
          {REASONS.map((r) => (
            <Pressable key={r} style={[styles.reasonRow, reason === r && styles.reasonRowActive]} onPress={() => setReason(r)}>
              <View style={[styles.radio, reason === r && styles.radioActive]} />
              <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>{t(r)}</Text>
            </Pressable>
          ))}
        </View>

        {reason === "سبب آخر" && (
          <TextInput
            style={styles.input}
            placeholder={t("اكتب السبب باختصار")}
            placeholderTextColor="#9ca3af"
            value={customReason}
            onChangeText={setCustomReason}
            multiline
            maxLength={300}
          />
        )}

        {!quickMode && (
          <Pressable style={[styles.linkNote, copied && styles.linkNoteCopied]} onPress={copyLink}>
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={copied ? "#22A652" : "#6b7280"} strokeWidth={2}>
              <Path d="M10 13a5 5 0 007.5.5l2-2a5 5 0 00-7-7l-1 1" /><Path d="M14 11a5 5 0 00-7.5-.5l-2 2a5 5 0 007 7l1-1" />
            </Svg>
            <Text style={[styles.linkNoteText, copied && styles.linkNoteTextCopied]} numberOfLines={1}>{link}</Text>
            <Text style={[styles.copyHint, copied && styles.linkNoteTextCopied]}>{copied ? t("تم النسخ") : t("نسخ")}</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.submitBtn, (!finalReason || (!quickMode && !copied)) && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={!finalReason || (!quickMode && !copied) || submitReport.isPending}
        >
          <Text style={styles.submitBtnText}>{submitReport.isPending ? t("جاري الإرسال...") : t("إرسال البلاغ")}</Text>
        </Pressable>
        {!quickMode && !copied && (
          <Text style={styles.copyRequiredHint}>{t("انسخ رابط المحتوى أولًا لإرسال البلاغ")}</Text>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb", alignSelf: "center", marginBottom: 14 },
  title: { fontSize: 15, fontWeight: "900", color: "#111827", textAlign: "center" },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#f9fafb" },
  reasonRowActive: { backgroundColor: "#FEF2F2" },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#d1d5db" },
  radioActive: { borderColor: "#991B1B", backgroundColor: "#991B1B" },
  reasonText: { fontSize: 12.5, fontWeight: "700", color: "#374151" },
  reasonTextActive: { color: "#991B1B", fontWeight: "900" },
  input: { marginTop: 10, minHeight: 60, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10, fontSize: 12.5, textAlignVertical: "top" },
  linkNote: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, backgroundColor: "#f9fafb", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  linkNoteCopied: { backgroundColor: "#ecfdf5", borderColor: "#22A652" },
  linkNoteText: { flex: 1, fontSize: 10.5, color: "#6b7280" },
  linkNoteTextCopied: { color: "#22A652" },
  copyHint: { fontSize: 10.5, fontWeight: "900", color: "#6b7280" },
  copyRequiredHint: { textAlign: "center", fontSize: 10.5, color: "#9ca3af", marginTop: 6 },
  submitBtn: { marginTop: 16, backgroundColor: "#991B1B", borderRadius: 999, paddingVertical: 13, alignItems: "center" },
  submitBtnDisabled: { backgroundColor: "#d1d5db" },
  submitBtnText: { color: "white", fontWeight: "900", fontSize: 13 },
});
