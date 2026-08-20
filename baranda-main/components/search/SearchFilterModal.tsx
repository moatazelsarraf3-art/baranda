import { useMemo, useRef, useState } from "react";
import {
  Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet, Animated, PanResponder,
} from "react-native";
import { PROVINCES } from "../../data/locations";
import { RegionAutocompleteField } from "./RegionAutocompleteField";
import { useLanguage } from "../../lib/hooks/useLanguage";

// ↔ modal-search-filter / state.searchFilters / renderSfProvinceChips() /
// renderSfRegionChips() in app-viewer.html.
// Deferred: geo-radius search (useGeo/userLat/userLng/geoRadiusKm) — needs
// its own location-permission gate, same pattern as PermissionGate for
// camera/mic, kept out of this pass on purpose rather than half-built.

export type SearchFilters = {
  purpose: "all" | "sale" | "rent";
  type: string;
  provinces: string[];
  regions: string[];
  priceMin: number;
  priceMax: number;
  areaMin: number;
  areaMax: number;
  minRooms: number;
};

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  purpose: "all", type: "all", provinces: [], regions: [],
  priceMin: 0, priceMax: Infinity, areaMin: 0, areaMax: Infinity, minRooms: 0,
};

const TYPES = ["all", "شقة", "فيلا", "بنتهاوس", "تاون هاوس", "تجاري", "إداري", "طبي", "أرض"];
const DISMISS_THRESHOLD = 110;

type Props = {
  visible: boolean;
  value: SearchFilters;
  onApply: (f: SearchFilters) => void;
  onClose: () => void;
};

