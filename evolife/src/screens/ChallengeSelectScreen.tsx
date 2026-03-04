import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../context/GameContext';
import { getChallengesForStage, Challenge } from '../data/challenges';

const MAX_SELECTIONS = 3;

export default function ChallengeSelectScreen() {
  const { state, currentStage, dispatch } = useGame();
  const [selected, setSelected] = useState<Challenge[]>([]);

  const available = getChallengesForStage(state.stageIndex);

  const cardAnims = useRef(
    available.map(() => ({
      translateY: new Animated.Value(40),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    Animated.stagger(
      70,
      cardAnims.map((anim) =>
        Animated.parallel([
          Animated.timing(anim.translateY, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.timing(anim.opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        ])
      )
    ).start();
  }, []);

  const toggle = (challenge: Challenge, idx: number) => {
    setSelected((prev) => {
      const isSelected = prev.some((c) => c.id === challenge.id);
      if (isSelected) return prev.filter((c) => c.id !== challenge.id);
      if (prev.length >= MAX_SELECTIONS) return prev;
      return [...prev, challenge];
    });

    const anim = cardAnims[idx];
    Animated.sequence([
      Animated.timing(anim.scale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.spring(anim.scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  };

  const isSelected = (id: string) => selected.some((c) => c.id === id);

  const difficultyLabel = (d: 1 | 2 | 3) => {
    if (d === 1) return { text: 'Easy', color: '#2ecc71' };
    if (d === 2) return { text: 'Medium', color: '#f39c12' };
    return { text: 'Hard', color: '#e74c3c' };
  };

  return (
    <LinearGradient colors={['#0d1b2a', '#1a2a3a']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.creature}>{currentStage.emoji}</Text>
          <Text style={styles.title}>Choose Your Trials</Text>
          <Text style={styles.subtitle}>
            Select up to {MAX_SELECTIONS} challenges for {currentStage.name}
          </Text>
          <Text style={styles.counter}>
            {selected.length} / {MAX_SELECTIONS} selected
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {available.map((challenge, idx) => {
            const sel = isSelected(challenge.id);
            const diff = difficultyLabel(challenge.difficulty);
            const anim = cardAnims[idx];
            return (
              <Animated.View
                key={challenge.id}
                style={{
                  transform: [{ translateY: anim.translateY }, { scale: anim.scale }],
                  opacity: anim.opacity,
                }}
              >
                <TouchableOpacity
                  onPress={() => toggle(challenge, idx)}
                  activeOpacity={0.85}
                  style={[styles.card, sel && styles.cardSelected]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.challengeEmoji}>{challenge.emoji}</Text>
                    <View style={styles.cardInfo}>
                      <Text style={styles.challengeName}>{challenge.name}</Text>
                      <View style={styles.badges}>
                        <Text style={[styles.badge, { color: diff.color, borderColor: diff.color }]}>
                          {diff.text}
                        </Text>
                        <Text style={styles.reward}>⚡+{challenge.evolutionReward}</Text>
                      </View>
                    </View>
                    {sel && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.challengeDesc}>{challenge.description}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.startButton, selected.length === 0 && styles.startButtonDisabled]}
            onPress={() => {
              if (selected.length > 0) {
                dispatch({ type: 'SELECT_CHALLENGES', challenges: selected });
              }
            }}
            disabled={selected.length === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>
              {selected.length === 0
                ? 'Select at least one trial'
                : `⚗️ Begin ${selected.length} Trial${selected.length > 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  creature: { fontSize: 50, marginBottom: 6 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#88aacc',
    marginTop: 4,
    textAlign: 'center',
  },
  counter: {
    marginTop: 6,
    fontSize: 13,
    color: '#f1c40f',
    fontWeight: '600',
  },
  scroll: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#27ae60',
    backgroundColor: '#0d2a1a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeEmoji: { fontSize: 32, marginRight: 12 },
  cardInfo: { flex: 1 },
  challengeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  badges: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  reward: {
    fontSize: 12,
    color: '#f1c40f',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 22,
    color: '#2ecc71',
    fontWeight: '900',
  },
  challengeDesc: {
    fontSize: 13,
    color: '#8899aa',
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
  },
  startButton: {
    backgroundColor: '#8e44ad',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#9b59b6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonDisabled: {
    backgroundColor: '#3d3d5c',
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
