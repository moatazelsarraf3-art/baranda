import { useState } from "react";
import { router, useLocalSearchParams, Link } from "expo-router";
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { usePropertyDetail } from "../../lib/hooks/useProperties";
import { fmtPrice, getReelMode } from "../../lib/types";
import { ReelBackground } from "../../components/reel/ReelBackground";
import { openOrCreateChat } from "../../lib/hooks/useChatsDB";
import { useCurrentUser } from "../../lib/hooks/useCurrentUser";
import { useLanguage } from "../../lib/hooks/useLanguage";
import { supabase } from "../../lib/supabase";
import { ReportModal } from "../../components/shared/ReportModal";
import { useSellerContentSettings } from "../../lib/hooks/useContentSettings";
import { openExternalUrl } from "../../lib/linking";
import { phoneToWaMeDigits } from "../../lib/phone";

// ↔ #screen-details in app-viewer.html. Kept the "fixed CTA bar outside the
// scroll container" fix from the web version — it's a separate sibling View
// here, not something that can accidentally end up inside the ScrollView.
export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { data: property, isLoading: propertyLoading } = usePropertyDetail(id);
  const { data: sellerSettings } = useSellerContentSettings(property?.seller?.id);
  const [activeTab, setActiveTab] = useState<"desc" | "amenities" | "plan">("desc");
  const [reportVisible, setReportVisible] = useState(false);

  // ↔ usePropertyDetail is a real per-id fetch now (not an instant lookup
  // into an already-loaded bulk list), so "still loading" needs to be
  // told apart from "genuinely doesn't exist" — otherwise a fresh
  // navigation to this screen would flash "هذا العقار لم يعد متاحًا"
  // for a moment before the real data arrives.
  if (propertyLoading) {
    return <View style={styles.notFound} />;
  }

  if (!property) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>{t("هذا العقار لم يعد متاحًا")}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{t("رجوع")}</Text>
        </Pressable>
      </View>
    );
  }

  const mode = getReelMode(property);

  function openWhatsapp() {
    // ↔ AUDIT FIX (الميزة الدولية لإدخال رقم الهاتف): property.seller.phone
    // بقى E.164 كامل دلوقتي (+201012345678 مثلًا) بعد ترحيل قاعدة البيانات —
    // wa.me محتاج أرقام دولية بدون علامة +، عكس الرابط القديم اللي كان بيرسل
    // رقم محلي بدون كود دولة أصلًا وده كان يخلي الرابط مش شغال صح لأي دولة.
    openExternalUrl(`https://wa.me/${phoneToWaMeDigits(property!.seller.phone)}?text=${encodeURIComponent(`مهتم بعقارك: ${property!.title}`)}`, t("تعذر فتح واتساب"));
    // Fire-and-forget: feeds the admin dashboard's "تحويلات واتساب" stat.
    // Not awaited — a failed increment shouldn't block/delay opening WhatsApp.
    supabase.rpc("increment_wa_clicks", { property_id: property!.id }).then(({ error }) => {
      if (error) console.warn("Failed to record WhatsApp click:", error);
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={styles.cover}>
          {mode === "none" ? (
            <ReelBackground index={0} type={property.type} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#111" }]} />
          )}
          <LinearGradient colors={["rgba(0,0,0,0.4)", "transparent"]} style={styles.coverTopFade} />
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
        </View>

        <View style={styles.content}>
          <View style={styles.row}>
            <View style={[styles.purposeTag, { backgroundColor: property.purpose === "sale" ? "#22A652" : "#F4673F" }]}>
              <Text style={styles.purposeTagText}>{property.purpose === "sale" ? t("للبيع") : t("للإيجار")}</Text>
            </View>
            <Text style={styles.typeText}>{t(property.type)}</Text>
          </View>

          <Text style={styles.title}>{t(property.title)}</Text>
          <Text style={styles.location}>📍 {t(property.location)}، {t(property.province)}</Text>
          <Text style={styles.price}>
            {fmtPrice(property.price)} ج.م {property.purpose === "rent" ? "/ شهر" : ""}
          </Text>

          <View style={styles.specsGrid}>
            {!!property.rooms && <Spec icon="🛏" label={`${property.rooms} غرف`} />}
            {!!property.baths && <Spec icon="🛁" label={`${property.baths} حمام`} />}
            {!!property.reception && <Spec icon="🛋" label={`${property.reception} ريسبشن`} />}
            <Spec icon="📐" label={`${property.area} م²`} />
          </View>

          <View style={styles.tabsRow}>
            <TabBtn
              active={activeTab === "desc"}
              label="الوصف"
              icon={<DescIcon active={activeTab === "desc"} />}
              onPress={() => setActiveTab("desc")}
            />
            <TabBtn
              active={activeTab === "amenities"}
              label="المرافق والكماليات"
              icon={<AmenitiesIcon active={activeTab === "amenities"} />}
              onPress={() => setActiveTab("amenities")}
            />
            <TabBtn
              active={activeTab === "plan"}
              label="المخطط"
              icon={<PlanIcon active={activeTab === "plan"} />}
              onPress={() => setActiveTab("plan")}
            />
          </View>

          <View style={styles.tabContent}>
            {activeTab === "desc" && (
              <Text style={styles.description}>
                {property.description ? t(property.description) : t("لا يوجد وصف مضاف لهذا العقار")}
              </Text>
            )}
            {activeTab === "amenities" && (
              property.features.length > 0 ? (
                <View style={styles.featuresRow}>
                  {property.features.map((f) => (
                    <View key={f} style={styles.featureChip}><Text style={styles.featureChipText}>{t(f)}</Text></View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyTabText}>{t("لا توجد مرافق أو كماليات مضافة لهذا العقار")}</Text>
              )
            )}
            {activeTab === "plan" && (
              // ↔ no floor-plan field exists on Property yet (no
              // migration/upload path for one) — an honest empty state
              // rather than a fake placeholder blueprint image.
              <Text style={styles.emptyTabText}>{t("لا يوجد مخطط متاح لهذا العقار حاليًا")}</Text>
            )}
          </View>

          <Link href={`/seller/${property.seller.id}`} asChild>
            <Pressable style={styles.sellerCard}>
              <View style={styles.sellerAvatar}><Text style={styles.sellerAvatarText}>{property.seller.initial}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={styles.sellerName}>{t(property.seller.name)}</Text>
                  {property.seller.verified && <Text style={{ color: "#22A652" }}>✓</Text>}
                </View>
                <Text style={styles.sellerMeta}>{property.seller.listings} إعلان · {property.seller.followers} متابع</Text>
              </View>
              <Text style={styles.sellerArrow}>‹</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>

      {/* ↔ the fixed CTA bar fix — lives outside the ScrollView on purpose */}
      <View style={styles.ctaBar}>
        {(sellerSettings?.chatOnProperties ?? true) && (
          <Pressable
            style={styles.chatBtn}
            onPress={async () => {
              if (!user) return;
              // ↔ demo/seed listings (merged in from data/mock-properties.ts)
              // have a placeholder seller id that isn't a real auth user —
              // creating a chat with it would fail the chats.partner_id FK,
              // so this is caught here with a clear message instead.
              const isRealSeller = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(property.seller.id);
              if (!isRealSeller) {
                Alert.alert(t("هذا إعلان تجريبي"), t("لا يمكن بدء محادثة مع هذا الإعلان."));
                return;
              }
              const chatId = await openOrCreateChat(user.id, property.seller.id, property.id);
              router.push(`/chat/${chatId}`);
            }}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#22A652" strokeWidth={2}>
              <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </Svg>
          </Pressable>
        )}
        {(sellerSettings?.showCallButton ?? true) && !!property.seller.phone && (
          <Pressable style={styles.chatBtn} onPress={() => openExternalUrl(`tel:${property.seller.phone}`, t("تعذر إجراء الاتصال"))}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#22A652" strokeWidth={2}>
              <Path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .3 2 .7 3a2 2 0 01-.5 2.1L7.9 10.3a16 16 0 006 6l1.5-1.4a2 2 0 012.1-.5c1 .4 2 .6 3 .7a2 2 0 011.7 2z" />
            </Svg>
          </Pressable>
        )}
        {(sellerSettings?.showWhatsapp ?? true) && !!property.seller.phone && (
          <Pressable style={styles.whatsappBtn} onPress={openWhatsapp}>
            <Text style={styles.whatsappBtnText}>{t("تواصل عبر واتساب")}</Text>
          </Pressable>
        )}
      </View>

      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        targetType="property"
        targetId={property.id}
        targetTitle={property.title}
      />
    </View>
  );
}

function Spec({ icon, label }: { icon: string; label: string }) {
  const { t } = useLanguage();
  return (
    <View style={styles.specItem}>
      <Text style={styles.specIcon}>{icon}</Text>
      <Text style={styles.specLabel}>{t(label)}</Text>
    </View>
  );
}

function TabBtn({ active, label, icon, onPress }: { active: boolean; label: string; icon: React.ReactNode; onPress: () => void }) {
  const { t } = useLanguage();
  return (
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      {icon}
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]} numberOfLines={1}>{t(label)}</Text>
    </Pressable>
  );
}

function DescIcon({ active }: { active: boolean }) {
  const c = active ? "#22A652" : "#6b7280";
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
      <Path d="M6 2h9l5 5v15a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" strokeLinejoin="round" />
      <Path d="M15 2v5h5" strokeLinejoin="round" />
      <Path d="M8 13h8M8 17h5" strokeLinecap="round" />
    </Svg>
  );
}

