'use strict';
/* parseURL.js
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// const { St, Gio, GLib } = imports.gi;

// const ExtensionUtils = imports.misc.extensionUtils;

// const Me = ExtensionUtils.getCurrentExtension();

// const DomToImage = Me.imports.lib.dom_to_image;

// https://urlregex.com/
const UrlRegex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/;
// https://emailregex.com/
const EmailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// https://ipregex.com/
const IpAddressRegs = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;


function isUrl (string) {
    return string.match(UrlRegex);
};

function isEmail (string) {
    return string.match(EmailRegex);
}

log(isEmail('hezral@gmail.com'));

log(isUrl('https://gmail.com'));