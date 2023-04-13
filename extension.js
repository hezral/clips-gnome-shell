'use strict';
/* extension.js
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = 'clips';

const { Clutter, Cogl, St, Meta, Shell, GObject, Gio, GLib, Gdk, GdkPixbuf } = imports.gi;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;
const Clipboard = St.Clipboard.get_default();
// const BoxPointer = imports.ui.boxpointer;
const MessageTray = imports.ui.messageTray;
const Config = imports.misc.config;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Helpers = Me.imports.lib.helpers;
const BaseContainer = Me.imports.lib.baseContainer;
const AppGrid = Me.imports.lib.appGrid;

const CACHE_DIR = GLib.get_user_cache_dir() + '/' + Me.uuid;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Dialog = imports.ui.dialog;

const _ = ExtensionUtils.gettext;


const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    destroy() {
        this._disconnectListener();
        super.destroy();
    }

    _init() {
        super._init(0.0, _('Clips'));

        // initialize settings
        this._settings = ExtensionUtils.getSettings("org.gnome.shell.extensions.clips");

        // initialze cache dir
        this._initCacheDir();

        let gicon = Gio.icon_new_for_string(`${Me.path}/icons/clips-symbolic.svg`);
        let icon = new St.Icon({ gicon, icon_size: 24, style_class: 'icon' });
        this.add_child(icon);
        
        this._appGrid = new AppGrid.ClipsAppGrid();
        
        let _statusMenu = new PopupMenu.PopupMenuSection();
        _statusMenu.box.add_actor(this._appGrid);

        this.menu.addMenuItem(_statusMenu);
        this.menu.box.style = `margin: 0px; padding: 0px;`;

        // let stage = this.menu.box.get_stage();
        // let themeContext = St.ThemeContext.get_for_stage(stage);
        // let theme = themeContext.get_theme();
        // let defaultStylesheet = theme.default_stylesheet;
        // let applicationStylesheet = theme.application_stylesheet;
        // let themeStylesheet = theme.theme_stylesheet;
        // log(`defaultStylesheet ${defaultStylesheet.get_path()}`);
        // log(`applicationStylesheet ${applicationStylesheet}`);
        // log(`themeStylesheet ${themeStylesheet}`);

        // load clips from cache
        const addClips = this._addClip.bind(this);
        Helpers.readDirectory(Gio.File.new_for_path(CACHE_DIR), this._settings.get_int('clip-limit'), 0, 50, addClips, this);

        
        
        // initialze listener for clipboard events
        this._initListener();

        // initialize keybindings
        this._initKeybindings();

        this.menu.connect('open-state-changed', () => {
            this._menuStateChanged();
        });



        // this.refreshChartsTimerId = GLib.idle_add(GLib.PRIORITY_DEFAULT, 2000, () => this._refreshClips());

        // this._clipboardTimeoutId = Mainloop.timeout_add(1000, (this) => {
        //     this._refreshClips();

        //     // If the timeout handler returns `false`, the source is
        //     // automatically removed, so we reset the timeout-id so it won't
        //     // be removed on `.destroy()`
        //     if (reiterate === false)
        //         that._clipboardTimeoutId = null;

        //     return reiterate;
        // });
        // this._setupTimeout();
    }

    _initColors () {
        this.schema = Gio.Settings.new('org.gnome.desktop.interface');
        switch (this.schema.get_string('color-scheme')) {
            case 'prefer-light':
                
            case 'default':
                this.schema.set_string('color-scheme', DARK_SCHEME_NAME);
                if (!this.schema.get_string('gtk-theme').endsWith("-dark")) {
                }
                break;
            case 'prefer-dark':
                if (this.schema.get_string('gtk-theme').endsWith("-dark")) {
                }
                break;
            default:
                break;
        }
    }

    _initCacheDir () {
        if (GLib.file_test(CACHE_DIR, GLib.FileTest.EXISTS)) {
            // log(`cache directory exist: ${CACHE_DIR}`)
        } else {
            // log(`cache directory missing: ${CACHE_DIR}`)
            const cacheDir = Gio.File.new_for_path(CACHE_DIR);

            cacheDir.make_directory_async(
                GLib.PRIORITY_DEFAULT,
                null,
                (file_, result) => {
                    try {
                        cacheDir.make_directory_finish(result);
                    } catch (e) {
                        throw TypeError(e);
                    }
                }
            );
        }
    }

    _initListener() {
        this._listening = true;
        const display = Shell.Global.get().get_display();

        if (typeof display.get_selection === 'function') {

            this.selection = display.get_selection();

            this._selectionOwnerChangedId = this.selection.connect('owner-changed', (selection, selectionType, selectionSource) => {
                if (this._listening) {
                    this._getClipboardContents(display, selection, selectionType, selectionSource);
                }
            });
            log('Clips clipboard listener started');
        }
    }

    _disconnectListener () {
        if (!this._selectionOwnerChangedId)
            return;

        this.selection.disconnect(this._selectionOwnerChangedId);
    }

    _initKeybindings () {
        Main.wm.addKeybinding(
            "toggle-menu", this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
            () => {
                this.menu.toggle();
                this._appGrid._flowbox.get_first_child().grab_key_focus();
            }
        );

        Main.wm.addKeybinding(
            "toggle-search", this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
            () => {
                if (this.menu.isOpen) {
                    this._appGrid._toggleSearch();
                }
            }
        );

        // Main.wm.addKeybinding(
        //     "toggle-settings", this._settings,
        //     Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
        //     Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
        //     () => {
        //         if (this.menu.isOpen) {
        //             this._appGrid._toggleSettings();
        //         }
        //     }
        // );


        // Main.wm.addKeybinding(
        //     "copy-clip", this._settings,
        //     Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
        //     Shell.ActionMode.ALL,
        //     this._copyClip.bind(this)
        // );
    }

    // _initNotificationSource () {
    //     if (!this._notificationSource) {
    //         this._notificationSource = new MessageTray.Source('Clips', 'clips-symbolic');
    //         Main.messageTray.add(this._notificationSource);
    //         this._notificationSource.connect('destroy', () => {
    //             this._notificationSource = null;
    //         });
    //     }
    // }

    // _showNotification (message) {
    //     let notification = null;

    //     this._initNotificationSource();

    //     if (this._notificationSource.count === 0) {
    //         notification = new MessageTray.Notification(this._notificationSource, message);
    //     }
    //     else {
    //         notification = this._notificationSource.notifications[0];
    //         notification.update(message, '', { clear: true });
    //     }

    //     notification.setTransient(true);
    //     if (Config.PACKAGE_VERSION < '3.38')
    //         this._notificationSource.notify(notification);
    //     else
    //         this._notificationSource.showNotification(notification);
    // }


    // _setupTimeout (reiterate) {
    //     let that = this;
    //     reiterate = typeof reiterate === 'boolean' ? reiterate : true;
    //     var test = 1
    //     this._clipboardTimeoutId = Mainloop.timeout_add(2000, function () {
    //         that._refreshClips(test);
    //         test++;

    //         // If the timeout handler returns `false`, the source is
    //         // automatically removed, so we reset the timeout-id so it won't
    //         // be removed on `.destroy()`
    //         if (reiterate === false)
    //             that._clipboardTimeoutId = null;

    //         return reiterate;
    //     });
    // }

    // _refreshClips (test) {
    //     log(`Refresh Clips ${test}`);
    // }

    _menuStateChanged () {
        if (this.menu.isOpen) {
            this._listening = false;
        } else {
            this._listening = true;
        }
        // log(`menu is open: ${this.menu.isOpen} listener: ${this._listening}`);
    }

    _getClipboardContents (display, selection, selectionType, selectionSource) {
        const addClips = this._addClip.bind(this);
        if (selectionType === Meta.SelectionType.SELECTION_CLIPBOARD) {
            let mimeTypes = Clipboard.get_mimetypes(St.ClipboardType.CLIPBOARD);
            // log(`mimeTypes: ${mimeTypes}`);
            let [process, passthrough, mimeType, fileExt, hasThumbnail, hasText] = Helpers.getClipParameters(display, mimeTypes);
            if (process) {
                Helpers.writeFile(this, CACHE_DIR, mimeType, fileExt, hasThumbnail, hasText, addClips, passthrough, null, null, null);
            }
        }
    }

    // _getClipboardContents (display, selection, selectionType, selectionSource) {
    //     if (selectionType === Meta.SelectionType.SELECTION_CLIPBOARD) {
    //         let mimeTypes = Clipboard.get_mimetypes(St.ClipboardType.CLIPBOARD);
    //         log(`mimeTypes: ${mimeTypes}`);
    //         let [process, passthrough, mimeType, fileExt, hasThumbnail, hasText] = Helpers.getClipParameters(display, mimeTypes);
    //         if (process) {
    //             Helpers.writeFile(this, CACHE_DIR, mimeType, fileExt, hasThumbnail, hasText, this._addClip, passthrough, null, null, null);
    //         }
    //     }
    // }

    _addClip(params) {
        let [type, filename, filepath, app_grid] = params;
        let clip = new BaseContainer.ClipsBaseContainer(type, filename, filepath);
        app_grid._flowbox.insert_child_at_index(clip, 0);
        app_grid._totalClips.set_text(`Clips: ${app_grid._flowbox.get_children().length}`);
        clip.connect('key-focus-in', () => {
            Util.ensureActorVisibleInScrollView(app_grid._scrollView, clip);
        });
        // clip.index = app_grid._flowbox.get_children().length;
        // log(`clip: ${clip._fileName}, index: ${clip.index}`);
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
        Main.wm.removeKeybinding("toggle-menu");
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    log(`initializing ${meta.metadata.name}`);
    return new Extension(meta.uuid);
}
