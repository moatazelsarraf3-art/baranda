import { Platform, View } from "react-native";
import type { ReactNode } from "react";

let livekitModule: any = null;

if (Platform.OS !== "web") {
  livekitModule = require("@livekit/react-native");
}

export function registerGlobals() {
  if (!livekitModule?.registerGlobals) return;
  livekitModule.registerGlobals();
}

export const LiveKitRoom = Platform.OS === "web"
  ? ({ children }: { children: ReactNode }) => <>{children}</>
  : livekitModule?.LiveKitRoom;

export const useTracks = Platform.OS === "web"
  ? () => []
  : livekitModule?.useTracks;

export const useParticipants = Platform.OS === "web"
  ? () => []
  : livekitModule?.useParticipants;

export const useRoomContext = Platform.OS === "web"
  ? () => null
  : livekitModule?.useRoomContext;

export const useIsMuted = Platform.OS === "web"
  ? () => false
  : livekitModule?.useIsMuted;

export const VideoTrack = Platform.OS === "web"
  ? ({ style }: { style?: any }) => <View style={style} />
  : livekitModule?.VideoTrack;

export const isTrackReference = Platform.OS === "web"
  ? () => false
  : livekitModule?.isTrackReference;

export const AudioSession = Platform.OS === "web"
  ? {
      startAudioSession: () => undefined,
      stopAudioSession: () => undefined,
    }
  : livekitModule?.AudioSession;