export function SearchFilterModal({ visible, value, onApply, onClose }: Props) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<SearchFilters>(value);
  const [provinceQuery, setProvinceQuery] = useState("");

  const translateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && g.dy > 0,
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) return;
        translateY.setValue(g.dy);
        backdropOpacity.setValue(Math.max(0, 1 - g.dy / 500));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_THRESHOLD) {
          Animated.timing(translateY, { toValue: 700, duration: 220, useNativeDriver: true }).start(() => {
            translateY.setValue(0);
            backdropOpacity.setValue(1);
            onClose();
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const suggestions = useMemo(() => {
    if (!provinceQuery.trim()) return [];
    return PROVINCES.filter((p) => p.includes(provinceQuery.trim()) && !draft.provinces.includes(p)).slice(0, 6);
  }, [provinceQuery, draft.provinces]);

  function reset() {
    setDraft(DEFAULT_SEARCH_FILTERS);
    onApply(DEFAULT_SEARCH_FILTERS);
    onClose();
  }
  function apply() {
    onApply(draft);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
        <View style={styles.dragHandle} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.section}>{t("الغرض")}</Text>
          <View style={styles.chipsRow}>
            {(["all", "sale", "rent"] as const).map((p) => (
              <Pressable
                key={p}
                style={draft.purpose === p ? styles.chipActive : styles.chip}
                onPress={() => setDraft((d) => ({ ...d, purpose: p }))}
              >
                <Text style={draft.purpose === p ? styles.chipActiveText : styles.chipText}>
                  {p === "all" ? t("الكل") : p === "sale" ? t("بيع") : t("إيجار")}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.section}>{t("نوع العقار")}</Text>
          <View style={styles.chipsRow}>
            {TYPES.map((ty) => (
              <Pressable
                key={ty}
                style={draft.type === ty ? styles.chipActive : styles.chip}
                onPress={() => setDraft((d) => ({ ...d, type: ty }))}
              >
                <Text style={draft.type === ty ? styles.chipActiveText : styles.chipText}>{ty === "all" ? t("الكل") : t(ty)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.section}>{t("المحافظة")}</Text>
          <TextInput
            style={styles.input}
            value={provinceQuery}
            onChangeText={setProvinceQuery}
            placeholder={t("ابحث عن محافظة...")}
            placeholderTextColor="#9ca3af"
          />
          {suggestions.length > 0 && (
            <View style={styles.suggestionBox}>
              {suggestions.map((s) => (
                <Pressable
                  key={s}
                  style={styles.suggestionRow}
                  onPress={() => { setDraft((d) => ({ ...d, provinces: [...d.provinces, s] })); setProvinceQuery(""); }}
                >
                  <Text style={styles.suggestionText}>{t(s)}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.chipsRow}>
            {draft.provinces.map((pv) => (
              <Pressable
                key={pv}
                style={styles.chipActive}
                onPress={() => setDraft((d) => ({ ...d, provinces: d.provinces.filter((x) => x !== pv) }))}
              >
                <Text style={styles.chipActiveText}>{t(pv)} ×</Text>
              </Pressable>
            ))}
          </View>

          {draft.provinces.length === 1 && (
            <>
              <Text style={styles.section}>{t("المنطقة")}</Text>
              <RegionAutocompleteField
                province={draft.provinces[0]}
                selected={draft.regions}
                onChange={(next) => setDraft((d) => ({ ...d, regions: next }))}
              />
            </>
          )}

          <Text style={styles.section}>{t("السعر (ج.م)")}</Text>
          <View style={styles.rangeRow}>
            <TextInput
              style={styles.rangeInput}
              keyboardType="number-pad"
              placeholder={t("من")}
              placeholderTextColor="#9ca3af"
              value={draft.priceMin ? String(draft.priceMin) : ""}
              onChangeText={(v) => setDraft((d) => ({ ...d, priceMin: Number(v) || 0 }))}
            />
            <Text style={styles.rangeDash}>—</Text>
            <TextInput
              style={styles.rangeInput}
              keyboardType="number-pad"
              placeholder={t("إلى")}
              placeholderTextColor="#9ca3af"
              value={Number.isFinite(draft.priceMax) ? String(draft.priceMax) : ""}
              onChangeText={(v) => setDraft((d) => ({ ...d, priceMax: v ? Number(v) : Infinity }))}
            />
          </View>

          <Text style={styles.section}>{t("المساحة (م²)")}</Text>
          <View style={styles.rangeRow}>
            <TextInput
              style={styles.rangeInput}
              keyboardType="number-pad"
              placeholder={t("من")}
              placeholderTextColor="#9ca3af"
              value={draft.areaMin ? String(draft.areaMin) : ""}
              onChangeText={(v) => setDraft((d) => ({ ...d, areaMin: Number(v) || 0 }))}
            />
            <Text style={styles.rangeDash}>—</Text>
            <TextInput
              style={styles.rangeInput}
              keyboardType="number-pad"
              placeholder={t("إلى")}
              placeholderTextColor="#9ca3af"
              value={Number.isFinite(draft.areaMax) ? String(draft.areaMax) : ""}
              onChangeText={(v) => setDraft((d) => ({ ...d, areaMax: v ? Number(v) : Infinity }))}
            />
          </View>

          <Text style={styles.section}>{t("الحد الأدنى للغرف")}</Text>
          <View style={styles.chipsRow}>
            {[0, 1, 2, 3, 4].map((n) => (
              <Pressable
                key={n}
                style={draft.minRooms === n ? styles.chipActive : styles.chip}
                onPress={() => setDraft((d) => ({ ...d, minRooms: n }))}
              >
                <Text style={draft.minRooms === n ? styles.chipActiveText : styles.chipText}>{n === 0 ? t("أي عدد") : `${n}+`}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.actionsRow}>
          <Pressable style={styles.resetBtn} onPress={reset}>
            <Text style={styles.resetBtnText}>{t("إعادة تعيين")}</Text>
          </Pressable>
          <Pressable style={styles.applyBtn} onPress={apply}>
            <Text style={styles.applyBtnText}>{t("تطبيق")}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "white",
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 24, maxHeight: "85%",
  },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb", alignSelf: "center", marginBottom: 10 },
  section: { fontSize: 12, fontWeight: "900", color: "#374151", marginTop: 14, marginBottom: 8 },
  input: { backgroundColor: "#f3f4f6", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13, color: "#111827" },
  suggestionBox: { backgroundColor: "white", borderWidth: 1, borderColor: "#f3f4f6", borderRadius: 10, marginTop: 4, overflow: "hidden" },
  suggestionRow: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  suggestionText: { fontSize: 13, color: "#374151", fontWeight: "700" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#f3f4f6", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontSize: 11.5, fontWeight: "800", color: "#374151" },
  chipActive: { backgroundColor: "#22A652", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipActiveText: { fontSize: 11.5, fontWeight: "800", color: "white" },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rangeInput: { flex: 1, backgroundColor: "#f3f4f6", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13, color: "#111827", textAlign: "center" },
  rangeDash: { color: "#9ca3af" },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  resetBtn: { flex: 1, borderRadius: 999, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" },
  resetBtnText: { fontSize: 13, fontWeight: "900", color: "#374151" },
  applyBtn: { flex: 1, borderRadius: 999, paddingVertical: 13, alignItems: "center", backgroundColor: "#22A652" },
  applyBtnText: { fontSize: 13, fontWeight: "900", color: "white" },
});
