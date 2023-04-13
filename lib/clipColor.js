'use strict';
/* clipEmpty.js
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const { Clutter, St, GObject, Gio, GLib, Gdk, GdkPixbuf, Pango } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Helpers = Me.imports.lib.helpers;

const _ = ExtensionUtils.gettext;

var ClipColorContainer = GObject.registerClass(
class ClipColorContainer extends St.Widget {
    _init(parent, filepath, altContent, params) {
        super._init({
            // style_class: 'clips-container',
            layout_manager: new Clutter.GridLayout({ orientation: Clutter.Orientation.VERTICAL }),
            x_expand: false,
            y_expand: false,
            width: parent.width - 4,
            height: parent.height - 4,
        });
        this.add_style_class_name('clips-container-color');

        let file = Gio.File.new_for_path(filepath);

        const _setContents = this._setContents.bind(this);
        file.load_contents_async(
            null, 
            function (file_, result) {
                let [success, contents] = file_.load_contents_finish(result);

                if (success) {
                    try {
                        if (contents instanceof Uint8Array) {
                            var strContents = imports.byteArray.toString(contents);
                        }
                        _setContents(strContents);
                    } catch (e) {
                        throw TypeError(e);
                    }
                }
        });

        this.set_clip(0, 0, this.width, this.height);
    }

    _setContents (string) {
        this._content = new St.Label({ 
            text: string, 
        });
        this.layout_manager.attach(this._content, 0, 0, 1, 1);
    }
    
});