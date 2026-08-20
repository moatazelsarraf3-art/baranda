import { useState } from "react";
import { router } from "expo-router";
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { useLanguage } from "../lib/hooks/useLanguage";
import { useAccountPrivacy } from "../lib/hooks/useAccountPrivacy";
import { signOut } from "../lib/hooks/useAuth";
import { useLogSupportContact } from "../lib/hooks/useSupportMessages";
import { waLink } from "../lib/whatsapp";
import { openExternalUrl } from "../lib/linking";
import { ThemeSelectorModal } from "../components/account/ThemeSelectorModal";
import { ContentSettingsModal } from "../components/account/ContentSettingsModal";
import { ComplaintsSuggestionsModal } from "../components/account/ComplaintsSuggestionsModal";
import { ShareProfileModal } from "../components/account/ShareProfileModal";
import { ToastHost } from "../components/shared/Toast";

// New dedicated settings screen — reached from the menu page's "الإعدادات"
// card. Pulls together the app-level settings that used to live only in
// the AccountDropdown (language, theme, content & notification settings,
// account privacy, complaints, contact us, logout), so there's a proper
// standalone settings destination instead of a dropdown-only one. The
// account-menu icon that used to open AccountDropdown from every main page
// has been removed — this settings screen (via the menu page's dedicated
// card) is now the only entry point for these settings.
export default function SettingsScreen() {
  const { language, toggleLanguage, t } = useLanguage();
  const { isPublic, togglePrivacy } = useAccountPrivacy();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [contentSettingsVisible, setContentSettingsVisible] = useState(false);
  const [complaintsVisible, setComplaintsVisible] = useState(false);
  const [shareProfileVisible, setShareProfileVisible] = useState(false);
  const logSupportContact = useLogSupportContact();

  function confirmLogout() {
    Alert.alert(t("تسجيل الخروج"), t("هل تريد تسجيل الخروج من حسابك؟"), [
      { text: t("إلغاء"), style: "cancel" },
      {
        text: t("تسجيل خروج"),
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/");
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={8}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth={2}>
            <Path d="M18 6L6 18M6 6l12 12" />
          </Svg>
        </Pressable>
        <Text style={styles.headerTitle}>{t("الإعدادات")}</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Section title={t("عام")}>
          <Row icon={<GlobeIcon />} label={language === "ar" ? "English" : "العربية"} onPress={toggleLanguage} />
          <Row icon={<ThemeIcon />} label={t("العرض")} onPress={() => setThemeModalVisible(true)} />
          <Row
            icon={<BellIcon />}
            label={t("الإشعارات")}
            toggle={notificationsOn}
            onPress={() => setNotificationsOn((v) => !v)}
          />
          <Row
            icon={<SlidersIcon />}
            label={t("إعدادات المحتوى والإشعارات")}
            onPress={() => setContentSettingsVisible(true)}
          />
        </Section>

        <Section title={t("الحساب")}>
          <Row icon={<ShareIcon />} label={t("مشاركة البروفايل")} onPress={() => setShareProfileVisible(true)} />
          <Row icon={<BellIcon />} label={t("تنبيهاتي المحفوظة")} onPress={() => router.push("/saved-alerts")} />
        </Section>

        <Section title={t("الخصوصية")}>
          <Row icon={<LockIcon />} label={t("الحساب العام")} toggle={isPublic} onPress={togglePrivacy} />
        </Section>

        <Section title={t("الدعم")}>
          <Row
            icon={<MailIcon />}
            label={t("تواصل معنا")}
            onPress={() => {
              // ↔ logs into public.support_messages (20260815000000_support_center.sql)
              // so the admin support center's "التواصل معنا" tab shows who
              // asked for support and when, right before WhatsApp opens.
              logSupportContact.mutate();
              openExternalUrl(waLink("مرحباً"));
            }}
          />
          <Row icon={<FlagIcon />} label={t("الشكاوى والمقترحات")} onPress={() => setComplaintsVisible(true)} />
        </Section>

        <Section title="">
          <Row icon={<LogoutIcon />} label={t("تسجيل خروج")} danger onPress={confirmLogout} />
        </Section>
      </ScrollView>

      <ThemeSelectorModal visible={themeModalVisible} onClose={() => setThemeModalVisible(false)} />
      <ContentSettingsModal visible={contentSettingsVisible} onClose={() => setContentSettingsVisible(false)} />
      <ComplaintsSuggestionsModal visible={complaintsVisible} onClose={() => setComplaintsVisible(false)} />
      <ShareProfileModal visible={shareProfileVisible} onClose={() => setShareProfileVisible(false)} />
      <ToastHost />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      {!!title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Row({
  icon, label, onPress, toggle, danger,
}: {
  icon: React.ReactNode; label: string; onPress: () => void; toggle?: boolean; danger?: boolean;
}) {
  return (
    <Pressable style={styles.item} onPress={onPress}>
      {icon}
      <Text style={[styles.itemText, danger && styles.itemTextDanger]}>{label}</Text>
      {toggle !== undefined && (
        <View style={[styles.toggle, toggle && styles.toggleOn]}>
          <View style={[styles.toggleThumb, toggle && styles.toggleThumbOn]} />
        </View>
      )}
    </Pressable>
  );
}

const iconProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" as const, stroke: "#6b7280", strokeWidth: 2 };
function GlobeIcon() { return <Svg {...iconProps}><Circle cx={12} cy={12} r={10} /><Path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></Svg>; }
function ThemeIcon() { return <Svg {...iconProps}><Circle cx={12} cy={12} r={4} /><Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>; }
function LockIcon() { return <Svg {...iconProps}><Path d="M5 11h14v10H5z" /><Path d="M8 11V7a4 4 0 018 0v4" /></Svg>; }
function SlidersIcon() { return <Svg {...iconProps}><Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><Path d="M1 14h6M9 8h6M17 16h6" /></Svg>; }
function MailIcon() { return <Svg {...iconProps}><Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></Svg>; }
function FlagIcon() { return <Svg {...iconProps}><Path d="M4 22V4" /><Path d="M4 4h13l-2 4 2 4H4" /></Svg>; }
function BellIcon() { return <Svg {...iconProps}><Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" /></Svg>; }
function ShareIcon() { return <Svg {...iconProps}><Circle cx={18} cy={5} r={2.5} /><Circle cx={6} cy={12} r={2.5} /><Circle cx={18} cy={19} r={2.5} /><Path d="M8.3 10.7l7.4-4.4M8.3 13.3l7.4 4.4" /></Svg>; }
function LogoutIcon() { return <Svg {...iconProps} stroke="#991B1B"><Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><Path d="M16 17l5-5-5-5M21 12H9" /></Svg>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D6E3CF" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingTop: 54, paddingBottom: 14, backgroundColor: "#D6E3CF",
  },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  scroll: { padding: 14, paddingBottom: 110, gap: 16 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12.5, fontWeight: "900", color: "#374151", marginLeft: 4 },
  sectionCard: { backgroundColor: "white", borderRadius: 16, overflow: "hidden" },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  itemText: { fontSize: 13.5, fontWeight: "700", color: "#374151", flex: 1 },
  itemTextDanger: { color: "#991B1B" },
  toggle: { width: 36, height: 20, borderRadius: 999, backgroundColor: "#e5e7eb", padding: 2, justifyContent: "center" },
  toggleOn: { backgroundColor: "#22A652" },
  toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: "white", alignSelf: "flex-start" },
  toggleThumbOn: { alignSelf: "flex-end" },
});
