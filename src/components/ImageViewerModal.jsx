import React, { useEffect } from "react";
import { Modal, StatusBar, TouchableOpacity, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

/** Visualizador em ecrã inteiro: pinch para zoom, arrastar e duplo toque. */
export default function ImageViewerModal({ visible, uri, onClose }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedX.value = 0;
      savedY.value = 0;
    }
  }, [visible, scale, savedScale, translateX, translateY, savedX, savedY]);

  const reset = () => {
    "worklet";
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(Math.max(savedScale.value * event.scale, 1), MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) reset();
    });

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      const maxX = (width * (scale.value - 1)) / 2;
      const maxY = (height * (scale.value - 1)) / 2;
      translateX.value = Math.min(Math.max(savedX.value + event.translationX, -maxX), maxX);
      translateY.value = Math.min(Math.max(savedY.value + event.translationY, -maxY), maxY);
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
      }
    });

  const gesture = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[{ flex: 1, alignItems: "center", justifyContent: "center" }, imageStyle]}>
            {!!uri && (
              <Image
                source={{ uri }}
                contentFit="contain"
                style={{ width, height }}
              />
            )}
          </Animated.View>
        </GestureDetector>

        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.8}
          style={{
            position: "absolute",
            top: insets.top + 12,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.18)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={22} color="#fff" />
        </TouchableOpacity>
      </GestureHandlerRootView>
    </Modal>
  );
}
