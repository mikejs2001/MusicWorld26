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

const { width } = Dimensions.get('window');
const BAR_W = width - 80;
const BALL_SIZE = 26;

// Difficulty tuning
const ZONE_FRAC: Record<1 | 2 | 3, number> = { 1: 0.38, 2: 0.24, 3: 0.16 };
const SWEEP_MS: Record<1 | 2 | 3, number> = { 1: 2000, 2: 1350, 3: 900 };
const AUTO_MS: Record<1 | 2 | 3, number> = { 1: 5000, 2: 4200, 3: 3500 };
// Hits needed out of 3 attempts to succeed
const HIT_NEEDED: Record<1 | 2 | 3, number> = { 1: 2, 2: 2, 3: 1 };

type AttemptQuality = 'perfect' | 'good' | 'miss';
type MiniPhase = 'intro' | 'timing' | 'attempt-done' | 'finalizing';

export default function EvolutionSceneScreen() {
  const { state, currentStage, currentChallenge, dispatch } = useGame();

  const [miniPhase, setMiniPhase] = useState<MiniPhase>('intro');
  const [attemptIdx, setAttemptIdx] = useState(0);
  const [attemptResults, setAttemptResults] = useState<(AttemptQuality | null)[]>([null, null, null]);
  const [lastQuality, setLastQuality] = useState<AttemptQuality | null>(null);
  const [showFinalBadge, setShowFinalBadge] = useState<'success' | 'fail' | null>(null);
  const [narration, setNarration] = useState('');

  // Stable refs for use in closures / effects
  const miniPhaseRef = useRef<MiniPhase>('intro');
  const attemptIdxRef = useRef(0);
  const attemptResultsRef = useRef<(AttemptQuality | null)[]>([null, null, null]);
  const hitsRef = useRef(0);
  const bonusPtsRef = useRef(0);

  useEffect(() => { miniPhaseRef.current = miniPhase; }, [miniPhase]);
  useEffect(() => { attemptIdxRef.current = attemptIdx; }, [attemptIdx]);

  // Animated values
  const ballPos = useRef(new Animated.Value(0)).current;
  const ballPosVal = useRef(0);
  const creatureScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const narrationOpacity = useRef(new Animated.Value(0)).current;
  const qualityScale = useRef(new Animated.Value(0)).current;
  const barOpacity = useRef(new Animated.Value(0)).current;

  // Track ball position on JS thread for tap-detection
  useEffect(() => {
    const id = ballPos.addListener(({ value }) => {
      ballPosVal.current = value;
    });
    return () => ballPos.removeListener(id);
  }, []);

  if (!currentChallenge) return null;

  const diff = currentChallenge.difficulty as 1 | 2 | 3;
  const zoneWidth = BAR_W * ZONE_FRAC[diff];
  const zoneLeft = (BAR_W - zoneWidth) / 2;

  // ── Animation helpers ──────────────────────────────────────────────────────

  const shakeCreature = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 13, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -13, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const bounceCreature = () => {
    Animated.sequence([
      Animated.spring(creatureScale, { toValue: 1.5, useNativeDriver: true, friction: 3 }),
      Animated.spring(creatureScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
  };

  const flashScreen = () => {
    flashOpacity.setValue(0.6);
    Animated.timing(flashOpacity, { toValue: 0, duration: 700, useNativeDriver: true }).start();
  };

  const showNarration = (text: string) => {
    setNarration(text);
    narrationOpacity.setValue(0);
    Animated.timing(narrationOpacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  };

  const startBall = () => {
    ballPos.setValue(0);
    barOpacity.setValue(0);
    Animated.timing(barOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    // useNativeDriver: false because we need to read ballPosVal via listener
    Animated.loop(
      Animated.sequence([
        Animated.timing(ballPos, { toValue: 1, duration: SWEEP_MS[diff], useNativeDriver: false }),
        Animated.timing(ballPos, { toValue: 0, duration: SWEEP_MS[diff], useNativeDriver: false }),
      ])
    ).start();
  };

  // ── Core game logic ────────────────────────────────────────────────────────

  const processAttemptResult = (quality: AttemptQuality) => {
    ballPos.stopAnimation();
    Animated.timing(barOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();

    const hit = quality !== 'miss';
    if (hit) {
      hitsRef.current += 1;
      if (quality === 'perfect') bonusPtsRef.current += 1;
      bounceCreature();
    } else {
      shakeCreature();
    }
    flashScreen();

    setLastQuality(quality);
    const newResults: (AttemptQuality | null)[] = [...attemptResultsRef.current];
    newResults[attemptIdxRef.current] = quality;
    attemptResultsRef.current = newResults;
    setAttemptResults([...newResults]);

    qualityScale.setValue(0);
    Animated.spring(qualityScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

    setMiniPhase('attempt-done');

    setTimeout(() => {
      const nextIdx = attemptIdxRef.current + 1;
      if (nextIdx < 3) {
        setAttemptIdx(nextIdx);
        setLastQuality(null);
        showNarration(currentChallenge.attempts[nextIdx]?.text ?? '');
        setMiniPhase('timing');
      } else {
        setMiniPhase('finalizing');
      }
    }, 1200);
  };

  const handleAdapt = () => {
    if (miniPhaseRef.current !== 'timing') return;

    // Determine where ball center is in pixels
    const ballCenter = ballPosVal.current * (BAR_W - BALL_SIZE) + BALL_SIZE / 2;
    const inZone = ballCenter >= zoneLeft && ballCenter <= zoneLeft + zoneWidth;

    let quality: AttemptQuality = 'miss';
    if (inZone) {
      const distFromCenter = Math.abs(ballCenter - BAR_W / 2);
      quality = distFromCenter < zoneWidth * 0.33 ? 'perfect' : 'good';
    }

    processAttemptResult(quality);
  };

  // ── Effects ────────────────────────────────────────────────────────────────

  // Reset and start intro when challenge changes
  useEffect(() => {
    setMiniPhase('intro');
    setAttemptIdx(0);
    setAttemptResults([null, null, null]);
    setLastQuality(null);
    setShowFinalBadge(null);
    hitsRef.current = 0;
    bonusPtsRef.current = 0;
    miniPhaseRef.current = 'intro';
    attemptIdxRef.current = 0;
    attemptResultsRef.current = [null, null, null];

    showNarration(`🧬 Trial: ${currentChallenge.name}`);
    const t = setTimeout(() => {
      showNarration(currentChallenge.attempts[0]?.text ?? '');
      setMiniPhase('timing');
    }, 1300);
    return () => clearTimeout(t);
  }, [currentChallenge.id]);

  // Start ball and auto-miss timer when timing phase activates
  useEffect(() => {
    if (miniPhase !== 'timing') return;
    startBall();

    const autoMiss = setTimeout(() => {
      if (miniPhaseRef.current === 'timing') {
        processAttemptResult('miss');
      }
    }, AUTO_MS[diff]);

    return () => {
      clearTimeout(autoMiss);
      ballPos.stopAnimation();
    };
  }, [miniPhase, attemptIdx]);

  // Handle finalizing: determine win/loss, dispatch result
  useEffect(() => {
    if (miniPhase !== 'finalizing' || !currentChallenge) return;

    const won = hitsRef.current >= HIT_NEEDED[diff];
    const bonus = won ? bonusPtsRef.current : 0;

    setShowFinalBadge(won ? 'success' : 'fail');
    if (won) {
      showNarration(currentChallenge.successNarrative);
      bounceCreature();
    } else {
      showNarration(currentChallenge.failureNarrative);
      shakeCreature();
    }
    flashScreen();

    const t1 = setTimeout(() => {
      dispatch({
        type: 'RECORD_RESULT',
        result: {
          challenge: currentChallenge,
          success: won,
          evolutionPointsGained: currentChallenge.evolutionReward + bonus,
        },
      });

      const isLast = state.currentChallengeIndex >= state.selectedChallenges.length - 1;
      const t2 = setTimeout(() => {
        if (isLast) {
          dispatch({ type: 'SHOW_RESULT' });
        } else {
          dispatch({ type: 'NEXT_CHALLENGE' });
        }
      }, 700);
      return () => clearTimeout(t2);
    }, 1800);

    return () => clearTimeout(t1);
  }, [miniPhase]);

  // ── Derived render values ──────────────────────────────────────────────────

  const ballTranslateX = ballPos.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BAR_W - BALL_SIZE],
  });

  const progressText = `Trial ${state.currentChallengeIndex + 1} of ${state.selectedChallenges.length}`;
  const diffColors: Record<1 | 2 | 3, string> = { 1: '#2ecc71', 2: '#f39c12', 3: '#e74c3c' };
  const diffLabels: Record<1 | 2 | 3, string> = { 1: 'EASY', 2: 'MEDIUM', 3: 'HARD' };
  const hintTexts: Record<1 | 2 | 3, string> = {
    1: 'Tap ADAPT! when the ball is in the zone',
    2: 'Time your tap — zone is narrower!',
    3: 'Precision required — tiny zone, fast ball!',
  };

  return (
    <LinearGradient colors={['#0d0d1a', '#1a0a2e']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Flash overlay */}
          <Animated.View
            pointerEvents="none"
            style={[styles.flash, { opacity: flashOpacity }]}
          />

          {/* Header */}
          <Text style={styles.progressText}>{progressText}</Text>
          <View style={styles.challengeRow}>
            <Text style={styles.challengeTitle}>
              {currentChallenge.emoji} {currentChallenge.name}
            </Text>
            <View style={[styles.diffBadge, { borderColor: diffColors[diff] }]}>
              <Text style={[styles.diffText, { color: diffColors[diff] }]}>{diffLabels[diff]}</Text>
            </View>
          </View>

          {/* Creature */}
          <Animated.Text
            style={[
              styles.creature,
              { transform: [{ scale: creatureScale }, { translateX: shakeAnim }] },
            ]}
          >
            {currentStage.emoji}
          </Animated.Text>

          {/* Narration */}
          <Animated.View style={[styles.narrationBox, { opacity: narrationOpacity }]}>
            <Text style={styles.narrationText}>{narration}</Text>
          </Animated.View>

          {/* ── TIMING BAR ── */}
          <Animated.View style={[styles.barArea, { opacity: barOpacity }]}>
            <Text style={styles.barHint}>{hintTexts[diff]}</Text>
            <View style={[styles.barTrack, { width: BAR_W }]}>
              {/* Green target zone */}
              <View style={[styles.zone, { left: zoneLeft, width: zoneWidth }]} />
              {/* Moving ball */}
              <Animated.View
                style={[styles.ball, { transform: [{ translateX: ballTranslateX }] }]}
              />
            </View>
          </Animated.View>

          {/* Attempt dots */}
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => {
              const res = attemptResults[i];
              const isActive = i === attemptIdx && miniPhase === 'timing';
              return (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    isActive && styles.dotActive,
                    res === 'perfect' && styles.dotPerfect,
                    res === 'good' && styles.dotGood,
                    res === 'miss' && styles.dotMiss,
                  ]}
                />
              );
            })}
          </View>

          {/* Hit quality feedback */}
          {lastQuality && (
            <Animated.Text
              style={[
                styles.qualityLabel,
                lastQuality === 'perfect' ? styles.qualPerfect
                  : lastQuality === 'good' ? styles.qualGood
                  : styles.qualMiss,
                { transform: [{ scale: qualityScale }] },
              ]}
            >
              {lastQuality === 'perfect'
                ? '⚡ PERFECT!  +1 bonus pt'
                : lastQuality === 'good'
                ? '✓ GOOD!'
                : '✗ MISS!'}
            </Animated.Text>
          )}

          {/* ADAPT button */}
          <TouchableOpacity
            style={[
              styles.adaptButton,
              miniPhase !== 'timing' && styles.adaptButtonDim,
            ]}
            onPress={handleAdapt}
            activeOpacity={0.75}
          >
            <Text style={styles.adaptIcon}>⚡</Text>
            <Text style={styles.adaptLabel}>ADAPT!</Text>
          </TouchableOpacity>

          {/* Final result badge */}
          {showFinalBadge === 'success' && (
            <View style={styles.finalBadge}>
              <Text style={styles.finalBadgeText}>🧬 Adaptation Achieved!</Text>
            </View>
          )}
          {showFinalBadge === 'fail' && (
            <View style={[styles.finalBadge, styles.finalBadgeFail]}>
              <Text style={styles.finalBadgeText}>💀 Trial Failed</Text>
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
    backgroundColor: 'rgba(255,255,255,0.22)',
    zIndex: 10,
  },

  // Header
  progressText: {
    color: '#8899aa',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 4,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  challengeTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  diffBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  diffText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Creature
  creature: {
    fontSize: 88,
    marginBottom: 14,
  },

  // Narration
  narrationBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  narrationText: {
    color: '#ddeeff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Timing bar
  barArea: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  barHint: {
    color: '#aabbcc',
    fontSize: 11,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  barTrack: {
    height: 32,
    backgroundColor: '#111128',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2a2a4e',
  },
  zone: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(46,204,113,0.3)',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#2ecc71',
  },
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: '#ffffff',
    top: (32 - BALL_SIZE) / 2,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },

  // Attempt dots
  dots: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1e1e3a',
    borderWidth: 1.5,
    borderColor: '#444',
  },
  dotActive: {
    backgroundColor: '#f39c12',
    borderColor: '#f1c40f',
    transform: [{ scale: 1.3 }],
  },
  dotPerfect: { backgroundColor: '#f1c40f', borderColor: '#f1c40f' },
  dotGood: { backgroundColor: '#2ecc71', borderColor: '#2ecc71' },
  dotMiss: { backgroundColor: '#e74c3c', borderColor: '#e74c3c' },

  // Quality feedback label
  qualityLabel: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  qualPerfect: { color: '#f1c40f' },
  qualGood: { color: '#2ecc71' },
  qualMiss: { color: '#e74c3c' },

  // ADAPT button
  adaptButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a0a3e',
    borderWidth: 3,
    borderColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 16,
  },
  adaptButtonDim: {
    opacity: 0.3,
    borderColor: '#444',
    shadowOpacity: 0,
  },
  adaptIcon: { fontSize: 34 },
  adaptLabel: {
    color: '#c4b5fd',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 2,
  },

  // Final badge
  finalBadge: {
    backgroundColor: 'rgba(46,204,113,0.15)',
    borderColor: '#2ecc71',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  finalBadgeFail: {
    backgroundColor: 'rgba(231,76,60,0.15)',
    borderColor: '#e74c3c',
  },
  finalBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
