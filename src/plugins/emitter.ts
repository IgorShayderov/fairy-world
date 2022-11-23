import { getCurrentInstance } from 'vue';

export default function useEmitter() {
  const { emitter } = getCurrentInstance().appContext.config.globalProperties;

  return emitter;
}
