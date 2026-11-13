import { Notify } from 'quasar';
import { defineComponent, watch, type PropType } from 'vue';

/** Transient action feedback belongs in an overlay, never in the page's layout. */
export default defineComponent({
  name: 'ActionToasts',
  props: {
    error: { type: String, default: '' },
    success: { type: String, default: '' },
    info: { type: String, default: '' },
    retry: { type: Function as PropType<() => unknown>, default: undefined },
    retryLabel: { type: String, default: 'Retry' },
  },
  setup(props) {
    let dismiss: (() => void) | undefined;
    for (const [key, type] of [
      ['error', 'negative'],
      ['success', 'positive'],
      ['info', 'info'],
    ] as const) {
      watch(
        () => props[key],
        (message) => {
          if (!message?.trim()) return;
          dismiss?.();
          dismiss = Notify.create({
            message,
            type,
            position: 'top-right',
            // A retryable failure remains available until dismissed or retried.
            timeout: key === 'error' ? (props.retry ? 0 : 8000) : 4500,
            group: true,
            attrs: {
              role: key === 'error' ? 'alert' : 'status',
              'aria-live': key === 'error' ? 'assertive' : 'polite',
              'data-action-toast': '',
            },
            actions: [
              ...(key === 'error' && props.retry
                ? [
                    {
                      label: props.retryLabel,
                      handler: () => {
                        void props.retry?.();
                      },
                    },
                  ]
                : []),
              { icon: 'close', 'aria-label': 'Dismiss notification' },
            ],
          });
        },
        { immediate: true, flush: 'sync' }
      );
    }
    return () => null;
  },
});
