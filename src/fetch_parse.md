# `make_fetch_parser` Specification

## Purpose

`make_fetch_parser` creates a parsed, polling remote state from an HTTP URL.
It uses the schema language of `make_parser`, with one extension: the `w`
marker makes the corresponding state writable.

The returned value exposes the same shape as the parsed result, except every
leaf is a state. The root is the remote state which owns fetching, polling,
and parse errors. Descendant states are projections of that root state.

## Public API

```ts
function make_fetch_parser<const S extends FetchSchema>(
  request: () => string | readonly [string, RequestInit],
  update_rate: number | State<number>,
  schema: S,
): FetchParsed<S>;
```

- `request` is called immediately before every fetch. It returns either a URL
  string or a tuple containing the URL and `RequestInit` options. The tuple
  form allows callers to provide headers, credentials, query-specific HTTP
  options, or another supported fetch option for each request.
- `update_rate` is the polling interval in milliseconds. A rate state is read
  while polling is active; changing it restarts the interval with the new
  delay.
- `schema` accepts every schema form supported by `make_parser`, plus `w` in
  a primitive type string.
- The initial scope is object schemas. Array-root support should match the
  existing `[0, schema]` root overload when it is implemented.

`State<T>` refers to a compatible state from `@chocbite/ts-lib-state`.
The request factory owns any dynamic state reads, such as an authenticated URL
or authorization header. `make_fetch_parser` does not subscribe to or write
to those states.

```ts
make_fetch_parser(
  () => ["/api/user", { headers: { Authorization: `Bearer ${token}` } }],
  1_000,
  { name: "s" },
);
```

## Schema Extension

The existing primitive markers retain their meaning:

| Marker | Value type |
| ------ | ---------- |
| `n`    | `number`   |
| `s`    | `string`   |
| `b`    | `boolean`  |
| `l`    | `null`     |

`w` is a capability marker, not a value type. It may be appended to a
primitive type string and does not participate in the parsed value union.

```ts
make_fetch_parser(() => "/api/settings", 1_000, {
  count: "n",
  name: "sw",
  enabled: "bw",
});
```

The parsed value type of the example is:

```ts
{
  count: number;
  name: string;
  enabled: boolean;
}
```

The state tree type is:

```ts
{
  count: StateREA<number>;
  name: StateREAW<string>;
  enabled: StateREAW<boolean>;
}
```

`w` must only occur once and must be the final marker. Invalid type strings,
including `wn`, `ww`, or a string containing only `w`, are rejected when the
schema is created. Optional primitive schemas may use `?` before the type
string, for example `?sw`.

## Return Shape And Types

For an object schema, the returned root must be both:

1. A `StateREA<ParsedSchema>` remote state.
2. The recursively mapped parsed object with state leaves.

Conceptually:

```ts
type FetchStateFor<Spec, Value> = Spec extends WritableSpec
  ? StateREAW<Value>
  : StateREA<Value>;

type FetchParsed<Schema> = StateREA<Parsed<Schema>> & {
  [K in keyof Schema]: FetchNode<Schema[K]>;
};
```

`FetchNode` follows the `make_parser` schema recursively:

- Primitive schema: a `StateREA<T>` or, for a `w` schema, `StateREAW<T>`.
- Nested object: an intersection of `StateREA<NestedValue>` and the nested
  parsed object with state leaves. It is a projection for the complete nested
  value as well as an object that exposes its descendants.
- Tuple, fixed-length tuple, and variable-length array: a state projection of
  the parsed aggregate. Dynamic arrays do not expose stable per-index state
  properties because their indices can appear, disappear, and move between
  responses.
- Nested parser: a state projection of `Parsed<typeof parser>`.
- Optional schemas: a state whose read type includes `undefined`.
- Schema unions: a state whose read type is the union resolved by
  `make_parser`.

The root must preserve the normal `StateREA` behavior: awaiting it or
subscribing to it yields `Result<ParsedSchema, string>`. The object properties
are additional state projections, not replacements for the root-state API.

