import { make_fetch_parser } from "./fetch_parse";

window.fetch = async (e, i) => {
  console.warn(e, i);
  return Promise.resolve(new Response(JSON.stringify({ test: true })));
};

const yo = make_fetch_parser(() => "/test", 500, {
  test: "?b",
  then: "n",
});

yo.then((v) => {
  console.warn(v);
});
