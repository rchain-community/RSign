/* global document, window */
// @ts-check

import randomBytes from 'randombytes';
import { options } from './sigTool.js';

options(document, { chrome: window.chrome, browser: /** @type {any} */ (window).browser }, randomBytes);
