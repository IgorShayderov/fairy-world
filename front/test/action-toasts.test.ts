import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRenderer, h, nextTick, reactive } from 'vue';
import { Notify } from 'quasar';
import ActionToasts from '../src/components/ActionToasts';

vi.mock('quasar', () => ({ Notify: { create: vi.fn(() => vi.fn()) } }));

function mount(initial: { error?: string; success?: string; info?: string; retry?: () => unknown } = {}) {
  const elements = vi.fn(() => ({}));
  const renderer = createRenderer<object, object>({
    createElement: elements,
    createText: () => ({}),
    createComment: () => ({}),
    insert: () => {},
    remove: () => {},
    setText: () => {},
    setElementText: () => {},
    patchProp: () => {},
    parentNode: () => null,
    nextSibling: () => null,
  });
  const props = reactive({ error: '', success: '', info: '', ...initial });
  const app = renderer.createApp({ render: () => h(ActionToasts, props) });
  app.mount({});
  return { props, app, elements };
}

describe('action feedback toasts', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders no layout elements and ignores empty messages', () => {
    const { app, elements } = mount();
    expect(elements).not.toHaveBeenCalled();
    expect(Notify.create).not.toHaveBeenCalled();
    app.unmount();
  });
  it('shows accessible, dismissible overlay success messages without HTML rendering', () => {
    const { app, elements } = mount({ success: '<img src=x> Saved.' });
    expect(Notify.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '<img src=x> Saved.',
        type: 'positive',
        position: 'top-right',
        timeout: 4500,
        attrs: expect.objectContaining({ role: 'status', 'aria-live': 'polite' }),
        actions: expect.arrayContaining([expect.objectContaining({ 'aria-label': 'Dismiss notification' })]),
      })
    );
    expect(vi.mocked(Notify.create).mock.calls[0]?.[0]).not.toHaveProperty('html', true);
    expect(elements).not.toHaveBeenCalled();
    app.unmount();
  });
  it('keeps retryable errors available and calls the original retry handler', () => {
    const retry = vi.fn();
    const { app } = mount({ error: 'Request failed', retry });
    const options = vi.mocked(Notify.create).mock.calls[0]![0] as {
      timeout: number;
      actions: { label?: string; handler?: () => void }[];
    };
    expect(options.timeout).toBe(0);
    options.actions.find((a) => a.label === 'Retry')!.handler!();
    expect(retry).toHaveBeenCalledOnce();
    app.unmount();
  });
  it('replaces old feedback and reports the same error again after another attempt', async () => {
    const { app, props } = mount({ error: 'Not enough gold' });
    const dismiss = vi.mocked(Notify.create).mock.results[0]!.value;
    props.error = '';
    await nextTick();
    props.error = 'Not enough gold';
    await nextTick();
    expect(Notify.create).toHaveBeenCalledTimes(2);
    expect(dismiss).toHaveBeenCalledOnce();
    props.error = '';
    props.success = 'Completed';
    await nextTick();
    expect(Notify.create).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'positive', message: 'Completed' }));
    app.unmount();
  });
});
