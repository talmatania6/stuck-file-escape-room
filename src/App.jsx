import { useEffect } from 'react';
import { useGame } from './game/store';
import { HubScreen, RoomScreen, StartScreen, VictoryScreen } from './screens/Screens';
import { IntroVideo } from './ui/IntroVideo';
import { Bubble } from './ui/Bubble';
import { Fade, HoverLabel, TimeUp } from './ui/Panels';
import { Admin } from './ui/Admin';
import { SettingsPanel } from './ui/Settings';
import { AppBoundary } from './engine/SafeCanvas';
import { Toast } from './ui/Toast';
import { HintPanel } from './ui/Hint';
import { ResetConfirm } from './ui/ResetConfirm';
import { stopVoice } from './audio/voice';

export default function App() {
  const screen = useGame((s) => s.screen);
  const startedAt = useGame((s) => s.startedAt);
  const calm = useGame((s) => s.reduceMotion);
  const setScreen = useGame((s) => s.setScreen);

  // A reload resumes from the start screen ("להמשיך"): browsers need one click before sound.
  useEffect(() => {
    if (startedAt && screen !== 'start') setScreen('start');
    if (!startedAt && screen !== 'start' && screen !== 'onboarding') setScreen('start');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.classList.toggle('reduce-motion', calm);
  }, [calm]);

  // never let a line keep talking over a different screen
  useEffect(() => { stopVoice(); }, [screen]);

  return (
    <AppBoundary>
      {screen === 'start' && <StartScreen />}
      {screen === 'onboarding' && <IntroVideo />}
      {screen === 'hub' && <HubScreen />}
      {screen === 'room' && <RoomScreen />}
      {screen === 'victory' && <VictoryScreen />}
      {['hub', 'room'].includes(screen) && <Bubble />}
      <HoverLabel />
      <TimeUp />
      <Fade />
      <SettingsPanel />
      <Admin />
      <HintPanel />
      <ResetConfirm />
      <Toast />
    </AppBoundary>
  );
}
