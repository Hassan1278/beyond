/**
 * The phone. `chrome="frame"` draws the bezel, fake status bar and home
 * indicator for the pitch view; `chrome="device"` drops all three because the
 * real phone already has them, and uses the safe-area insets instead.
 */
import type { ReactElement, ReactNode } from 'react';
import type { BeyondState, ScreenMeta, TabId } from '../types';
import { Battery, Mail, Moon, Signal, Wave, Wifi, You } from './Icons';
import { Sheet } from './Sheet';
import { Welcome } from '../screens/Welcome';
import { VoicePick } from '../screens/VoicePick';
import { Home } from '../screens/Home';
import { Write } from '../screens/Write';
import { Sealed } from '../screens/Sealed';
import { Letter } from '../screens/Letter';
import { Patterns } from '../screens/Patterns';
import { MemorySettings } from '../screens/MemorySettings';
import { Safety } from '../screens/Safety';

export type Chrome = 'frame' | 'device';

export interface ScreenProps {
  state: BeyondState;
  /** false in the gallery, where screens are pictures rather than controls. */
  live: boolean;
}

const VIEWS: Record<ScreenMeta['id'], (p: ScreenProps) => ReactElement> = {
  welcome: Welcome,
  voice: VoicePick,
  home: Home,
  write: Write,
  sealed: Sealed,
  letter: Letter,
  patterns: Patterns,
  memory: MemorySettings,
  safety: Safety,
};

const TABS: { id: TabId; label: string; Icon: () => ReactElement }[] = [
  { id: 'home', label: 'Tonight', Icon: Moon },
  { id: 'letter', label: 'Letters', Icon: Mail },
  { id: 'patterns', label: 'Patterns', Icon: Wave },
  { id: 'memory', label: 'You', Icon: You },
];

function TabBar({
  current,
  live,
  onGo,
}: {
  current: TabId;
  live: boolean;
  onGo: (id: TabId) => void;
}): ReactElement {
  return (
    <nav className="tabs" aria-label="App tabs">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          tabIndex={live ? 0 : -1}
          aria-current={current === id ? 'page' : undefined}
          onClick={() => live && onGo(id)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Phone({
  screen,
  state,
  live,
  chrome,
  onGo,
  onCloseSheet,
  children,
}: {
  screen: ScreenMeta;
  state: BeyondState;
  live: boolean;
  chrome: Chrome;
  onGo: (id: TabId) => void;
  onCloseSheet: () => void;
  /** The QR dialog and other overlays the presenter adds. */
  children?: ReactNode;
}): ReactElement {
  const View = VIEWS[screen.id];
  return (
    <div className={`phone${chrome === 'device' ? ' device' : ''}`}>
      <div className={`screen ${screen.theme}`}>
        {chrome === 'frame' && (
          <div className="sb">
            <span>{screen.time}</span>
            <span className="isl" />
            <span className="icons">
              <Signal />
              <Wifi />
              <Battery />
            </span>
          </div>
        )}
        <div className="view">
          <View state={state} live={live} />
        </div>
        {screen.tab && <TabBar current={screen.tab} live={live} onGo={onGo} />}
        {chrome === 'frame' && <div className="hi" />}
        {live && state.sheet && <Sheet state={state} onClose={onCloseSheet} />}
        {children}
      </div>
    </div>
  );
}
