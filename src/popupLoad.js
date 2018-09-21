/* global document, window */

import nacl from 'tweetnacl';

import popup from './rhoSig.js';

popup(document, { chrome: window.chrome, browser: window.browser }, nacl);
