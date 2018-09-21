# RSign - RChain Signature Tool (Alpha)

by Dan Connolly

copyright (c) RChain Cooperative 2018.
Share and Enjoy under the terms of the Apache Software License.


## Usage: Key Management, Signing

Provided it's installed as below:

  1. Create a key pair
     1. Right click to bring up options
     2. Provide label and password; click Generate...
  2. Pop-up the extension
  3. Put JSON in the data field
  4. Enter password
  5. Press Sign


### Communiation with dApps

dApps can subscribe to pop-notices, provide JSON data, and receive
signatures. For example, see
[Rchain-Status](https://github.com/dckc/Rchain-Status/tree/sig-ext).


## Installation as Chrome Extension

Only Chrome (and Chromium) are supported to date. Firefox support is
planned.

 1. `npm install` to get runtime dependencies and dev tools
 2. `npm run build` to link modules
 3. Use [load unpacked][1].

[1]: https://developer.chrome.com/extensions/getstarted#unpacked
