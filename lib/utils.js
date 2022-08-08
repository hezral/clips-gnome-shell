'use strict';
/* utils.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const { Gio, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const CACHE_DIR = GLib.get_user_cache_dir() + '/' + Me.uuid;
const CACHE_FILENAME = 'clips_database.json';
const CACHE_DB = CACHE_DIR + '/' + CACHE_FILENAME;

// Print objects
function prettyPrint (name, obj, recurse, _indent) {
    let prefix = '';
    let indent = typeof _indent === 'number' ? _indent : 0;
    for (let i = 0; i < indent; i++) {
        prefix += '    ';
    }

    recurse = typeof recurse === 'boolean' ? recurse : true;
    if (typeof name !== 'string') {
        obj = arguments[0];
        recurse = arguments[1];
        _indent = arguments[2];
        name = obj.toString();
    }

    log(prefix + '--------------');
    log(prefix + name);
    log(prefix + '--------------');
    for (let k in obj) {
        if (typeof obj[k] === 'object' && recurse) {
            prettyPrint(name + '::' + k, obj[k], true, indent + 1);
        }
        else {
            log(prefix + k, typeof obj[k] === 'function' ? '[Func]' : obj[k]);
        }
    }
}


function readFileContents (filepath, callback) {
    if (typeof callback !== 'function')
        throw TypeError('`callback` must be a function');

    if (GLib.file_test(filepath, GLib.FileTest.EXISTS)) {
        const file = Gio.File.new_for_path(filepath);

        file.load_contents_async(
            null, 
            function (file_, result) {
                let [success, contents] = file_.load_contents_finish(result);
                if (success) {
                    try {
                        callback(contents);
                    }
                    catch (e) {
                        throw TypeError(e);
                    }
                } else {
                    throw TypeError('load failed `file`');
                }
            });
    } else {
        throw TypeError('`filepath` doesn\'t exist');
    }
}

function readDirectory (gioFile, callback, parent) {
    if (typeof callback !== 'function')
        throw TypeError('`callback` must be a function');

    if (GLib.file_test(gioFile.get_path(), GLib.FileTest.EXISTS)) {
        gioFile.enumerate_children_async(
            'standard::*',
            Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
            GLib.PRIORITY_DEFAULT,
            null,
            (file_, result) => {
                try {
                    callback(parent, gioFile.get_path(), gioFile.enumerate_children_finish(result));
                } catch (e) {
                    throw TypeError(e);
                }
            });
    } else {
        throw TypeError('`filepath` doesn\'t exist');
    }
}

function writeFile (gioFile, data, callback, parent) {
    if (typeof callback !== 'function')
        throw TypeError('`callback` must be a function');

    gioFile.replace_contents_bytes_async(
        data,
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null,
        (file_, result) => {
            log(gioFile.replace_contents_finish(result));
            // try {
            //     gioFile.replace_contents_finish(result);
            // } catch (e) {
            //     throw TypeError(e);
            // }
        }
    );
}