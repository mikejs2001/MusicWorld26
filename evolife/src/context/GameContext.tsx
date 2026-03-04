import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Challenge } from '../data/challenges';
import { EVOLUTION_STAGES, EvolutionStage } from '../data/creatures';

export type GamePhase =
  | 'home'
  | 'challenge-select'
  | 'evolution-scene'
  | 'result'
  | 'evolved';

export type ChallengeResult = {
  challenge: Challenge;
  success: boolean;
  evolutionPointsGained: number;
};

export type GameState = {
  phase: GamePhase;
  stageIndex: number;
  evolutionPoints: number;
  selectedChallenges: Challenge[];
  currentChallengeIndex: number;
  challengeResults: ChallengeResult[];
  totalSuccesses: number;
  tapBonus: number;
};

const initialState: GameState = {
  phase: 'home',
  stageIndex: 0,
  evolutionPoints: 0,
  selectedChallenges: [],
  currentChallengeIndex: 0,
  challengeResults: [],
  totalSuccesses: 0,
  tapBonus: 0,
};

type Action =
  | { type: 'START_CHALLENGE_SELECT' }
  | { type: 'SELECT_CHALLENGES'; challenges: Challenge[] }
  | { type: 'START_EVOLUTION_SCENE' }
  | { type: 'RECORD_RESULT'; result: ChallengeResult }
  | { type: 'NEXT_CHALLENGE' }
  | { type: 'SHOW_RESULT' }
  | { type: 'EVOLVE' }
  | { type: 'CONTINUE_TO_NEXT_ROUND' }
  | { type: 'ADD_TAP_BONUS'; points: number }
  | { type: 'RESET' };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_CHALLENGE_SELECT':
      return {
        ...state,
        phase: 'challenge-select',
        selectedChallenges: [],
        currentChallengeIndex: 0,
        challengeResults: [],
        tapBonus: 0,
      };

    case 'SELECT_CHALLENGES':
      return {
        ...state,
        selectedChallenges: action.challenges,
        phase: 'evolution-scene',
        currentChallengeIndex: 0,
        challengeResults: [],
      };

    case 'START_EVOLUTION_SCENE':
      return { ...state, phase: 'evolution-scene' };

    case 'RECORD_RESULT': {
      const newResults = [...state.challengeResults, action.result];
      const pointsGained = action.result.success ? action.result.evolutionPointsGained : 0;
      return {
        ...state,
        challengeResults: newResults,
        evolutionPoints: state.evolutionPoints + pointsGained,
        totalSuccesses: state.totalSuccesses + (action.result.success ? 1 : 0),
      };
    }

    case 'NEXT_CHALLENGE':
      return {
        ...state,
        currentChallengeIndex: state.currentChallengeIndex + 1,
      };

    case 'SHOW_RESULT':
      return { ...state, phase: 'result' };

    case 'EVOLVE': {
      const currentStage = EVOLUTION_STAGES[state.stageIndex];
      const shouldEvolve = state.evolutionPoints >= currentStage.evolvesAt;
      const nextStageIndex = shouldEvolve
        ? Math.min(state.stageIndex + 1, EVOLUTION_STAGES.length - 1)
        : state.stageIndex;
      const remainingPoints = shouldEvolve
        ? state.evolutionPoints - currentStage.evolvesAt
        : state.evolutionPoints;

      return {
        ...state,
        phase: shouldEvolve ? 'evolved' : 'result',
        stageIndex: nextStageIndex,
        evolutionPoints: remainingPoints,
      };
    }

    case 'ADD_TAP_BONUS':
      return {
        ...state,
        evolutionPoints: state.evolutionPoints + action.points,
        tapBonus: state.tapBonus + action.points,
      };

    case 'CONTINUE_TO_NEXT_ROUND':
      return {
        ...state,
        phase: 'challenge-select',
        selectedChallenges: [],
        currentChallengeIndex: 0,
        challengeResults: [],
        tapBonus: 0,
      };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

type GameContextType = {
  state: GameState;
  currentStage: EvolutionStage;
  dispatch: React.Dispatch<Action>;
  currentChallenge: Challenge | null;
  evolutionProgress: number; // 0–1
};

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const currentStage = EVOLUTION_STAGES[state.stageIndex];
  const currentChallenge = state.selectedChallenges[state.currentChallengeIndex] ?? null;
  const evolutionProgress = Math.min(
    state.evolutionPoints / (currentStage?.evolvesAt ?? 3),
    1
  );

  return (
    <GameContext.Provider value={{ state, currentStage, dispatch, currentChallenge, evolutionProgress }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
