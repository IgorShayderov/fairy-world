export class InterceptorManager<V> {
  private handlers: ({
    fulfilled?: ((value: V) => unknown) | undefined;
    rejected?: ((error: unknown) => unknown) | undefined;
  } | null)[] = [];

  use(fulfilled?: (value: V) => unknown, rejected?: (error: unknown) => unknown): number {
    this.handlers.push({ fulfilled, rejected });
    return this.handlers.length - 1;
  }

  eject(id: number): void {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  forEach(fn: (handler: NonNullable<(typeof this.handlers)[0]>) => void): void {
    this.handlers.forEach((h) => {
      if (h !== null) {
        fn(h);
      }
    });
  }
}
