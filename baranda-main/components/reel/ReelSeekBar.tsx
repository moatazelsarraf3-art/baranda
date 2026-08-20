import { useRef } from "react";
import { View, Text, Pressable, StyleSheet, PanResponder, GestureResponderEvent } from "react-native";
import Svg, { Path } from "react-native-svg";

// ↔ .reel-seek-bar / .reel-seek-track (note the original forces
// `direction: ltr` on the track even on the RTL page so scrubbing always
// reads left→right; plain pixel-offset math here does the same by default).

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  currentSec: number;
  durationSec: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (pct: number) => void; // 0..1
};

export function ReelSeekBar({ currentSec, durationSec, isPlaying, onTogglePlay, onSeek }: Props) {
  const trackWidth = useRef(0);
  const pct = durationSec > 0 ? Math.min(1, currentSec / durationSec) : 0;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => handleSeek(e),
      onPanResponderMove: (e) => handleSeek(e),
    })
  ).current;

  function handleSeek(e: GestureResponderEvent) {
    if (!trackWidth.current) return;
    const x = e.nativeEvent.locationX;
    const p = Math.max(0, Math.min(1, x / trackWidth.current));
    onSeek(p);
  }

  return (
    <View style={styles.bar} onStartShouldSetResponder={() => true}>
      <Pressable style={styles.playBtn} onPress={onTogglePlay} hitSlop={6}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="white">
          {isPlaying ? <Path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <Path d="M8 5v14l11-7z" />}
        </Svg>
      </Pressable>
      <Text style={styles.time}>{formatTime(currentSec)}</Text>
      <View
        style={styles.track}
        onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
        {...panResponder.panHandlers}
      >
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        <View style={[styles.thumb, { left: `${pct * 100}%` }]} />
      </View>
      <Text style={styles.time}>{formatTime(durationSec)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 45,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  playBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  time: {
    color: "white", fontSize: 10, fontWeight: "900", minWidth: 34, textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  track: {
    flex: 1, height: 5, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 3, position: "relative",
  },
  fill: {
    height: "100%", backgroundColor: "#22A652", borderRadius: 3, position: "absolute", left: 0, top: 0,
  },
  thumb: {
    position: "absolute", top: "50%", marginTop: -7, marginLeft: -7,
    width: 14, height: 14, borderRadius: 7, backgroundColor: "white",
  },
});
