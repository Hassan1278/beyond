import { useState } from 'react';
import { useBeyond } from '../state/store';
export function Todos() {
  const { state, addTodo, toggleTodo, removeTodo, moreProducts } = useBeyond();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState<string | null>(null);
  return (
    <>
      <p className="k">Your small steps</p>
      <ul className="mem">
        {state.product!.todos.map((todo) => (
          <li key={todo.id}>
            <button
              className="srow"
              type="button"
              role="checkbox"
              aria-checked={todo.completed}
              onClick={() => void toggleTodo(todo.id)}
            >
              <span>{todo.title}</span>
              <span className="track" />
            </button>
            {asking === todo.id ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAsking(null);
                    void removeTodo(todo.id);
                  }}
                >
                  Confirm delete
                </button>
                <button type="button" onClick={() => setAsking(null)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setAsking(todo.id)}>
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
      {state.product!.todoCursor && (
        <button className="pb line sm" type="button" onClick={() => void moreProducts('todos')}>
          Load more steps
        </button>
      )}
      <form
        className="fixbox"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          void addTodo(title)
            .then((saved) => {
              if (saved) setTitle('');
            })
            .finally(() => setBusy(false));
        }}
      >
        <label className="k" htmlFor="newTodo">
          One small step you choose
        </label>
        <textarea
          id="newTodo"
          value={title}
          maxLength={2000}
          required
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="pb dark sm" type="submit" disabled={busy || !title.trim()}>
          Save step
        </button>
      </form>
    </>
  );
}