function AmenitiesIcon({ active }: { active: boolean }) {
  const c = active ? "#22A652" : "#6b7280";
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
      <Path d="M4 6h2M9 6h11" strokeLinecap="round" />
      <Path d="M4 12h2M9 12h11" strokeLinecap="round" />
      <Path d="M4 18h2M9 18h11" strokeLinecap="round" />
    </Svg>
  );
}

function PlanIcon({ active }: { active: boolean }) {
  const c = active ? "#22A652" : "#6b7280";
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
      <Path d="M3 3h18v18H3z" strokeLinejoin="round" />
      <Path d="M3 10h11M14 10v11M14 15h7" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: "white" },
  notFoundText: { fontSize: 14, fontWeight: "800", color: "#374151" },
  backBtn: { backgroundColor: "#22A652", borderRadius: 999, paddingVertical: 10, paddingHorizontal: 24 },
  backBtnText: { color: "white", fontWeight: "900" },
  cover: { height: 280, backgroundColor: "#111" },
  coverTopFade: { position: "absolute", top: 0, left: 0, right: 0, height: 80 },
  closeBtn: { position: "absolute", top: 50, left: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  reportBtn: { position: "absolute", top: 50, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  content: { padding: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  purposeTag: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  purposeTagText: { color: "white", fontSize: 10, fontWeight: "900" },
  typeText: { fontSize: 12, fontWeight: "800", color: "#6b7280" },
  title: { fontSize: 18, fontWeight: "900", color: "#111827", marginBottom: 6 },
  location: { fontSize: 13, color: "#6b7280", marginBottom: 8 },
  price: { fontSize: 22, fontWeight: "900", color: "#22A652", marginBottom: 16 },
  specsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  specItem: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f9fafb", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  specIcon: { fontSize: 14 },
  specLabel: { fontSize: 12, fontWeight: "800", color: "#374151" },
  featuresRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  featureChip: { backgroundColor: "#ecfdf5", borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  featureChipText: { fontSize: 11, fontWeight: "800", color: "#047857" },
  tabsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tabBtn: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#f3f4f6" },
  tabBtnActive: { backgroundColor: "#ecfdf5", borderColor: "#22A652" },
  tabBtnText: { fontSize: 10, fontWeight: "800", color: "#6b7280", textAlign: "center" },
  tabBtnTextActive: { color: "#22A652" },
  tabContent: { marginBottom: 20, minHeight: 40 },
  emptyTabText: { fontSize: 12.5, color: "#9ca3af", textAlign: "center", paddingVertical: 16 },
  description: { fontSize: 13, color: "#4b5563", lineHeight: 21 },
  sellerCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f9fafb", borderRadius: 14, padding: 14 },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#22A652", alignItems: "center", justifyContent: "center" },
  sellerAvatarText: { color: "white", fontWeight: "900", fontSize: 17 },
  sellerName: { fontSize: 13.5, fontWeight: "900", color: "#111827" },
  sellerMeta: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  sellerArrow: { fontSize: 20, color: "#9ca3af" },
  ctaBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    flexDirection: "row", gap: 10, padding: 14, paddingBottom: 28,
    backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#f3f4f6",
  },
  chatBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: "#22A652", alignItems: "center", justifyContent: "center" },
  whatsappBtn: { flex: 1, backgroundColor: "#22A652", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  whatsappBtnText: { color: "white", fontWeight: "900", fontSize: 14 },
});
