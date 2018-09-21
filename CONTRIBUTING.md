## Code Style: Airbnb, mostly

Run `npm run lint`. See `eslintrc.yaml` for deviations from Airbnb
style.

## Static type checking with flow

Run `npm run check`.


## Modules, bundling

We aim to use es6 modules, but not all of our dependencies
are there yet, so we need something to adapt commonjs modules.

webpack seems to (a) be the market leader and (b) work.
https://webpack.js.org/guides/getting-started/

In dev mode, it uses `eval()` which isn't allowed by
chrome extension content security policy.
