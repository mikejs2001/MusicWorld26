import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../context/GameContext';
import EvolutionBar from '../components/EvolutionBar';
import { EVOLUTION_STAGES } from '../data/creatures';

export default function ResultScreen() {
  const { state, currentStage, dispatch, evolutionProgress } = useGame();

  const titleScale = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const creatureBounce = useRef(new Animated.Value(1)).current;
  const rowAnims = useRef(
    state.challengeResults.map(() => ({
      translateX: new Animated.Value(-30),
      opacity: new Animated.Value(0),
    }))
  ).current;

  const successCount = state.challengeResults.filter((r) => r.success).length;
  const totalCount = state.challengeResults.length;
  const pointsEarned = state.challengeResults.reduce(
    (acc, r) => acc + (r.success ? r.evolutionPointsGained : 0),
    0
  );

  const canEvolve = state.evolutionPoints >= currentStage.evolvesAt;
  const nextStage = EVOLUTION_STAGES[state.stageIndex + 1];

  useEffect(() => {
    Animated.sequence([
      Animated.spring(titleScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(listOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.stagger(
          110,
          rowAnims.map((a) =>
            Animated.parallel([
              Animated.timing(a.translateX, { toValue: 0, duration: 350, useNativeDriver: true }),
              Animated.timing(a.opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
            ])
          )
        ),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(creatureBounce, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(creatureBounce, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <LinearGradient colors={['#0d1a0d', '#1a2a1a']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Animated.Text style={[styles.title, { transform: [{ scale: titleScale }] }]}>
            {successCount === totalCount
              ? '🏆 Perfect Round!'
              : successCount > 0
              ? '⚗️ Round Complete'
              : '💀 Trials Failed'}
          </Animated.Text>

          <Animated.Text style={[styles.creature, { transform: [{ scale: creatureBounce }] }]}>
            {currentStage.emoji}
          </Animated.Text>

          <Animated.View style={[styles.summary, { opacity: listOpacity }]}>
            <Text style={styles.summaryTitle}>Trial Results</Text>
            {state.challengeResults.map((r, i) => (
              <Animated.View
                key={i}
                style={{
                  transform: [{ translateX: rowAnims[i].translateX }],
                  opacity: rowAnims[i].opacity,
                }}
              >
                <View style={styles.resultRow}>
                  <Text style={styles.resultEmoji}>{r.challenge.emoji}</Text>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{r.challenge.name}</Text>
                    <Text
                      style={[
                        styles.resultOutcome,
                        r.success ? styles.outcomeSuccess : styles.outcomeFail,
                      ]}
                    >
                      {r.success
                        ? `✓ Adapted  +${r.evolutionPointsGained} ⚡`
                        : '✗ Failed  +0 ⚡'}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ))}

            <View style={styles.divider} />

            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Trials succeeded</Text>
              <Text style={styles.scoreValue}>
                {successCount} / {totalCount}
              </Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Points earned this round</Text>
              <Text style={[styles.scoreValue, { color: '#f1c40f' }]}>⚡ {pointsEarned}</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Total evolution points</Text>
              <Text style={[styles.scoreValue, { color: '#3498db' }]}>
                ⚡ {state.evolutionPoints} / {currentStage.evolvesAt}
              </Text>
            </View>
          </Animated.View>

          <View style={styles.progressSection}>
            <EvolutionBar
              progress={evolutionProgress}
              label={`${currentStage.name} Evolution`}
            />
          </View>

          {canEvolve && nextStage ? (
            <View style={styles.evolutionCallout}>
              <Text style={styles.evolutionCalloutTitle}>🧬 Evolution Ready!</Text>
              <Text style={styles.evolutionCalloutText}>
                Your creature has adapted enough to evolve into a{' '}
                <Text style={styles.nextStageName}>{nextStage.name}</Text>!
              </Text>
              <Text style={styles.nextCreature}>{nextStage.emoji}</Text>

              <TouchableOpacity
                style={styles.evolveButton}
                onPress={() => dispatch({ type: 'EVOLVE' })}
                activeOpacity={0.8}
              >
                <Text style={styles.evolveButtonText}>🌟 Evolve Now!</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.continueSection}>
              <Text style={styles.continueHint}>
                {currentStage.evolvesAt - state.evolutionPoints} more points needed to evolve
              </Text>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => dispatch({ type: 'CONTINUE_TO_NEXT_ROUND' })}
                activeOpacity={0.8}
              >
                <Text style={styles.continueButtonText}>⚗️ Next Round of Trials</Text>
              </TouchableOpacity>
            </View>
          )}
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
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  creature: {
    fontSize: 70,
    marginVertical: 16,
  },
  summary: {
    width: '100%',
    backgroundColor: '#0a1a0a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#88aacc',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultEmoji: { fontSize: 28, marginRight: 12 },
  resultInfo: { flex: 1 },
  resultName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  resultOutcome: { fontSize: 12, marginTop: 2 },
  outcomeSuccess: { color: '#2ecc71' },
  outcomeFail: { color: '#e74c3c' },
  divider: {
    height: 1,
    backgroundColor: '#1a3a1a',
    marginVertical: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scoreLabel: { color: '#8899aa', fontSize: 13 },
  scoreValue: { color: '#fff', fontSize: 13, fontWeight: '700' },
  progressSection: {
    width: '100%',
    marginBottom: 20,
  },
  evolutionCallout: {
    width: '100%',
    backgroundColor: 'rgba(46,204,113,0.1)',
    borderColor: '#2ecc71',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  evolutionCalloutTitle: {
    color: '#2ecc71',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  evolutionCalloutText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  nextStageName: {
    color: '#2ecc71',
    fontWeight: '700',
  },
  nextCreature: {
    fontSize: 52,
    marginVertical: 10,
  },
  evolveButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    shadowColor: '#2ecc71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  evolveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  continueSection: {
    width: '100%',
    alignItems: 'center',
  },
  continueHint: {
    color: '#88aacc',
    fontSize: 13,
    marginBottom: 12,
  },
  continueButton: {
    backgroundColor: '#8e44ad',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    shadowColor: '#9b59b6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
