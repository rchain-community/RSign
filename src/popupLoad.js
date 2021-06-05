/* global document, window */

import popup from './rhoSig.js';

popup(document, { chrome: window.chrome, browser: window.browser }, crypto);
