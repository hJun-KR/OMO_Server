import { useEffect, useRef } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
const PICKER_PADDING = ITEM_HEIGHT * 2;

type Props = {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  unit: string;
};

export function WheelPicker({ values, value, onChange, unit }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const idx = values.indexOf(value);
    if (idx >= 0) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          y: idx * ITEM_HEIGHT,
          animated: false,
        });
      });
    }
  }, []);

  const handleEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(values.length - 1, idx));
    onChange(values[clamped]);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.centerLine} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        style={{ height: PICKER_HEIGHT }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleEnd}
        contentContainerStyle={{ paddingVertical: PICKER_PADDING }}
      >
        {values.map((v) => {
          const isSelected = v === value;
          return (
            <View key={v} style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  isSelected && styles.itemTextSelected,
                ]}
              >
                {v}
                {unit}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 120,
    height: PICKER_HEIGHT,
    position: "relative",
  },
  centerLine: {
    position: "absolute",
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#EFEFEF",
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  itemText: {
    fontFamily: "PretendardMedium",
    fontSize: 18,
    color: "#D5D5D5",
  },
  itemTextSelected: {
    fontFamily: "PretendardSemiBold",
    fontSize: 22,
    color: "#212020",
  },
});
