import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { DemoProvider, useDemo, type DemoApi } from './store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(children: (api: DemoApi) => ReactNode) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let api!: DemoApi;
  const Probe = () => {
    api = useDemo();
    return <>{children(api)}</>;
  };
  act(() =>
    root.render(
      <DemoProvider>
        <Probe />
      </DemoProvider>,
    ),
  );
  return { api: () => api, unmount: () => act(() => root.unmount()) };
}

afterEach(() => localStorage.clear());

describe('site demo', () => {
  it('keeps what a visitor types in memory only and clears older saved demos', () => {
    localStorage.setItem('beyond.demo.v1', JSON.stringify({ entry: 'Fictional old words' }));
    const view = mount(() => null);
    expect(localStorage.getItem('beyond.demo.v1')).toBeNull();
    act(() => view.api().dispatch({ type: 'entry', entry: 'Fictional visitor words' }));
    expect(view.api().state.entry).toBe('Fictional visitor words');
    expect(JSON.stringify({ ...localStorage })).not.toContain('Fictional visitor words');
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('Fictional visitor words');
    view.unmount();
  });

  it('writes only the scripted fictional letter, never a request', async () => {
    const view = mount(() => null);
    await act(async () => view.api().generate());
    expect(view.api().state.ai.model).toBe('fictional demo');
    view.unmount();
  });
});
