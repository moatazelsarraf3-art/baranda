import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useLanguage } from "../../lib/hooks/useLanguage";
import { useContentSettings, ContentSettings } from "../../lib/hooks/useContentSettings";

type Props = { visible: boolean; onClose: () => void };

// ↔ 5 settings-menu items grouped into one screen: chat on/off for
// property details, chat on/off for requests, WhatsApp number visible/
// hidden, call button visible/hidden on property details, and per-
// category notification toggles (like/save/follow/chat) — each read/
// write public.profiles directly via lib/hooks/useContentSettings.ts.
export function ContentSettingsModal({ visible, onClose }: Props) {
  const { t } = useLanguage();
  const { settings, toggleSetting } = useContentSettings();
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.card}>
        <Text style={styles.title}>{t("إعدادات المحتوى والإشعارات")}</Text>
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.section}>{t("صفحة تفاصيل العقار")}</Text>
          <SettingRow label={t("السماح بالدردشة من صفحة تفاصيل العقار")} settingKey="chatOnProperties" settings={settings} onToggle={toggleSetting} />
          <SettingRow label={t("إظهار رقم الواتساب")} settingKey="showWhatsapp" settings={settings} onToggle={toggleSetting} />
          <SettingRow label={t("إظهار زر الاتصال")} settingKey="showCallButton" settings={settings} onToggle={toggleSetting} />

          <Text style={styles.section}>{t("صفحة الطلبات")}</Text>
          <SettingRow label={t("السماح بالدردشة من صفحة الطلبات")} settingKey="chatOnRequests" settings={settings} onToggle={toggleSetting} />

          <Text style={styles.section}>{t("الإشعارات")}</Text>
          <SettingRow label={t("إشعارات الإعجاب")} settingKey="notifyLikes" settings={settings} onToggle={toggleSetting} />
          <SettingRow label={t("إشعارات الحفظ")} settingKey="notifySaves" settings={settings} onToggle={toggleSetting} />
          <SettingRow label={t("إشعارات المتابعة")} settingKey="notifyFollows" settings={settings} onToggle={toggleSetting} />
          <SettingRow label={t("إشعارات الشات")} settingKey="notifyChat" settings={settings} onToggle={toggleSetting} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function SettingRow({
  label, settingKey, settings, onToggle,
}: { label: string; settingKey: keyof ContentSettings; settings: ContentSettings; onToggle: (k: keyof ContentSettings) => void }) {
  const on = settings[settingKey];
  return (
    <Pressable style={styles.row} onPress={() => onToggle(settingKey)}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.toggle, on && styles.toggleOn]}>
        <View style={[styles.toggleThumb, on && styles.toggleThumbOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute", top: 90, left: 16, right: 16,
    backgroundColor: "white", borderRadius: 16, padding: 18,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10,
    borderWidth: 1, borderColor: "#f3f4f6",
  },
  title: { fontSize: 14, fontWeight: "900", color: "#111827", textAlign: "center", marginBottom: 10 },
  section: { fontSize: 11, fontWeight: "900", color: "#9ca3af", marginTop: 12, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  rowLabel: { fontSize: 12.5, fontWeight: "700", color: "#374151", flex: 1, marginRight: 10 },
  toggle: { width: 36, height: 20, borderRadius: 999, backgroundColor: "#e5e7eb", padding: 2, justifyContent: "center" },
  toggleOn: { backgroundColor: "#22A652" },
  toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: "white", alignSelf: "flex-start" },
  toggleThumbOn: { alignSelf: "flex-end" },
});
