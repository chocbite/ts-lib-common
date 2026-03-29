/**Returns true if the given value is promise like */
export function is_promise_like<T>(value: any): value is PromiseLike<T> {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { then: () => void }).then === "function"
  );
}

/**Returns a promise that resolves after the given number of milliseconds with the given argument (if any).*/
export function sleep<T = void>(ms: number, arg?: T): Promise<T> {
  return new Promise((a) => setTimeout(a, ms, arg));
}

/**Returns a promise that resolves after the given number of milliseconds with the result of the given function (if any).*/
export function sleep_lazy<T = void>(ms: number, arg?: () => T): Promise<T> {
  return new Promise((a) => setTimeout((arg: () => T) => a(arg()), ms, arg));
}

/**Promise like object that resolves immediately with the given value */
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

/**Returns a promise that executes synchronously when using .then() and resolves immediately with the given value.*/
export function instant_promise<T>(value: T | PromiseLike<T>): PromiseLike<T> {
  if (is_promise_like(value)) return value;
  return new InstantPromise(value);
}
