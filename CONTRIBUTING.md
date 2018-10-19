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


## Object capability (ocap) discipline

In order to supporting robust composition and cooperation without
vulnerability, code in this project should adhere to [object
capability discipline][ocap].

  - **Memory safety and encapsulation**
    - There is no way to get a reference to an object except by
      creating one or being given one at creation or via a message; no
      casting integers to pointers, for example. _JavaScript is safe
      in this way._

      From outside an object, there is no way to access the internal
      state of the object without the object's consent (where consent
      is expressed by responding to messages). _We use `def` (aka
      `Object.freeze`) and closures rather than properties on `this`
      to achieve this._

  - **Primitive effects only via references**
    - The only way an object can affect the world outside itself is
      via references to other objects. All primitives for interacting
      with the external world are embodied by primitive objects and
      **anything globally accessible is immutable data**. There must be
      no `open(filename)` function in the global namespace, nor may
      such a function be imported. _It takes some discipline to use
      modules in node.js in this way.  We use a convention
      of only accessing ambient authority inside `if (require.main ==
      module) { ... }`._

[ocap]: http://erights.org/elib/capability/ode/ode-capabilities.html
