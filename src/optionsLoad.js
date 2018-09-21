/* global document, window */

import nacl from 'tweetnacl';

import { options } from './sigTool.js';

options(document, { chrome: window.chrome, browser: window.browser }, nacl);
