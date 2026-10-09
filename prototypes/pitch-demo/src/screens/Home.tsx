import type { ReactElement } from 'react';
import type { ScreenProps } from '../components/Phone';
import { voiceById } from '../data/content';
import { tonight } from '../lib/date';
import { useActions } from '../state/store';

export function Home({ state, live }: ScreenProps): ReactElement {
  const { go } = useActions(live);
  const voice = voiceById(state.voice);
  return (
    <div className="v pad">
      <div>
        <p className="k">{tonight()}</p>
        <h2 style={{ marginTop: 6 }}>Good evening.</h2>
      </div>
      <div className="tonight">
        <p className="k">Tonight</p>
        <h3>What&rsquo;s actually on your mind?</h3>
        <p>5&ndash;10 minutes. Nothing replies.</p>
        <button type="button" className="pb light" onClick={() => go('write')}>
          Start tonight&rsquo;s entry
        </button>
      </div>
      <button type="button" className="last" onClick={() => go('letter')}>
        <span className="k">Letters &middot; 12 so far</span>
        <b>Your latest letter from your {voice.name}</b>
        <span className="go">Read &rarr;</span>
      </button>
      <p className="k">Coming back this week</p>
      <div className="chips">
        <span>Feeling behind &middot; 3</span>
        <span>Photography &middot; 2</span>
        <span>Sleep &middot; 2</span>
      </div>
    </div>
  );
}
