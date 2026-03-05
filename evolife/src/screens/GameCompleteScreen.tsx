import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../context/GameContext';
import { EVOLUTION_STAGES } from '../data/creatures';

export default function GameCompleteScreen() {
  const { state, dispatch } = useGame();

  const cosmicScale = useRef(new Animated.Value(0.5)).current;
  const cosmicOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(cosmicScale, { toValue: 1, friction: 4, useNativeDriver: true }),
        Animated.timing(cosmicOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      Animated.timing(titleOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <LinearGradient colors={['#050510', '#0d0a2e', '#050510']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.cosmicWrapper, { opacity: cosmicOpacity, transform: [{ scale: cosmicScale }] }]}>
            <Animated.View style={[styles.glowRing, { opacity: glowAnim }]} />
            <Text style={styles.cosmicEmoji}>🌌</Text>
          </Animated.View>

          <Animated.View style={[styles.titleBlock, { opacity: titleOpacity }]}>
            <Text style={styles.label}>TRANSCENDENCE COMPLETE</Text>
            <Text style={styles.title}>You Are the Cosmos</Text>
            <Text style={styles.subtitle}>
              From a lone chemical reaction in the primordial ocean to a consciousness that spans
              the universe — your evolution is complete.
            </Text>
          </Animated.View>

          <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
            <View style={styles.statsBox}>
              <Text style={styles.statLine}>🏆 Total Adaptations: {state.totalSuccesses}</Text>
            </View>

            <Text style={styles.lineageTitle}>Your Complete Evolutionary Lineage</Text>
            <View style={styles.lineageRow}>
              {EVOLUTION_STAGES.map((s, i) => (
                <React.Fragment key={s.id}>
                  <Text style={[styles.lineageEmoji, i === EVOLUTION_STAGES.length - 1 && styles.lineageEmojiLast]}>
                    {s.emoji}
                  </Text>
                  {i < EVOLUTION_STAGES.length - 1 && (
                    <Text style={styles.lineageArrow}>→</Text>
                  )}
                </React.Fragment>
              ))}
            </View>

            <TouchableOpacity
              style={styles.newGameButton}
              onPress={() => dispatch({ type: 'RESET' })}
              activeOpacity={0.8}
            >
              <Text style={styles.newGameText}>🧬 Begin a New Evolution</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 48,
  },
  cosmicWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  glowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(124,58,237,0.25)',
  },
  cosmicEmoji: {
    fontSize: 100,
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  label: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(167,139,250,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    color: '#8899bb',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  statsBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  statLine: {
    color: '#f1c40f',
    fontSize: 15,
    fontWeight: '700',
  },
  lineageTitle: {
    color: '#8899aa',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 12,
  },
  lineageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginBottom: 36,
    paddingHorizontal: 8,
  },
  lineageEmoji: {
    fontSize: 20,
    opacity: 0.6,
  },
  lineageEmojiLast: {
    fontSize: 28,
    opacity: 1,
  },
  lineageArrow: {
    color: '#333',
    fontSize: 10,
    marginHorizontal: 1,
  },
  newGameButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 30,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 10,
  },
  newGameText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
});
