import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { View, FlatList, StyleSheet, ViewToken, useWindowDimensions, Share, ListRenderItemInfo } from "react-native";
import { usePaginatedProperties, usePropertiesByIds, PropertyPageFilters } from "../../lib/hooks/useProperties";
import { fmtPrice } from "../../lib/types";
import { ReelCard } from "../../components/reel/ReelCard";
import { ReelsHeader } from "../../components/reel/ReelsHeader";
import { ReelFilterModal, ReelFilter } from "../../components/reel/ReelFilterModal";
import { NotificationsDropdown } from "../../components/notifications/NotificationsDropdown";
import { useNotifications } from "../../lib/hooks/useNotifications";
import { useFavorites } from "../../lib/hooks/useFavorites";
import { useFollows } from "../../lib/hooks/useFollows";
import { useLikes } from "../../lib/hooks/useLikes";
import { useCompareSelection } from "../../lib/hooks/useCompareSelection";
import { showToast } from "../../components/shared/Toast";
import { useActiveSponsoredReels, useIncrementSponsoredReach } from "../../lib/hooks/useSponsoredReels";
import { ActionSheet } from "../../components/shared/ActionSheet";
import { ReportModal } from "../../components/shared/ReportModal";
import { useLanguage } from "../../lib/hooks/useLanguage";
import { Property } from "../../lib/types";
import Svg, { Path } from "react-native-svg";

const TAB_BAR_HEIGHT = 64;

