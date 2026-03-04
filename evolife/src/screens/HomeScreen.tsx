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
import EvolutionBar from '../components/EvolutionBar';

export default function HomeScreen() {
  const { state, currentStage, dispatch, evolutionProgress } = useGame();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(-20)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleSlide, { toValue: 0, duration: 550, useNativeDriver: true }),
      Animated.timing(titleOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 1500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 10, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const stageColors: Record<string, [string, string]> = {
    primordial: ['#0d1b2a', '#1a3a4a'],
    marine:     ['#0a1530', '#0d3460'],
    aquatic:    ['#0a2a4a', '#1a5276'],
    terrestrial:['#1a3a1a', '#2e7d32'],
    primate:    ['#2d1b0e', '#5d4037'],
    beyond:     ['#0d0d1a', '#1a0a2e'],
  };

  const [colorA, colorB] = stageColors[currentStage.category] ?? ['#0d0d0d', '#1a1a1a'];

  return (
    <LinearGradient colors={[colorA, colorB]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Animated.View style={{ transform: [{ translateY: titleSlide }], opacity: titleOpacity }}>
            <Text style={styles.title}>EvoLife</Text>
            <Text style={styles.subtitle}>Survive. Adapt. Evolve.</Text>
          </Animated.View>

          <View style={styles.creatureContainer}>
            <Animated.Text
              style={[
                styles.creature,
                {
                  transform: [
                    { scale: pulseAnim },
                    { translateY: floatAnim },
                  ],
                },
              ]}
            >
              {currentStage.emoji}
            </Animated.Text>
          </View>

          <Text style={styles.stageName}>{currentStage.name}</Text>
          <Text style={styles.stageDesc}>{currentStage.description}</Text>
          <Text style={styles.environment}>📍 {currentStage.environment}</Text>

          <View style={styles.milestonesBox}>
            {currentStage.milestones.map((m, i) => (
              <Text key={i} style={styles.milestone}>· {m}</Text>
            ))}
          </View>

          <View style={styles.progressSection}>
            <View style={styles.stageIndicator}>
              <Text style={styles.stageLabel}>
                Stage {state.stageIndex + 1} of {10}
              </Text>
              <Text style={styles.pointsLabel}>
                ⚡ {state.evolutionPoints} / {currentStage.evolvesAt} evolution points
              </Text>
            </View>
            <EvolutionBar progress={evolutionProgress} label="Evolution Progress" />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => dispatch({ type: 'START_CHALLENGE_SELECT' })}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>⚗️ Begin Evolution Round</Text>
          </TouchableOpacity>

          {state.totalSuccesses > 0 && (
            <Text style={styles.stats}>
              🏆 Total Adaptations: {state.totalSuccesses}
            </Text>
          )}
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
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 3,
    textShadowColor: 'rgba(100,200,255,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#88aacc',
    letterSpacing: 2,
    marginBottom: 32,
  },
  creatureContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  creature: {
    fontSize: 90,
  },
  stageName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  stageDesc: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  environment: {
    fontSize: 12,
    color: '#7fb3d3',
    marginTop: 8,
    marginBottom: 10,
  },
  milestonesBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  milestone: {
    color: '#88bbdd',
    fontSize: 12,
    lineHeight: 20,
  },
  progressSection: {
    width: '100%',
    marginBottom: 28,
  },
  stageIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stageLabel: {
    color: '#aaa',
    fontSize: 12,
  },
  pointsLabel: {
    color: '#f1c40f',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 30,
    shadowColor: '#2ecc71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stats: {
    marginTop: 20,
    color: '#f1c40f',
    fontSize: 13,
  },
});
