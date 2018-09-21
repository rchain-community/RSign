## Building from source: dev mode

 1. `npm install` as usual to get runtime dependencies and dev tools
 2. `npm start` to bundle / link each time sources change
 3. Use [load unpacked][1] to load the results in the `dist/` directory.

[1]: https://developer.chrome.com/extensions/getstarted#unpacked

## Building from source: production

 1. `npm install` as usual to get runtime dependencies and dev tools
 2. Generate a signing key: `ln -s ~/.ssh; openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt > .ssh/RSign-dckc.pem`
 2. `npm run build` to link modules and generate a packed .crx file

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