// ↔ getOrderedReels() sorts by engagementScore then shuffles the rest.
// Deferred: real engagement-based ordering + shuffle, and the `lives`
// row prepended to the feed (renderLiveReel) — comes with wiring live
// discovery into the feed itself (separate from the live screens already built).
export default function ReelsScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const reelHeight = windowHeight - TAB_BAR_HEIGHT;
  const { t } = useLanguage();

  // ↔ reelProvinceFilters / reelRegionFilters
  const [filter, setFilter] = useState<ReelFilter>({ provinces: [], regions: [] });

  // ↔ real pagination (agreed plan) — filtering by province/region now
  // happens server-side; useProperties() (the unbounded/capped list) is
  // no longer used here on purpose. See usePropertiesByIds below for how
  // sponsored-reel injection still works without needing the full list.
  const pageFilters: PropertyPageFilters = useMemo(
    () => ({ provinces: filter.provinces, regions: filter.regions }),
    [filter]
  );
  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } = usePaginatedProperties(pageFilters);
  const filteredProperties = useMemo(() => data?.pages.flat() ?? [], [data]);

  const [activeIndex, setActiveIndex] = useState(0);

  // ↔ state.followedSellers — now the real `follows` table (shared with
  // app/seller/[id].tsx's follow button instead of two separate local states).
  const { followedIds, toggleFollow } = useFollows();
  const { favoriteProperties, toggleFavoriteProperty } = useFavorites();
  const { likedIds, toggleLike } = useLikes();
  const compareSelection = useCompareSelection();

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [notifMenuVisible, setNotifMenuVisible] = useState(false);
  const notifications = useNotifications();

  // ↔ long-press on a reel's info card → quick "الإبلاغ عن هذا الريل"
  // (reason only, no link) — lands in the admin support center's
  // "الإبلاغات" tab alongside the full-link report from /property/[id].
  const [reportSheetProperty, setReportSheetProperty] = useState<Property | null>(null);
  const [reportModalProperty, setReportModalProperty] = useState<Property | null>(null);

  // ↔ admin "الريلز المميزة" feature — an intro reel shown first on a
  // fresh (unfiltered) entry into the feed, plus featured reels inserted
  // periodically while browsing. Both reuse a REAL existing listing —
  // usePropertiesByIds fetches just those specific sponsor properties
  // directly (they may not be on whichever page is currently loaded, now
  // that the full list isn't fetched anymore) — sponsoredIdByPropertyId
  // lets the viewability tracker below know which feed position to bump
  // reach for.
  const { data: sponsoredReels } = useActiveSponsoredReels();
  const incrementReach = useIncrementSponsoredReach();
  const sponsorPropertyIds = useMemo(
    () => [...new Set((sponsoredReels ?? []).map((s) => s.propertyId))],
    [sponsoredReels]
  );
  const { data: sponsorProperties } = usePropertiesByIds(sponsorPropertyIds);

  const { feedItems, sponsoredIdByPropertyId } = useMemo(() => {
    const byId = new Map((sponsorProperties ?? []).map((p) => [p.id, p]));
    const introSponsor = filter.provinces.length === 0 ? sponsoredReels?.find((s) => s.placement === "intro") : undefined;
    const inFeedSponsors = sponsoredReels?.filter((s) => s.placement === "in_feed") ?? [];

    const sponsoredIdByPropertyId = new Map<string, string>();
    let items = [...filteredProperties];

    if (introSponsor) {
      const introProperty = byId.get(introSponsor.propertyId);
      if (introProperty) {
        items = items.filter((p) => p.id !== introProperty.id);
        items.unshift(introProperty);
        sponsoredIdByPropertyId.set(introProperty.id, introSponsor.id);
      }
    }

    const FEATURED_EVERY = 6;
    inFeedSponsors.forEach((sponsor, sIdx) => {
      const sponsorProperty = byId.get(sponsor.propertyId);
      if (!sponsorProperty) return;
      const insertAt = Math.min(items.length, FEATURED_EVERY * (sIdx + 1));
      items = items.filter((p) => p.id !== sponsorProperty.id);
      items.splice(insertAt, 0, sponsorProperty);
      sponsoredIdByPropertyId.set(sponsorProperty.id, sponsor.id);
    });

    return { feedItems: items, sponsoredIdByPropertyId };
  }, [filteredProperties, sponsorProperties, sponsoredReels, filter.provinces.length]);

  const reachedSponsorIds = useRef(new Set<string>());
  // onViewableItemsChanged below is frozen at mount (FlatList expects a
  // stable reference), so anything it needs that changes over time —
  // sponsoredIdByPropertyId only exists once sponsoredReels has loaded,
  // and incrementReach comes from a hook — has to be read through a ref
  // kept up to date here, not captured directly in that closure.
  const sponsoredMapRef = useRef(sponsoredIdByPropertyId);
  useEffect(() => { sponsoredMapRef.current = sponsoredIdByPropertyId; }, [sponsoredIdByPropertyId]);
  const incrementReachRef = useRef(incrementReach);
  useEffect(() => { incrementReachRef.current = incrementReach; }, [incrementReach]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
      const propertyId = viewableItems[0].item?.id;
      const sponsorId = propertyId ? sponsoredMapRef.current.get(propertyId) : undefined;
      if (sponsorId && !reachedSponsorIds.current.has(sponsorId)) {
        reachedSponsorIds.current.add(sponsorId);
        incrementReachRef.current.mutate(sponsorId);
      }
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  // ↔ perf audit fix #2: stable, id-parameterized callbacks (useCallback)
  // shared by every rendered item, instead of a fresh closure per item
  // per render inside renderItem below. This is what actually lets
  // React.memo(ReelCard) bail out of re-rendering unaffected cards — if
  // these were still inline arrow functions capturing `item`, every card
  // would get a brand-new function reference on every parent re-render
  // regardless of memo, since a changed prop reference always fails a
  // shallow-equality check.
  const handleOpenDetails = useCallback((propertyId: string) => router.push(`/property/${propertyId}`), []);
  const handleOpenSearch = useCallback(() => router.push("/(tabs)/search"), []);
  const handleOpenSeller = useCallback((sellerId: string) => router.push(`/seller/${sellerId}`), []);
  const handleToggleFollow = useCallback((sellerId: string) => toggleFollow(sellerId), [toggleFollow]);
  const handleToggleFavorite = useCallback((propertyId: string) => toggleFavoriteProperty(propertyId), [toggleFavoriteProperty]);
  const handleToggleLike = useCallback((propertyId: string) => toggleLike(propertyId), [toggleLike]);
  const handleToggleCompare = useCallback(
    (propertyId: string) => {
      const result = compareSelection.toggle(propertyId);
      if (result === "full") showToast(t(`تقدر تقارن حتى ${compareSelection.max} عقارات بس`));
    },
    [compareSelection, t]
  );
  const handleShare = useCallback((property: Property) => {
    // ↔ shareProperty()/openShareModal() — the original built a custom
    // share sheet with a copy-link box + social icons. The OS's native
    // share sheet (Share.share) covers the same job on mobile and is the
    // more idiomatic pattern here, so we use that instead of reproducing
    // the custom modal.
    Share.share({
      message: `${property.title} — ${fmtPrice(property.price)} ج.م\nhttps://diarino.app/property/${property.id}`,
    });
  }, []);
  const handleReport = useCallback((property: Property) => setReportSheetProperty(property), []);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Property>) => (
      <ReelCard
        property={item}
        index={index}
        isActive={index === activeIndex}
        isNearActive={Math.abs(index - activeIndex) <= 1}
        isFollowing={followedIds.has(item.seller.id)}
        isFavorite={favoriteProperties.has(item.id)}
        isLiked={likedIds.has(item.id)}
        isComparing={compareSelection.isSelected(item.id)}
        onOpenDetails={handleOpenDetails}
        onOpenSearch={handleOpenSearch}
        onOpenSeller={handleOpenSeller}
        onToggleFollow={handleToggleFollow}
        onToggleFavorite={handleToggleFavorite}
        onToggleLike={handleToggleLike}
        onToggleCompare={handleToggleCompare}
        onShare={handleShare}
        onReport={handleReport}
      />
    ),
    [
      activeIndex, followedIds, favoriteProperties, likedIds, compareSelection,
      handleOpenDetails, handleOpenSearch, handleOpenSeller, handleToggleFollow,
      handleToggleFavorite, handleToggleLike, handleToggleCompare, handleShare, handleReport,
    ]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={feedItems}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={reelHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: reelHeight, offset: reelHeight * index, index })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        // ↔ real pagination — a full screen-height item means the
        // default 0.5 (half a viewport) threshold would trigger too
        // late/early relative to normal scroll speed here; 1.5 screens
        // out gives the next page time to arrive before it's needed.
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={1.5}
        // ↔ perf audit fix #1 — each item is a full-screen video/image;
        // the default windowSize (21, i.e. ~10 screens above/below) would
        // keep far more items mounted than this feed ever needs.
        // windowSize=3 + initialNumToRender=1 caps it to roughly the
        // active card ± 1, matching isNearActive in ReelCard so a real
        // <Video> is never allocated for a card that isn't about to
        // become visible.
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        removeClippedSubviews
      />
      <ReelsHeader
        onOpenFilter={() => setFilterModalVisible(true)}
        onOpenNotifications={() => setNotifMenuVisible(true)}
        notifBadgeCount={notifications.totalUnread}
      />

      <ReelFilterModal
        visible={filterModalVisible}
        value={filter}
        onApply={setFilter}
        onClose={() => setFilterModalVisible(false)}
      />

      <ActionSheet
        visible={!!reportSheetProperty}
        onClose={() => setReportSheetProperty(null)}
        items={[
          {
            key: "report",
            label: t("الإبلاغ عن هذا الريل"),
            danger: true,
            icon: (props) => <Svg {...props}><Path d="M4 22V4" /><Path d="M4 4h13l-2 4 2 4H4" /></Svg>,
            onPress: () => setReportModalProperty(reportSheetProperty),
          },
        ]}
      />
      <ReportModal
        visible={!!reportModalProperty}
        onClose={() => setReportModalProperty(null)}
        quickMode
        targetType="property"
        targetId={reportModalProperty?.id ?? ""}
        targetTitle={reportModalProperty?.title ?? ""}
      />

      <NotificationsDropdown
        visible={notifMenuVisible}
        onClose={() => setNotifMenuVisible(false)}
        activeCat={notifications.activeCat}
        onSwitchCat={notifications.setActiveCat}
        filter={notifications.filter}
        onSetFilter={notifications.setFilter}
        badges={notifications.badges}
        items={notifications.visibleItems}
        onMarkAllRead={notifications.markAllRead}
        onItemPress={(index) => {
          const item = notifications.visibleItems[index];
          notifications.markItemRead(notifications.activeCat, index);
          setNotifMenuVisible(false);
          // ↔ handleNotifClick() — routes by action.type. `chat` has no
          // destination screen yet, so it's still a TODO; the other three
          // (reel/seller/property) all resolve to real screens now.
          if (!item?.action) return;
          const a = item.action;
          if (a.type === "seller") router.push(`/seller/${a.id}`);
          else if (a.type === "property") router.push(`/property/${a.id}`);
          else if (a.type === "reel") router.push(`/property/${a.propertyId}`);
          else if (a.type === "chat") router.push(`/chat/${a.id}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
});
