import { sync_resolve } from "./async";

const sync = sync_resolve(100);
const native = Promise.resolve(sync);
console.warn(native);
