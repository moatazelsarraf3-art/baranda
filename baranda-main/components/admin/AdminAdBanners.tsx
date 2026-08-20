import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, FlatList, Alert, Switch } from "react-native";
import { useAllAdBanners, useAdBannerMutations } from "../../lib/hooks/useAdBanners";
import { useAdCarouselSettings, useUpdateAdCarouselSettings } from "../../lib/hooks/useAdCarouselSettings";

// ↔ full control over the "مساحة إعلانية" card on the menu page: add a
// banner with a run duration (start/end date), delete it, or add several
// that auto-rotate (components/menu/AdBannerCarousel.tsx cycles through
// every banner returned by useActiveAdBanners()).
export function AdminAdBanners() {
  const { data: banners = [] } = useAllAdBanners();
  const { create, toggleActive, remove } = useAdBannerMutations();
  const { data: rotationSettings } = useAdCarouselSettings();
  const updateRotation = useUpdateAdCarouselSettings();
  const [durationInput, setDurationInput] = useState("4");

  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [days, setDays] = useState("7");

  useEffect(() => {
    if (rotationSettings) setDurationInput(String(Math.round(rotationSettings.durationMs / 1000)));
  }, [rotationSettings?.durationMs]);

  function addBanner() {
    if (!title.trim()) return;
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + (Number(days) || 7));
    create.mutate({
      title: title.trim(),
      imageUrl: imageUrl.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      sortOrder: banners.length,
    });
    setTitle(""); setImageUrl(""); setLinkUrl(""); setDays("7");
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>طريقة عرض الإعلانات</Text>
        <View style={styles.durationRow}>
          <Pressable
            style={[styles.rotationBtn, rotationSettings?.rotationMode === "auto" && styles.rotationBtnActive]}
            onPress={() => updateRotation.mutate({ rotationMode: "auto" })}
          >
            <Text style={[styles.rotationBtnText, rotationSettings?.rotationMode === "auto" && styles.rotationBtnTextActive]}>تلقائي (ينتقل لليمين)</Text>
          </Pressable>
          <Pressable
            style={[styles.rotationBtn, rotationSettings?.rotationMode === "manual" && styles.rotationBtnActive]}
            onPress={() => updateRotation.mutate({ rotationMode: "manual" })}
          >
            <Text style={[styles.rotationBtnText, rotationSettings?.rotationMode === "manual" && styles.rotationBtnTextActive]}>يدوي (بالسحب فقط)</Text>
          </Pressable>
        </View>
        {rotationSettings?.rotationMode !== "manual" && (
          <View style={styles.durationRow}>
            <Text style={styles.durationLabel}>مدة عرض كل إعلان (ثواني):</Text>
            <TextInput
              style={styles.durationInput}
              keyboardType="number-pad"
              value={durationInput}
              onChangeText={setDurationInput}
              onBlur={() => {
                const secs = Number(durationInput) || 4;
                updateRotation.mutate({ durationMs: secs * 1000 });
              }}
            />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>إضافة إعلان جديد</Text>
        <TextInput style={styles.input} placeholder="عنوان الإعلان" value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="رابط الصورة (اختياري)" value={imageUrl} onChangeText={setImageUrl} />
        <TextInput style={styles.input} placeholder="الرابط عند الضغط (اختياري)" value={linkUrl} onChangeText={setLinkUrl} />
        <View style={styles.durationRow}>
          <Text style={styles.durationLabel}>مدة العرض (أيام):</Text>
          <TextInput style={styles.durationInput} keyboardType="number-pad" value={days} onChangeText={setDays} />
        </View>
        <Pressable style={styles.addBtn} onPress={addBanner} disabled={create.isPending}>
          <Text style={styles.addBtnText}>{create.isPending ? "جاري الإضافة..." : "إضافة الإعلان"}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>الإعلانات الحالية ({banners.length})</Text>
        <FlatList
          data={banners}
          keyExtractor={(b) => b.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyText}>لا توجد إعلانات مضافة</Text>}
          renderItem={({ item }) => {
            const expired = item.endDate ? item.endDate < new Date().toISOString().slice(0, 10) : false;
            return (
              <View style={styles.bannerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.bannerDates}>
                    {item.startDate} → {item.endDate || "بلا نهاية"} {expired ? "· منتهي" : ""}
                  </Text>
                </View>
                <Switch value={item.active} onValueChange={(v) => toggleActive.mutate({ id: item.id, active: v })} />
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => Alert.alert("حذف الإعلان؟", "", [
                    { text: "إلغاء", style: "cancel" },
                    { text: "حذف", style: "destructive", onPress: () => remove.mutate(item.id) },
                  ])}
                >
                  <Text style={styles.deleteBtnText}>حذف</Text>
                </Pressable>
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "white", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#eef1f6" },
  cardTitle: { fontSize: 13, fontWeight: "900", color: "#0f172a", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, fontSize: 12.5, marginBottom: 8 },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  durationLabel: { fontSize: 12, color: "#64748b", fontWeight: "700" },
  rotationBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: "#f8fafc" },
  rotationBtnActive: { backgroundColor: "#f59e0b" },
  rotationBtnText: { fontSize: 11.5, fontWeight: "800", color: "#64748b" },
  rotationBtnTextActive: { color: "white" },
  durationInput: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, fontSize: 12.5, width: 60, textAlign: "center" },
  addBtn: { backgroundColor: "#f59e0b", borderRadius: 999, paddingVertical: 11, alignItems: "center" },
  addBtnText: { color: "white", fontWeight: "900", fontSize: 12.5 },
  emptyText: { textAlign: "center", color: "#94a3b8", fontSize: 12, paddingVertical: 16 },
  bannerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  bannerTitle: { fontSize: 12.5, fontWeight: "800", color: "#0f172a" },
  bannerDates: { fontSize: 10.5, color: "#94a3b8", marginTop: 2 },
  deleteBtn: { backgroundColor: "#FEF2F2", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  deleteBtnText: { color: "#991B1B", fontWeight: "900", fontSize: 11 },
});
