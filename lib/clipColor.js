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
class ClipsEmptyContainer extends St.Widget {
    _init(parent, filepath, params) {
        super._init({
            // style_class: 'clips-container',
            layout_manager: new Clutter.GridLayout({ orientation: Clutter.Orientation.VERTICAL }),
            x_expand: false,
            y_expand: false,
            width: parent.width - 4,
            height: parent.height - 4,
        });
        this.add_style_class_name('clips-container-text');

        this._content = new St.Label({ 
            text: filepath, 
        });

        this.layout_manager.attach(this._content, 0, 0, 1, 1);
        this.set_clip(0, 0, this.width, this.height);

    }
    
});