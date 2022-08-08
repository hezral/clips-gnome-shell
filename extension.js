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

const { Clutter, Cogl, St, Meta, Shell, GObject, Gio, GLib, Gdk, GdkPixbuf } = imports.gi;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;
// const Meta = imports.gi.Meta;
// const Shell = imports.gi.Shell;
const Clipboard = St.Clipboard.get_default();

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Containers = Me.imports.lib.containers;
const Backend = Me.imports.lib.clipboard;
const Utils = Me.imports.lib.utils;

const CacheDir = GLib.get_user_cache_dir() + '/' + Me.uuid;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Dialog = imports.ui.dialog;

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

        let _statusMenu = new PopupMenu.PopupMenuSection();
        this._clips_app_grid = new Containers.ClipsAppGrid();

        _statusMenu.box.add_actor(this._clips_app_grid);

        log(GLib.get_user_cache_dir());


        this.cacheFiles = null;

        Utils.readDirectory(Gio.File.new_for_path(`${Me.path}/cache_dir/`), this._enumerateFileInfo, this)

        // const _iter = _cacheDir.enumerate_children('standard::*', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
        
        // // not async, may cause block in large numbers
        // while (true) {
        //     const _info = _iter.next_file(null);
            
        //     if (_info == null)
        //         break;
            
        //     this._addClip(_info.get_content_type(), _info.get_name(), _cacheDir.get_path() + '/' + _info.get_name(), this._clips_app_grid)
        // }

        
        
    

        this.menu.addMenuItem(_statusMenu);

        // this.refreshChartsTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => this.refreshLog());

        // this._clips_app_grid._flowbox.get_children().forEach(child => {
        //     log(`this: ${child.name}, active: ${child.active}`);
        // });

        let _settings = ExtensionUtils.getSettings("org.gnome.shell.extensions.clips");

        Main.wm.addKeybinding(
            "toggle-menu", _settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            this._toggleMenu.bind(this)
        );

        // Main.wm.addKeybinding(
        //     "copy-clip", _settings,
        //     Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
        //     Shell.ActionMode.ALL,
        //     this._copyClip.bind(this)
        // );

        this._initListener();

        this.menu.connect('open-state-changed', () => {
            this._menuStateChanged();
        });

        // let vscrollbar = this._clips_app_grid._scrollView.vscroll.adjustment
        // vscrollbar.connect('changed', () => {
        //     log('scroll-stopped');
        // });

        // Utils.readFileContents(`${Me.path}/cache_dir/a.txt`, this._printContents);

    }

    _enumerateFileInfo (parent, directoryPath, gioFileEnumerator) {
        // log(`got the iter: ${gioFileEnumerator}`);

        gioFileEnumerator.next_files_async(
            100, // max results
            GLib.PRIORITY_DEFAULT,
            null,
            (iter_, res) => {
                parent.cacheFiles = gioFileEnumerator.next_files_finish(res);
                var idx = 0;
                parent.cacheFiles.forEach((child, index, arr) => {
                    if (index <= 25) {
                        log(`name: ${child.get_name()}, content_type: ${child.get_content_type()}`);
                        parent._addClip(child.get_content_type(), child.get_name(), directoryPath + '/' + child.get_name(), parent._clips_app_grid);
                        idx++;
                    }
                });
            });

    }

    _logFileInfo (fileinfo) {
        log(fileinfo);
    }

    _menuStateChanged () {
        log(`menu is open: ${this.menu.isOpen}`);
    }

    _initListener() {
        const display = Shell.Global.get().get_display();
    
        if (typeof display.get_selection === 'function') {

            const selection = display.get_selection();

            this._selectionOwnerChangedId = selection.connect('owner-changed', (selection, selectionType, selectionSource) => {
                this._refreshLog(display, selection, selectionType, selectionSource);
            });
            log('listener started');
        }

    }
    
    _setupTimeout (reiterate) {
        reiterate = typeof reiterate === 'boolean' ? reiterate : true;

        this._clipboardTimeoutId = Mainloop.timeout_add(TIMEOUT_MS, function () {
            // that._refreshIndicator();

            // If the timeout handler returns `false`, the source is
            // automatically removed, so we reset the timeout-id so it won't
            // be removed on `.destroy()`
            if (reiterate === false)
                that._clipboardTimeoutId = null;

            return reiterate;
        });
    }

    _printContents(contents) {
        if (contents instanceof Uint8Array) {
            contents = imports.byteArray.toString(contents);
        }
        log(contents);
    }

    _refreshClips (that, reiterate) {
        log(`Refresh Clips: that: ${that}, reiterate: ${reiterate}`);
    }

    _refreshLog (display, selection, selectionType, selectionSource) {
        log(`focus_window: ${display.get_focus_window().wm_class}`);
        if (selectionType === Meta.SelectionType.SELECTION_CLIPBOARD) {
            this._getClipboardContents();

        }
    }

    _getClipboardContents () {
        let mimetypes = Clipboard.get_mimetypes(St.ClipboardType.CLIPBOARD);
        log(`typeof: ${typeof mimetypes} mimetypes: ${mimetypes}`);

        switch(mimetypes.toString().split('/')[0]) {
            case 'image':
                var mimeType = 'image/png';
                var fileExt = 'png';
                break;
            case 'text':
                if (mimetypes.includes('text/html')) {
                    var mimeType = 'text/html';
                    var fileExt = 'html';
                } else {
                    var mimeType = 'text/plain;charset=utf-8';
                    var fileExt = 'txt';
                }
                break;
            default:
                var mimeType = 'text/plain';
                var fileExt = 'txt';
                break;
        }

        Clipboard.get_content(
            St.ClipboardType.CLIPBOARD, 
            mimeType,
            (clipBoard, data) => {
                // log(`data: ${data}`);
                const file = Gio.File.new_for_path(`${Me.path}/cache_text/file.${fileExt}`)
                Utils.writeFile(file, data, this._logFileInfo, this);
            }
        );
    }

    _addClip(type, filename, filepath, app_grid) {
        log(`type: ${type}, filename: ${filename}`);
        let clip = new Containers.ClipsBaseContainer(type, filename, filepath);
        app_grid._flowbox.add_actor(clip);
        clip.connect('key-focus-in', () => {
            Util.ensureActorVisibleInScrollView(app_grid._scrollView, clip);
        });
    }

    _toggleMenu () {
        this.menu.toggle();
    }

    _copyClip () {
        log(`Copy: ${this._clips_app_grid._flowbox.selected_child.name}`);
    }

});


// let container;

// function test () {

//     let pMonitor = Main.layoutManager.primaryMonitor;
  
//     container = new St.Bin({
//       style_class : 'bg-color',
//       reactive : true,
//       can_focus : true,
//       track_hover : true,
//       height : 200,
//       width : 200,
//     });

//     container.style = 'background-color: white;';
  
//     container.set_position(50, 50);
  
//     container.connect("enter-event", () => {
//       log('entered');
//     });
  
//     container.connect("leave-event", () => {
//       log('left');
//     });
  
//     container.connect("button-press-event", () => {
//       log('clicked');
//     });
//   }

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
        // Main.layoutManager.addChrome(container, {
        //     affectsInputRegion : true,
        //     affectsStruts : true,
        //     trackFullscreen : true,
        // });
    }

    disable() {
        // Main.layoutManager.removeChrome(container);
        Main.wm.removeKeybinding("toggle-menu");
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    log(`initializing ${meta.metadata.name}`);
    return new Extension(meta.uuid);
}
