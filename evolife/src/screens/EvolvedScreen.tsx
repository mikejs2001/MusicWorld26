import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../context/GameContext';
import { EVOLUTION_STAGES } from '../data/creatures';

export default function EvolvedScreen() {
  const { state, currentStage, dispatch } = useGame();

  // The stage we just came FROM (current is already incremented by EVOLVE action)
  const prevStage = EVOLUTION_STAGES[state.stageIndex - 1] ?? EVOLUTION_STAGES[0];

  const prevScale = useRef(new Animated.Value(1)).current;
  const prevOpacity = useRef(new Animated.Value(1)).current;
  const nextScale = useRef(new Animated.Value(0)).current;
  const nextOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  const sparkleAnims = useRef(
    Array.from({ length: 6 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
    }))
  ).current;

  useEffect(() => {
    const angles = [0, 60, 120, 180, 240, 300];
    const sparkleBurst = Animated.stagger(
      40,
      sparkleAnims.map((anim, i) => {
        const rad = (angles[i] * Math.PI) / 180;
        return Animated.parallel([
          Animated.timing(anim.opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(anim.scale, { toValue: 1.2, duration: 200, useNativeDriver: true }),
          Animated.timing(anim.x, { toValue: Math.cos(rad) * 80, duration: 600, useNativeDriver: true }),
          Animated.timing(anim.y, { toValue: Math.sin(rad) * 80, duration: 600, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(300),
            Animated.timing(anim.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
        ]);
      })
    );

    // Sequence: old creature fades/shrinks → glow + sparkles → new creature bursts in
    Animated.sequence([
      // Old creature shrinks out
      Animated.parallel([
        Animated.timing(prevScale, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(prevOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      // Glow pulse + sparkle burst
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        sparkleBurst,
      ]),
      Animated.timing(glowOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      // New creature bursts in
      Animated.parallel([
        Animated.spring(nextScale, { toValue: 1, friction: 4, useNativeDriver: true }),
        Animated.timing(nextOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      // Title appears
      Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <LinearGradient colors={['#0a0a1a', '#1a0a2e', '#0a1a0a']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.label}>EVOLUTION COMPLETE</Text>

          {/* Old → New creature animation */}
          <View style={styles.creatureStage}>
            <Animated.Text
              style={[
                styles.prevCreature,
                { transform: [{ scale: prevScale }], opacity: prevOpacity },
              ]}
            >
              {prevStage.emoji}
            </Animated.Text>

            {/* Glow burst */}
            <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

            <Animated.Text
              style={[
                styles.nextCreature,
                { transform: [{ scale: nextScale }], opacity: nextOpacity },
              ]}
            >
              {currentStage.emoji}
            </Animated.Text>

            {sparkleAnims.map((anim, i) => (
              <Animated.Text
                key={`sparkle-${i}`}
                style={{
                  position: 'absolute',
                  fontSize: 20,
                  opacity: anim.opacity,
                  transform: [
                    { translateX: anim.x },
                    { translateY: anim.y },
                    { scale: anim.scale },
                  ],
                }}
              >
                ✨
              </Animated.Text>
            ))}
          </View>

          <Animated.View style={[styles.titleBlock, { opacity: titleOpacity }]}>
            <Text style={styles.evolvedLabel}>Evolved into</Text>
            <Text style={styles.stageName}>{currentStage.name}</Text>
            <Text style={styles.stageDesc}>{currentStage.description}</Text>
            <Text style={styles.environment}>📍 {currentStage.environment}</Text>
          </Animated.View>

          {/* Lineage */}
          <Animated.View style={[styles.lineage, { opacity: titleOpacity }]}>
            <Text style={styles.lineageTitle}>Your Evolutionary Path</Text>
            <View style={styles.lineageRow}>
              {EVOLUTION_STAGES.slice(0, state.stageIndex + 1).map((s, i) => (
                <React.Fragment key={s.id}>
                  <Text
                    style={[
                      styles.lineageEmoji,
                      i === state.stageIndex && styles.lineageEmojiCurrent,
                    ]}
                  >
                    {s.emoji}
                  </Text>
                  {i < state.stageIndex && (
                    <Text style={styles.lineageArrow}>→</Text>
                  )}
                </React.Fragment>
              ))}
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: titleOpacity, width: '100%' }}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => dispatch({ type: 'CONTINUE_TO_NEXT_ROUND' })}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>
                🧬 Continue as {currentStage.name}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  label: {
    color: '#f1c40f',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 20,
  },
  creatureStage: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  prevCreature: {
    fontSize: 100,
    position: 'absolute',
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,150,0.6)',
  },
  nextCreature: {
    fontSize: 110,
    position: 'absolute',
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  evolvedLabel: {
    color: '#88aacc',
    fontSize: 13,
  },
  stageName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  stageDesc: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  environment: {
    color: '#7fb3d3',
    fontSize: 12,
    marginTop: 6,
  },
  lineage: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 28,
  },
  lineageTitle: {
    color: '#8899aa',
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 10,
  },
  lineageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  lineageEmoji: {
    fontSize: 22,
    opacity: 0.5,
  },
  lineageEmojiCurrent: {
    opacity: 1,
    fontSize: 28,
  },
  lineageArrow: {
    color: '#444',
    fontSize: 12,
    marginHorizontal: 2,
  },
  continueButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#2ecc71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
});
