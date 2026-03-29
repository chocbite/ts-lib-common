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

/**Returns a promise that executes synchronously when using .then() and resolves immediately with the given value.*/
export function sync_resolve<T>(value: T): PromiseLike<T> {
  return {
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      try {
        const result = onfulfilled ? onfulfilled(value) : value;
        if (is_promise_like(result)) return result;
        return sync_resolve(result) as PromiseLike<TResult1>;
      } catch (error) {
        if (onrejected) {
          const rejected_result = onrejected(error);
          if (is_promise_like(rejected_result)) return rejected_result;
          return sync_resolve(rejected_result);
        }
        return sync_reject(error as any);
      }
    },
  } as PromiseLike<T>;
}

/**Returns a promise that executes synchronously when using .catch() and rejects immediately with the given value.*/
export function sync_reject<T>(error: T): PromiseLike<T> {
  return {
    then<TResult1 = T, TResult2 = never>(
      _onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      try {
        if (onrejected) {
          const rejected_result = onrejected(error);
          if (is_promise_like(rejected_result)) return rejected_result;
          return sync_resolve(rejected_result);
        }
        return sync_reject(error as any);
      } catch (err) {
        return sync_reject(err as any);
      }
    },
  } as PromiseLike<T>;
}
