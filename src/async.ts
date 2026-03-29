export function is_promise_like<T>(value: any): value is PromiseLike<T> {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { then: () => void }).then === "function"
  );
}

export function sleep<T = void>(ms: number, arg?: T): Promise<T> {
  return new Promise((a) => setTimeout(a, ms, arg));
}

export function sleep_lazy<T = void>(ms: number, arg?: () => T): Promise<T> {
  return new Promise((a) => setTimeout((arg: () => T) => a(arg()), ms, arg));
}

class InstantPromise<T> implements PromiseLike<T> {
  #value: T;

  constructor(value: T) {
    this.#value = value;
  }

  then<R = T>(func: (value: T) => R | PromiseLike<R>): PromiseLike<R> {
    try {
      const result = func(this.#value);
      if (is_promise_like(result)) return result;
      return instant_promise(result);
    } catch (error) {
      return Promise.reject(error as Error);
    }
  }
}

export function instant_promise<T>(value: T): PromiseLike<T> {
  return new InstantPromise(value);
}
