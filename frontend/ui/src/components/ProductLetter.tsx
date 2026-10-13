import { useState } from 'react';
import { useBeyond } from '../state/store';
export function ProductLetter() {
  const { state, refresh, decideReflection, correctReflection, cancelReflection, moreProducts } =
    useBeyond();
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const rows = state.product!.reflections;
  const row = rows.find((r) => r.id === selected) ?? rows[0];
  if (!row)
    return (
      <div className="v pad v-letter">
        <p className="k">Letters</p>
        <div className="lb">
          <p>No letter yet.</p>
          <p>
            Your entries are saved privately. AI reflections will appear here when the separate
            service is connected.
          </p>
        </div>
        <button className="pb line sm" type="button" onClick={() => void refresh()}>
          Reload letters
        </button>
      </div>
    );
  return (
    <div className="v pad v-letter">
      <p className="k">
        {new Date(row.created_at).toLocaleDateString()} · {row.voice}
      </p>
      {rows.length > 1 && (
        <select
          aria-label="Choose a letter"
          value={row.id}
          onChange={(e) => {
            setSelected(e.target.value);
            setOpen(false);
            setText('');
          }}
        >
          {rows.map((r) => (
            <option value={r.id} key={r.id}>
              {new Date(r.created_at).toLocaleDateString()}
            </option>
          ))}
        </select>
      )}
      <div className="lb">
        {row.letter.greet && <p className="greet">{row.letter.greet}</p>}
        <p>{row.letter.said}</p>
        {row.letter.rec && <p>{row.letter.rec}</p>}
        {row.letter.sign && <p className="sign">{row.letter.sign}</p>}
      </div>
      <p className="src">
        {row.provenance.model} · {row.provenance.prompt_version}
      </p>
      {row.actions.map((a) => (
        <div className="stepc" key={a.id}>
          <p className="k">One small step</p>
          <p className="sw">{a.title}</p>
          {a.decision === 'pending' ? (
            <div className="row">
              <button
                className="pb light sm"
                type="button"
                onClick={() => void decideReflection(row.id, a.id, 'accepted')}
              >
                I’ll try it
              </button>
              <button
                className="pb ghost sm"
                type="button"
                onClick={() => void decideReflection(row.id, a.id, 'rejected')}
              >
                Not for me
              </button>
            </div>
          ) : (
            <p className="note">
              {a.decision === 'accepted' ? 'Added to your small steps.' : 'Skipped.'}
            </p>
          )}
        </div>
      ))}
      {row.correction && <p className="ok-note">Your correction: {row.correction}</p>}
      {open ? (
        <form
          className="fixbox"
          onSubmit={(e) => {
            e.preventDefault();
            void correctReflection(row.id, text);
          }}
        >
          <label className="k" htmlFor="letterCorrection">
            What did Beyond get wrong?
          </label>
          <textarea
            id="letterCorrection"
            maxLength={2000}
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="row">
            <button className="pb dark sm" type="submit">
              Send correction
            </button>
            <button className="pb line sm" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          className="linkish"
          type="button"
          onClick={() => {
            setText(row.correction ?? '');
            setOpen(true);
          }}
        >
          Something’s off? Correct it
        </button>
      )}
      <button
        className="fine-btn"
        type="button"
        onClick={() => void cancelReflection(row.entry_id)}
      >
        Cancel reflection permission and remove derived content
      </button>
      {state.product!.reflectionCursor && (
        <button
          className="pb line sm"
          type="button"
          onClick={() => void moreProducts('reflections')}
        >
          Load older letters
        </button>
      )}
      <button className="fine-btn" type="button" onClick={() => void refresh()}>
        Reload letters
      </button>
    </div>
  );
}
