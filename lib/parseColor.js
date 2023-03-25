'use strict';
/* parseColor.js
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const ColorRegex = /(#([\da-f]{3}){1,2}|(rgb|hsl)a\((\d{1,3}%?,\s?){3}(1|0?\.\d+)\)|(rgb|hsl)\(\d{1,3}%?(,\s?\d{1,3}%?){2}\))/i;

function isColor (string) {
    var color = '';
    var colorcode = '';

    switch (true) {
        case string.includes('#'):
            color = 'hex';
            break;
        case string.includes('rgb') && ! string.includes('rgba'):
            color = 'rgb';
            break;
        case string.includes('rgba'):
            color = 'rgba';
            break;
        case string.includes('hsl') && ! string.includes('hsla'):
            color = 'hsl';
            break;
        case string.includes('hsla'):
            color = 'hsla';
            break;
    }
    
    if (string.match(ColorRegex) != null) {
        return [color, string.match(ColorRegex)[0]];
    } else {
        return null;
    }
};

// log(isColor('#222222'));
// log(isColor('rgb(3,3,3)'));
// log(isColor('rgba(4%,4,4%,0.4)'));
// log(isColor('hsl(5,5,5)'));
// log(isColor('hsla(6,6,6,0.6)'));
// log(isColor('hsl'));