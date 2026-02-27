import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
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

const ATTEMPT_DELAY = 2200;
const RESULT_SHOW = 1500;

export default function EvolutionSceneScreen() {
  const { state, currentStage, currentChallenge, dispatch } = useGame();

  const [phase, setPhase] = useState<Phase>('intro');
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [narration, setNarration] = useState('');
  const [outcomeEmoji, setOutcomeEmoji] = useState('');

  // Animations
  const creatureScale = useRef(new Animated.Value(1)).current;
  const creatureX = useRef(new Animated.Value(0)).current;
  const creatureOpacity = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const narrationOpacity = useRef(new Animated.Value(0)).current;
  const outcomeScale = useRef(new Animated.Value(0)).current;

  if (!currentChallenge) return null;

  const attempts: AttemptScript[] = currentChallenge.attempts;
  const finalOutcome = attempts[attempts.length - 1].outcome;
  const success = finalOutcome === 'success';

  const shakeCreature = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const bounceCreature = () => {
    Animated.sequence([
      Animated.spring(creatureScale, { toValue: 1.4, useNativeDriver: true, friction: 3 }),
      Animated.spring(creatureScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
  };

  const flashScreen = (color: string) => {
    flashOpacity.setValue(0.6);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const showNarration = (text: string) => {
    setNarration(text);
    narrationOpacity.setValue(0);
    Animated.timing(narrationOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const showOutcome = (emoji: string) => {
    setOutcomeEmoji(emoji);
    outcomeScale.setValue(0);
    Animated.spring(outcomeScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
    }).start();
  };

  // Run the attempt animation sequence
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

    // Creature action animation
    if (attempt.outcome === 'fail') {
      setTimeout(() => {
        shakeCreature();
        flashScreen('#e74c3c');
        showOutcome('💥');
      }, 600);
    } else if (attempt.outcome === 'near-miss') {
      setTimeout(() => {
        shakeCreature();
        showOutcome('😰');
      }, 600);
    } else {
      setTimeout(() => {
        bounceCreature();
        flashScreen('#2ecc71');
        showOutcome('✨');
      }, 600);
    }

    setTimeout(() => {
      outcomeScale.setValue(0);
      if (idx + 1 < attempts.length) {
        setTimeout(() => runAttempt(idx + 1), 400);
      } else {
        // All attempts done
        setTimeout(() => finalize(success), 400);
      }
    }, ATTEMPT_DELAY);
  };

  const finalize = (won: boolean) => {
    if (won) {
      setPhase('final-success');
      showNarration(currentChallenge.successNarrative);
      bounceCreature();
      flashScreen('#2ecc71');

      // Glow + grow animation
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

    // Record result and move on
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
        setTimeout(() => dispatch({ type: 'SHOW_RESULT' }), 800);
      } else {
        setTimeout(() => {
          dispatch({ type: 'NEXT_CHALLENGE' });
          setPhase('intro');
          setAttemptIndex(0);
          setNarration('');
          outcomeScale.setValue(0);
          creatureOpacity.setValue(1);
          creatureScale.setValue(1);
        }, 800);
      }
    }, RESULT_SHOW);
  };

  const flashColor =
    phase === 'final-success' ? 'rgba(46,204,113,0.35)' : 'rgba(231,76,60,0.35)';

  const progressText = `Trial ${state.currentChallengeIndex + 1} of ${state.selectedChallenges.length}`;

  return (
    <LinearGradient colors={['#0d0d1a', '#1a0a2e']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Flash overlay */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.flash,
              { opacity: flashOpacity, backgroundColor: flashColor },
            ]}
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
                  transform: [
                    { scale: creatureScale },
                    { translateX: shakeAnim },
                  ],
                  opacity: creatureOpacity,
                },
              ]}
            >
              {currentStage.emoji}
            </Animated.Text>

            {/* Outcome emoji overlay */}
            <Animated.Text
              style={[
                styles.outcomeEmoji,
                { transform: [{ scale: outcomeScale }] },
              ]}
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

          {/* Phase indicator */}
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
    marginBottom: 32,
    textAlign: 'center',
  },
  creatureWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  creature: {
    fontSize: 100,
  },
  outcomeEmoji: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: 42,
  },
  dots: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
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
