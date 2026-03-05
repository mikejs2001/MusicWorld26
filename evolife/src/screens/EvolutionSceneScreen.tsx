import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../context/GameContext';
import { AttemptScript } from '../data/challenges';

const { width } = Dimensions.get('window');

type Phase =
  | 'intro'
  | 'attempting'
  | 'attempt-result'
  | 'final-success'
  | 'final-failure'
  | 'done';

const ATTEMPT_DELAY = 2400;
const RESULT_SHOW = 1600;

export default function EvolutionSceneScreen() {
  const { state, currentStage, currentChallenge, dispatch } = useGame();

  const [phase, setPhase] = useState<Phase>('intro');
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [narration, setNarration] = useState('');
  const [outcomeEmoji, setOutcomeEmoji] = useState('');
  const [showBoost, setShowBoost] = useState(false);
  const [roundTaps, setRoundTaps] = useState(0);
  const [displayTaps, setDisplayTaps] = useState(0);

  // Stable ref for tap count — safe inside setTimeout closures
  const totalTapsRef = useRef(0);

  // Determine success/failure per challenge using difficulty-based RNG.
  // Uses refs so the value is stable across re-renders but recomputed for each new challenge.
  const willSucceedRef = useRef<boolean>(true);
  const resolvedChallengeIdRef = useRef<string>('');

  // Creature animations
  const creatureScale = useRef(new Animated.Value(1)).current;
  const creatureX = useRef(new Animated.Value(0)).current;
  const creatureOpacity = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const narrationOpacity = useRef(new Animated.Value(0)).current;
  const outcomeScale = useRef(new Animated.Value(0)).current;

  // Boost button animations
  const boostOpacity = useRef(new Animated.Value(0)).current;
  const boostScale = useRef(new Animated.Value(1)).current;
  const boostGlow = useRef(new Animated.Value(0.4)).current;

  if (!currentChallenge) return null;

  // Recompute success probability once per unique challenge
  if (resolvedChallengeIdRef.current !== currentChallenge.id) {
    const successRate: Record<1 | 2 | 3, number> = { 1: 0.78, 2: 0.55, 3: 0.35 };
    willSucceedRef.current = Math.random() < successRate[currentChallenge.difficulty];
    resolvedChallengeIdRef.current = currentChallenge.id;
  }

  const success = willSucceedRef.current;
  const attempts: AttemptScript[] = success
    ? currentChallenge.attempts
    : [
        ...currentChallenge.attempts.slice(0, -1),
        { text: currentChallenge.failureNarrative, outcome: 'fail' as const },
      ];

  // ─── Creature animations ────────────────────────────────────────────────────

  const shakeCreature = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 14, duration: 75, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -14, duration: 75, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 9, duration: 75, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -9, duration: 75, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 75, useNativeDriver: true }),
    ]).start();
  };

  const bounceCreature = () => {
    Animated.sequence([
      Animated.spring(creatureScale, { toValue: 1.45, useNativeDriver: true, friction: 3 }),
      Animated.spring(creatureScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
  };

  const flashScreen = () => {
    flashOpacity.setValue(0.55);
    Animated.timing(flashOpacity, { toValue: 0, duration: 700, useNativeDriver: true }).start();
  };

  const showNarration = (text: string) => {
    setNarration(text);
    narrationOpacity.setValue(0);
    Animated.timing(narrationOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  };

  const showOutcome = (emoji: string) => {
    setOutcomeEmoji(emoji);
    outcomeScale.setValue(0);
    Animated.spring(outcomeScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  };

  // ─── Boost button ────────────────────────────────────────────────────────────

  const showBoostButton = () => {
    setShowBoost(true);
    setRoundTaps(0);
    Animated.timing(boostOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    // Pulsing glow loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(boostGlow, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(boostGlow, { toValue: 0.4, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  };

  const hideBoostButton = () => {
    setShowBoost(false);
    boostGlow.stopAnimation();
    Animated.timing(boostOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  };

  const handleBoostTap = () => {
    totalTapsRef.current += 1;
    setDisplayTaps(totalTapsRef.current);
    setRoundTaps((prev) => prev + 1);

    Animated.sequence([
      Animated.timing(boostScale, { toValue: 0.86, duration: 55, useNativeDriver: true }),
      Animated.spring(boostScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  // ─── Attempt sequence ────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'intro') return;
    showNarration(`🧬 Trial: ${currentChallenge.name}`);
    const timer = setTimeout(() => {
      setPhase('attempting');
      runAttempt(0);
    }, 1400);
    return () => clearTimeout(timer);
  }, [phase]);

  const runAttempt = (idx: number) => {
    if (idx >= attempts.length) return;
    const attempt = attempts[idx];
    setAttemptIndex(idx);
    setPhase('attempting');
    showNarration(attempt.text);

    // Show boost button 350ms after narration
    const boostTimer = setTimeout(() => showBoostButton(), 350);

    // Creature reaction at 600ms
    const reactionTimer = setTimeout(() => {
      if (attempt.outcome === 'fail') {
        shakeCreature();
        flashScreen();
        showOutcome('💥');
      } else if (attempt.outcome === 'near-miss') {
        shakeCreature();
        showOutcome('😰');
      } else {
        bounceCreature();
        flashScreen();
        showOutcome('✨');
      }
    }, 600);

    // End of attempt window
    const endTimer = setTimeout(() => {
      hideBoostButton();
      outcomeScale.setValue(0);

      if (idx + 1 < attempts.length) {
        setTimeout(() => runAttempt(idx + 1), 350);
      } else {
        setTimeout(() => finalize(success), 350);
      }
    }, ATTEMPT_DELAY);

    return () => {
      clearTimeout(boostTimer);
      clearTimeout(reactionTimer);
      clearTimeout(endTimer);
    };
  };

  const finalize = (won: boolean) => {
    hideBoostButton();

    if (won) {
      setPhase('final-success');
      showNarration(currentChallenge.successNarrative);
      bounceCreature();
      flashScreen();
      Animated.sequence([
        Animated.timing(creatureScale, { toValue: 1.5, duration: 500, useNativeDriver: true }),
        Animated.spring(creatureScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    } else {
      setPhase('final-failure');
      showNarration(currentChallenge.failureNarrative);
      shakeCreature();
      Animated.sequence([
        Animated.timing(creatureOpacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        Animated.timing(creatureOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }

    // Dispatch tap bonus (every 5 taps = +1 evolution point)
    const tapBonus = Math.floor(totalTapsRef.current / 5);
    if (tapBonus > 0) {
      dispatch({ type: 'ADD_TAP_BONUS', points: tapBonus });
    }

    setTimeout(() => {
      dispatch({
        type: 'RECORD_RESULT',
        result: {
          challenge: currentChallenge,
          success: won,
          evolutionPointsGained: currentChallenge.evolutionReward,
        },
      });

      const isLastChallenge =
        state.currentChallengeIndex >= state.selectedChallenges.length - 1;

      if (isLastChallenge) {
        setTimeout(() => dispatch({ type: 'SHOW_RESULT' }), 900);
      } else {
        setTimeout(() => {
          dispatch({ type: 'NEXT_CHALLENGE' });
          setPhase('intro');
          setAttemptIndex(0);
          setNarration('');
          setDisplayTaps(totalTapsRef.current);
          outcomeScale.setValue(0);
          creatureOpacity.setValue(1);
          creatureScale.setValue(1);
        }, 900);
      }
    }, RESULT_SHOW);
  };

  const flashColor =
    phase === 'final-success' ? 'rgba(46,204,113,0.35)' : 'rgba(231,76,60,0.35)';

  const progressText = `Trial ${state.currentChallengeIndex + 1} of ${state.selectedChallenges.length}`;

  // Boost charge: how full is the next bonus point?
  const nextBonusProgress = (totalTapsRef.current % 5) / 5;
  const bonusEarned = Math.floor(totalTapsRef.current / 5);

  return (
    <LinearGradient colors={['#0d0d1a', '#1a0a2e']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Flash overlay */}
          <Animated.View
            pointerEvents="none"
            style={[styles.flash, { opacity: flashOpacity, backgroundColor: flashColor }]}
          />

          <Text style={styles.progressText}>{progressText}</Text>
          <Text style={styles.challengeTitle}>
            {currentChallenge.emoji} {currentChallenge.name}
          </Text>

          {/* Creature */}
          <View style={styles.creatureWrapper}>
            <Animated.Text
              style={[
                styles.creature,
                {
                  transform: [{ scale: creatureScale }, { translateX: shakeAnim }],
                  opacity: creatureOpacity,
                },
              ]}
            >
              {currentStage.emoji}
            </Animated.Text>

            <Animated.Text
              style={[styles.outcomeEmoji, { transform: [{ scale: outcomeScale }] }]}
            >
              {outcomeEmoji}
            </Animated.Text>
          </View>

          {/* Attempt dots */}
          <View style={styles.dots}>
            {attempts.map((a, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < attemptIndex && styles.dotDone,
                  i === attemptIndex && styles.dotActive,
                  a.outcome === 'success' && i <= attemptIndex && styles.dotSuccess,
                ]}
              />
            ))}
          </View>

          {/* Narration box */}
          <Animated.View style={[styles.narrationBox, { opacity: narrationOpacity }]}>
            <Text style={styles.narrationText}>{narration}</Text>
          </Animated.View>

          {/* ── ADAPT! Tap Button ─────────────────────────────────────────── */}
          <Animated.View
            style={[styles.boostArea, { opacity: boostOpacity }]}
            pointerEvents={showBoost ? 'auto' : 'none'}
          >
            <Animated.View style={{ transform: [{ scale: boostGlow.interpolate({ inputRange: [0.4, 1], outputRange: [1, 1.06] }) }] }}>
              <TouchableOpacity
                style={styles.boostButton}
                onPress={handleBoostTap}
                activeOpacity={0.75}
              >
                <Animated.View style={[styles.boostGlowRing, { opacity: boostGlow }]} />
                <Text style={styles.boostIcon}>⚡</Text>
                <Text style={styles.boostLabel}>ADAPT!</Text>
                {roundTaps > 0 && (
                  <Text style={styles.boostTapCount}>×{roundTaps}</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Charge bar */}
            <View style={styles.chargeRow}>
              <View style={styles.chargeTrack}>
                <View style={[styles.chargeFill, { width: `${nextBonusProgress * 100}%` }]} />
              </View>
              {bonusEarned > 0 && (
                <Text style={styles.bonusEarned}>+{bonusEarned} ⚡ bonus</Text>
              )}
            </View>
          </Animated.View>

          {/* Running tap total (always visible once tapping starts) */}
          {displayTaps > 0 && !showBoost && (
            <Text style={styles.tapTotal}>Boosts applied: ×{displayTaps}</Text>
          )}

          {/* Phase badge */}
          {phase === 'final-success' && (
            <View style={styles.resultBadge}>
              <Text style={styles.resultBadgeText}>🧬 Adaptation Achieved!</Text>
            </View>
          )}
          {phase === 'final-failure' && (
            <View style={[styles.resultBadge, styles.resultBadgeFail]}>
              <Text style={styles.resultBadgeText}>💀 Trial Failed</Text>
            </View>
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
  flash: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10,
  },
  progressText: {
    color: '#8899aa',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 4,
  },
  challengeTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 28,
    textAlign: 'center',
  },
  creatureWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  creature: { fontSize: 100 },
  outcomeEmoji: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: 42,
  },
  dots: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  dotDone: { backgroundColor: '#e74c3c' },
  dotActive: { backgroundColor: '#f39c12', transform: [{ scale: 1.3 }] },
  dotSuccess: { backgroundColor: '#2ecc71' },
  narrationBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  narrationText: {
    color: '#ddeeff',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // ── Boost area ───────────────────────────────────────────────────────────────
  boostArea: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  boostButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1a0a3e',
    borderWidth: 2.5,
    borderColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 12,
  },
  boostGlowRing: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 2,
    borderColor: '#a78bfa',
  },
  boostIcon: {
    fontSize: 32,
    marginBottom: 2,
  },
  boostLabel: {
    color: '#c4b5fd',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  boostTapCount: {
    color: '#f1c40f',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  chargeRow: {
    width: '70%',
    alignItems: 'center',
    gap: 4,
  },
  chargeTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 3,
    overflow: 'hidden',
  },
  chargeFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 3,
  },
  bonusEarned: {
    color: '#f1c40f',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  tapTotal: {
    color: '#8877aa',
    fontSize: 12,
    marginBottom: 8,
  },

  // ── Phase badges ─────────────────────────────────────────────────────────────
  resultBadge: {
    backgroundColor: 'rgba(46,204,113,0.2)',
    borderColor: '#2ecc71',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  resultBadgeFail: {
    backgroundColor: 'rgba(231,76,60,0.2)',
    borderColor: '#e74c3c',
  },
  resultBadgeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
