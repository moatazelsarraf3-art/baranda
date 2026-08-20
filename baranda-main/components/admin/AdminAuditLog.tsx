import { View, Text, StyleSheet, FlatList } from "react-native";
import { useAdminAuditLog } from "../../lib/hooks/useAuditLogs";

const ACTION_LABELS: Record<string, string> = {
  reel_update: "تعديل حالة إعلان", reel_delete: "حذف إعلان",
  live_update: "تعديل حالة بث", live_delete: "حذف بث",
  ad_banner_insert: "إضافة بانر إعلاني", ad_banner_update: "تعديل بانر إعلاني", ad_banner_delete: "حذف بانر إعلاني",
  sponsored_reel_insert: "ترويج ريل", sponsored_reel_update: "تعديل ترويج ريل", sponsored_reel_delete: "إلغاء ترويج ريل",
};

function fieldDiff(before: Record<string, unknown> | null, after: Record<string, unknown> | null): string | null {
  if (!before || !after) return null;
  const changedKeys = Object.keys(after).filter((k) => JSON.stringify(after[k]) !== JSON.stringify(before[k]) && k !== "updated_at");
  if (changedKeys.length === 0) return null;
  return changedKeys.map((k) => `${k}: ${JSON.stringify(before[k])} ← ${JSON.stringify(after[k])}`).join("، ");
}

export function AdminAuditLog() {
  const { data: entries = [], isLoading } = useAdminAuditLog();

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>سجل تدقيق الأدمن</Text>
      <Text style={styles.cardSubtitle}>كل تعديل أو حذف على الريلز والبث والإعلانات، مع الوقت ومن قام به</Text>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        scrollEnabled={false}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>لا توجد عمليات مسجّلة بعد</Text> : null}
        renderItem={({ item }) => {
          const diff = fieldDiff(item.before, item.after);
          return (
            <View style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.action}>{ACTION_LABELS[item.action] || item.action}</Text>
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleString("ar-EG")}</Text>
              </View>
              <Text style={styles.actor}>بواسطة: {item.actorName || "مستخدم محذوف"}</Text>
              {!!diff && <Text style={styles.diff} numberOfLines={2}>{diff}</Text>}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "white", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#eef1f6" },
  cardTitle: { fontSize: 13, fontWeight: "900", color: "#0f172a" },
  cardSubtitle: { fontSize: 11, color: "#94a3b8", marginTop: 2, marginBottom: 10 },
  emptyText: { textAlign: "center", color: "#94a3b8", fontSize: 12, paddingVertical: 16 },
  row: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  action: { fontSize: 12.5, fontWeight: "900", color: "#0f172a" },
  time: { fontSize: 10.5, color: "#94a3b8" },
  actor: { fontSize: 11.5, color: "#6366f1", fontWeight: "700", marginTop: 3 },
  diff: { fontSize: 10.5, color: "#64748b", marginTop: 4 },
});