## Fetch And Polling Lifecycle

The root is implemented as a `StateRemoteFuncREA` (or an equivalent custom
`StateRemote`), so it retains standard remote-state behavior.

- The first root subscription starts polling immediately with one `GET`.
- Each successful or failed request schedules the next request after the
  current `update_rate` in milliseconds.
- Multiple root or descendant subscriptions share one polling loop. A
  descendant subscription counts as a root subscription.
- Polling stops when the final root or descendant subscription is removed.
- An await of the root performs one fetch through the remote-state `once`
  path and does not start a permanent polling loop.
- At most one fetch is in flight. A tick while a request is in flight is
  skipped; the next interval is scheduled after that request settles.
- Unsubscribing stops future polling and aborts an in-flight fetch when an
  `AbortController` is available.

The root remote state must use `StateREA`, rather than `StateROA`, because a
network, HTTP, JSON, or parser failure is observable as a state error.

## Response And Error Handling

For each fetch:

1. Call `request()` to obtain the current URL and optional `RequestInit`.
2. Call `fetch(url, init)`; a string result uses no explicit init object.
3. Treat a non-OK HTTP response as an error that includes the status.
4. Read the response body as text and pass it to a parser made from `schema`.
5. Publish the parsed value on success.
6. Publish an error on network failure, abort failure not caused by teardown,
   HTTP failure, invalid JSON, or schema validation failure.

A failed refresh does not discard the last successful object retained by state
projections. It does publish an error to the root and every descendant
projection until a later successful response is received.

## Projection Semantics

Every descendant state is backed by `state.proxy.rea` or `state.proxy.reaw`
over the same root remote state.

- A projection reads its path from the root's successful parsed value.
- If the root result is an error, the projection publishes the same error.
- A projection never performs an independent request or creates an independent
  polling timer.
- Subscribing to a projection keeps the root active. Unsubscribing releases
  that usage.
- Projections are created once when `make_fetch_parser` is called, so object
  property identities are stable for the life of the returned value.

For example:

```ts
const user = make_fetch_parser(() => "/api/user", 5_000, {
  id: "n",
  profile: {
    name: "s",
  },
});

// user: StateREA<{ id: number; profile: { name: string } }> & {
//   id: StateREA<number>;
//   profile: StateREA<{ name: string }> & { name: StateREA<string> };
// }
```

## Writable States

A leaf schema ending in `w` returns `StateREAW<T>`. Its `write(value)` must
write through the root-backed projection and return a `StateResult<void>`.
The write is not considered complete until the server operation succeeds.

The precise HTTP write protocol is intentionally outside this initial spec.
It must be decided before implementation because the schema alone does not
state whether writes use `PATCH`, `PUT`, or another endpoint, nor how a leaf
path and value are encoded. The selected protocol must define:

- Request method, URL derivation, headers, and body format.
- Whether nested writable leaves write a full document, a path/value patch, or
  a resource-specific payload.
- Whether a successful write updates the root optimistically, uses the server
  response, or waits for the next poll.
- How write failures interact with the last fetched value and refresh errors.

Until that protocol is defined, this specification only requires the type and
projection capability implied by `w`; it does not prescribe a default HTTP
mutation behavior.

## Initial Acceptance Criteria

- `make_fetch_parser(request, rate, { test: "n" }).test` type-checks as
  `StateREA<number>`.
- `make_fetch_parser(request, rate, { test: "nw" }).test` type-checks as
  `StateREAW<number>`.
- The returned object itself retains `StateREA<{ test: number }>` behavior.
- One or more leaf subscribers cause one shared immediate fetch and one shared
  polling loop.
- Valid responses update the root and all matching projections.
- Invalid JSON, parser failures, HTTP failures, and network failures publish
  error results without throwing from a subscription callback.
- Polling ends after the final root or descendant unsubscription.
