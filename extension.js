'use strict';
/* extension.js
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

/* exported init */

const GETTEXT_DOMAIN = 'clips';

const { Clutter, Cogl, St, GObject, Gio, GLib, Gdk, GdkPixbuf } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lang = imports.lang;
const Util = imports.misc.util;

const Mainloop = imports.mainloop;

const Containers = Me.imports.lib.containers;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;


const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('Clips'));
        
        let gicon = Gio.icon_new_for_string(`${Me.path}/icons/clips-symbolic.svg`);
        let icon = new St.Icon({ gicon, icon_size: 24, style_class: 'icon' });
        log(`this ${this}`);
        this.add_child(icon);

        this.menu.style = `margin-left: 0px; margin-right: 0px; padding-left: 0px; padding-right: 0px;`;

        // let entryItem = new PopupMenu.PopupBaseMenuItem({
        //     reactive: false,
        //     can_focus: false
        // });
        // entryItem.remove_child(entryItem._ornamentLabel); //not needed
        // entryItem.style = `padding: 5px;`; //remove default padding which is not balanced left/right

        // this.searchEntry = new St.Entry({
        //     name: 'searchEntry',
        //     style_class: 'clips-app-search-entry',
        //     can_focus: true,
        //     hint_text: _('Type here to search...'),
        //     track_hover: true,
        //     x_expand: true,
        //     y_expand: true
        // });

        // // that.searchEntry.get_clutter_text().connect(
        // //     'text-changed',
        // //     Lang.bind(that, that._onSearchTextChanged)
        // // );

        // entryItem.add(this.searchEntry);

        // this.menu.addMenuItem(entryItem);

        // let topSeparator = new PopupMenu.PopupSeparatorMenuItem();
        // topSeparator.style = `margin-left: 0px; margin-right: 0px; padding: 0px;`;
        // topSeparator.remove_child(topSeparator._ornamentLabel); //not needed
        // this.menu.addMenuItem(topSeparator);
        
        
        let statusMenu = new PopupMenu.PopupMenuSection();
        this.clips_app_grid = new Containers.ClipsAppGrid();

        statusMenu.box.add_actor(this.clips_app_grid);

        log(GLib.get_user_cache_dir());

        let cacheDir = Gio.File.new_for_path(`${Me.path}/images/`);
        const iter = cacheDir.enumerate_children('standard::*', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
        // not async, may cause block in large numbers
        while (true) {
            const info = iter.next_file(null);
            
            if (info == null)
                break;
            
            this._addClip(info.get_content_type().split('/')[1], info.get_name(), cacheDir.get_path() + '/' + info.get_name(), this.clips_app_grid)
        }

        this.menu.addMenuItem(statusMenu);

        // this.refreshChartsTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => this.refreshLog());

        // this.clips_app_grid._flowbox.get_children().forEach(child => {
        //     log(child.name);
        // });

        // let bottomSeparator = new PopupMenu.PopupSeparatorMenuItem();
        // bottomSeparator.style = `margin-left: 0px; margin-right: 0px; padding: 0px;`;
        // bottomSeparator.remove_child(bottomSeparator._ornamentLabel); //not needed
        // this.menu.addMenuItem(bottomSeparator);

        // let entryItem2 = new PopupMenu.PopupBaseMenuItem({
        //     reactive: false,
        //     can_focus: false
        // });
        // entryItem2.remove_child(entryItem2._ornamentLabel); //not needed
        // entryItem2.style = `padding: 5px;`; //remove default padding which is not balanced left/right

        // this.searchEntry2 = new St.Entry({
        //     name: 'searchEntry',
        //     style_class: 'clips-app-search-entry',
        //     can_focus: true,
        //     hint_text: _('Type here to search...'),
        //     track_hover: true,
        //     x_expand: true,
        //     y_expand: true
        // });
        // entryItem2.add(this.searchEntry2);

        // this.menu.addMenuItem(this.searchEntry2 );

    }

    _refreshLog () {
        log('logging...');
        return true;
    }

    _addClip(type, filename, filepath, app_grid) {
        let clip = new Containers.ClipsBaseContainer(type, filename, filepath);
        app_grid._flowbox.add_actor(clip);
        clip.connect('key-focus-in', () => {
            Util.ensureActorVisibleInScrollView(app_grid._scrollView, clip);
        });
    }

});

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    log(`initializing ${meta.metadata.name}`);
    return new Extension(meta.uuid);
}
