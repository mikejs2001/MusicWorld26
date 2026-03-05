import { StatusBar } from 'expo-status-bar';
import { GameProvider, useGame } from './src/context/GameContext';
import HomeScreen from './src/screens/HomeScreen';
import ChallengeSelectScreen from './src/screens/ChallengeSelectScreen';
import EvolutionSceneScreen from './src/screens/EvolutionSceneScreen';
import ResultScreen from './src/screens/ResultScreen';
import EvolvedScreen from './src/screens/EvolvedScreen';
import GameCompleteScreen from './src/screens/GameCompleteScreen';

function GameNavigator() {
  const { state } = useGame();

  switch (state.phase) {
    case 'home':
      return <HomeScreen />;
    case 'challenge-select':
      return <ChallengeSelectScreen />;
    case 'evolution-scene':
      return <EvolutionSceneScreen />;
    case 'result':
      return <ResultScreen />;
    case 'evolved':
      return <EvolvedScreen />;
    case 'game-complete':
      return <GameCompleteScreen />;
    default:
      return <HomeScreen />;
  }
}

export default function App() {
  return (
    <GameProvider>
      <StatusBar style="light" />
      <GameNavigator />
    </GameProvider>
  );
}
