/* global document, window */
// @ts-check

import randomBytes from 'randombytes';
import popup from './rhoSig.js';

popup(document, { chrome: window.chrome, browser: /** @type {any} */ (window).browser }, randomBytes);
