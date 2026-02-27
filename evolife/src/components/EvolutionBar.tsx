import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

type Props = {
  progress: number; // 0–1
  label?: string;
};

export default function EvolutionBar({ progress, label }: Props) {
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animWidth, {
      toValue: progress,
      useNativeDriver: false,
      friction: 6,
    }).start();
  }, [progress]);

  const barColor = animWidth.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#e74c3c', '#f39c12', '#2ecc71'],
  });

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: animWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  track: {
    height: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});
