export * from "./array";
export * from "./debounce";
export * from "./equals";
export * from "./ip";
export * from "./selection";
export * from "./throttle";

export function node_clone<T extends Node>(node: T): T {
  return node.cloneNode(true) as T;
}

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**Checks of the given object is empty only checks for objects own properties*/
export const object_empty = (obj: object): boolean => {
  for (const key in obj) if (obj.hasOwnProperty(key)) return false;
  return true;
};

//                _______     ___   _  _____
//         /\    / ____\ \   / / \ | |/ ____|
//        /  \  | (___  \ \_/ /|  \| | |
//       / /\ \  \___ \  \   / | . ` | |
//      / ____ \ ____) |  | |  | |\  | |____
//     /_/    \_\_____/   |_|  |_| \_|\_____|

export function sleep<T = void>(ms: number, arg?: T): Promise<T> {
  return new Promise((a) => setTimeout(a, ms, arg));
}
export function sleep_lazy<T = void>(ms: number, arg?: () => T): Promise<T> {
  return new Promise((a) => setTimeout((arg: () => T) => a(arg()), ms, arg));
}

//      _____ _____ ______ ______ _____ _   _  _____
//     |  __ \_   _|  ____|  ____|_   _| \ | |/ ____|
//     | |  | || | | |__  | |__    | | |  \| | |  __
//     | |  | || | |  __| |  __|   | | | . ` | | |_ |
//     | |__| || |_| |    | |     _| |_| |\  | |__| |
//     |_____/_____|_|    |_|    |_____|_| \_|\_____|

export function array_diff<T>(
  main: T[],
  second: T[]
): { added: T[]; removed: T[] } {
  const added = second.filter((x) => !main.includes(x));
  const removed = main.filter((x) => !second.includes(x));
  return { added, removed };
}

export function object_key_diff<T1 extends object, T2 extends object>(
  main: T1,
  second: T2
): { added: string[]; removed: string[] } {
  return array_diff(Object.keys(main), Object.keys(second));
}
