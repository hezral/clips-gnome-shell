'use strict';
/* appGrid.js
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const { Clutter, St, GObject, Gio, GLib, Gdk, GdkPixbuf, Pango } = imports.gi;
const Util = imports.misc.util;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Helpers = Me.imports.lib.helpers;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const CACHE_DIR = GLib.get_user_cache_dir() + '/' + Me.uuid;

const _ = ExtensionUtils.gettext;


// Normal FlowLayout doesn't work in a ScrollView. Overriding
// `vfunc_get_preferred_height` to return the `natHeight` as `minHeight`
// fixes this.
var ClipsAppFlowLayout = GObject.registerClass(
class ClipsAppFlowLayout extends Clutter.FlowLayout {
    _init() {
        super._init({
            orientation: Clutter.Orientation.HORIZONTAL,
            homogeneous: false,
            column_spacing: 6,
            row_spacing: 6,
        });
    }

    vfunc_get_preferred_height(container, forWidth) {
        const [minHeight, natHeight] = super.vfunc_get_preferred_height(container, forWidth);
        return [natHeight, natHeight];
    }
    
});


var ClipsAppGrid = GObject.registerClass(
class ClipsAppGrid extends St.Widget {
    _init() {
        super._init({
            layout_manager: new Clutter.BoxLayout({ orientation: Clutter.Orientation.VERTICAL }),
            // width: 160, // 1 column
            // width: 334, // 2 columns
            width: 521, // 3 columns
            // width: 700, // 4 columns
            height: 400,
        });
        
        this._selected_child = null;

        let giconSearch = Gio.icon_new_for_string(`${Me.path}/icons/find-symbolic.svg`);
        let iconSearch = new St.Icon({ gicon: giconSearch, icon_size: 16, style_class: 'icon', visible: true });
        let giconClear = Gio.icon_new_for_string(`${Me.path}/icons/clear-symbolic.svg`);
        let iconClear = new St.Icon({ gicon: giconClear, icon_size: 16, style_class: 'icon', visible: false });
        this._searchEntry = new St.Entry({
            name: 'searchEntry',
            style_class: 'clips-app-search-entry',
            can_focus: true,
            hint_text: _('Search clips'),
            track_hover: true,
            x_expand: true,
            y_expand: false,
            primary_icon: iconSearch,
            secondary_icon: iconClear,
            visible: false
        });
        this._setupSearchEntryEvents();

        this._topSeparator = new PopupMenu.PopupSeparatorMenuItem();
        this._topSeparator.visible = false;
        this._topSeparator.style = `margin: 0px; padding: 0px;`;
        this._topSeparator.remove_child(this._topSeparator._ornamentLabel); //not needed

        this._bottomSeparator = new PopupMenu.PopupSeparatorMenuItem();
        this._bottomSeparator.style = `margin: 0px; padding: 0px;`;
        this._bottomSeparator.remove_child(this._bottomSeparator._ornamentLabel); //not needed
        this._bottomSeparator.can_focus = false;

        this._appActionGrid = new St.Widget({
            layout_manager: new Clutter.GridLayout({
                orientation: Clutter.Orientation.HORIZONTAL,
            }),
            height: 32,
            x_expand: true,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.END,
            can_focus: false,
            style_class: 'clips-app-action-grid'
        });
        this._appActionGrid.layout_manager.column_spacing = 5;

        this._totalClips = new St.Label({ 
            text: 'Clips: 0', 
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: false,
            can_focus: false,
            style_class: 'clips-app-total-clips',
            visible: true
        });

        this._labelShortcutMod = new St.Label({ 
            text: 'Ctrl', 
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: false,
            y_expand: false,
            can_focus: false,
            style_class: 'clips-app-action-modifier',
            visible: false
        });

        this._labelShortcutKey = new St.Label({ 
            text: '1', 
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: false,
            y_expand: false,
            can_focus: false,
            style_class: 'clips-app-action-shortcut',
            visible: false
        });

        const _generateActionIcon = Helpers.generateActionIcon.bind(this);
        this._settingsButton = _generateActionIcon('settings', 'settings-symbolic.svg', 'clips-app-action', true);
        this._settingsButton.x_expand = false;
        this._settingsButton.y_expand = false;

        this._searchButton = _generateActionIcon('search', 'find-symbolic.svg', 'clips-app-action', true);
        this._searchButton.x_expand = false;
        this._searchButton.y_expand = false;

        this._cacheButton = _generateActionIcon('cache', 'folder-symbolic.svg', 'clips-app-action', true);
        this._cacheButton.x_expand = false;
        this._cacheButton.y_expand = false;
        
        this._appActionGrid.layout_manager.attach(this._totalClips, 0, 0, 1, 1);
        // this._appActionGrid.layout_manager.attach(this._labelShortcutMod, 1, 0, 1, 1);
        // this._appActionGrid.layout_manager.attach(this._labelShortcutKey, 2, 0, 1, 1);
        this._appActionGrid.layout_manager.attach(this._searchButton, 1, 0, 1, 1);
        this._appActionGrid.layout_manager.attach(this._cacheButton, 2, 0, 1, 1);
        this._appActionGrid.layout_manager.attach(this._settingsButton, 3, 0, 1, 1);

        this._labelNoClips = new St.Label({ 
            text: 'No Clips', 
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true,
            can_focus: false,
            style_class: 'clips-app-label-noclips',
            visible: true
        });

        this._flowbox = new St.Viewport({
            layout_manager: new ClipsAppFlowLayout(),
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
        });
        
        this._scrollView = new St.ScrollView({
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            overlay_scrollbars: false,
            style_class: 'clips-app-scrollview'
        });
        // this._scrollView.add_style_class_name('clips-app-scrollview');
        this._scrollView.add_actor(this._flowbox);

        this._flowbox.connect('actor-added', (flowbox) => {
            this._scrollView.visible = true;
            this._labelNoClips.visible = false;
            this._reindexClips();
        });

        this._flowbox.connect('actor-removed', (flowbox) => {
            // this._labelShortcutKey.visible = false;
            // this._labelShortcutMod.visible = false;
            if (this._flowbox.get_children().length == 0) {
                this._labelNoClips.visible = true;
                this._scrollView.visible = false;
            } else {
                this._reindexClips();
            }
        });

        this._grid = new St.Widget({
            layout_manager: new Clutter.GridLayout({
                orientation: Clutter.Orientation.VERTICAL,
            }),
            x_expand: true,
            y_expand: true,
        });

        this._grid.layout_manager.attach(this._labelNoClips, 0, 0, 1, 1);
        this._grid.layout_manager.attach(this._scrollView, 0, 0, 1, 1);
        this._grid.layout_manager.attach(this._topSeparator, 0, 1, 1, 1);
        this._grid.layout_manager.attach(this._searchEntry, 0, 2, 1, 1);
        this._grid.layout_manager.attach(this._bottomSeparator, 0, 3, 1, 1);
        this._grid.layout_manager.attach(this._appActionGrid, 0, 4, 1, 1);
        this.add_actor(this._grid);

    }

    _getIndicatorContainer () {
        let popupmenusection = this.get_parent();
        let popupmenu = popupmenusection.get_parent();
        let bincontainer = popupmenu.get_parent();
        let menu = bincontainer.get_parent();
        let indicator = menu._sourceActor;
        return indicator;
    }

    _onButtonClicked (button) {
        switch (button.name) {
            case 'search' :
                this._toggleSearch();
                break;
            case 'cache' :
                Helpers.showFileInFileManager(CACHE_DIR);
                break;
            case 'settings' :
                this._toggleSettings();
                break;
            default :
                break;
        }
    }

    _toggleSettings () {
        let indicator = this._getIndicatorContainer();
        if (typeof ExtensionUtils.openPrefs === 'function') {
            ExtensionUtils.openPrefs();
        } else {
            Util.spawn([
                "gnome-shell-extension-prefs",
                Me.uuid
            ]);
        }
        indicator.menu.toggle();
    }

    _toggleSearch () {
        if (this._topSeparator.visible && this._searchEntry.visible) {
            this._topSeparator.visible = false;
            this._searchEntry.visible = false;
            this._searchEntry.set_text('');
        } else {
            this._topSeparator.visible = true;
            this._searchEntry.visible = true;      
            this._searchEntry.grab_key_focus();                  
        }
    }

    _reindexClips () {
        this._flowbox.get_children().sort(function(a,b){
            let aChild = Gio.File.new_for_path(a._filePath);
            let aChildFileInfo = aChild.query_info('standard::*,time::*', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
            let bChild = Gio.File.new_for_path(b._filePath);
            let bChildFileInfo = bChild.query_info('standard::*,time::*', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
            return aChildFileInfo.get_attribute_as_string(Gio.FILE_ATTRIBUTE_TIME_CREATED) - bChildFileInfo.get_attribute_as_string(Gio.FILE_ATTRIBUTE_TIME_CREATED);
        });
        var index = 1;
        this._flowbox.get_children().forEach(child => {
            child.index = index;
            index++;
        });
    }

    _setupSearchEntryEvents () {
        // this._searchEntry.get_first_child().connect('key-focus-in', () => {
        //     // this._labelShortcutKey.visible = false;
        //     // this._labelShortcutMod.visible = false;
        // });

        // this._searchEntry.get_first_child().connect('key-focus-out', () => {
        //     if (this._flowbox.get_children().length > 0) {
        //         this._labelShortcutKey.visible = true;
        //         this._labelShortcutMod.visible = true;
        //     }
        // });


        let searchSecondaryIcon = this._searchEntry.secondary_icon;
        searchSecondaryIcon.connect('event', (icon, event) => {
            if (event.type() == Clutter.EventType.BUTTON_RELEASE) {
                this._searchEntry.set_text('');
            }
        });

        this._searchEntry.get_clutter_text().connect('text-changed', () => {
            let searchText = this._searchEntry.get_text().toLowerCase();

            if (searchText === '') {
                this._flowbox.get_children().forEach(child => {
                    child.visible = true;
                });
            }
            else {
                this._searchEntry.secondary_icon.visible = true;
                this._flowbox.get_children().forEach(child => {
                    switch (true) {
                        case child._fileType.toLowerCase().includes(searchText):
                            child.visible = true;
                            break;
                        case child._fileCreated.toString().toLowerCase().includes(searchText):
                            child.visible = true;
                            break;
                        case child._hasText && child._clipContainer._content.text.toLowerCase().includes(searchText):
                            child.visible = true;
                            log(`textContainer: ${child._clipContainer._content.text}`);
                            break;
                        default:
                            child.visible = false;
                            break;
                    }
                });
            }
        });
    }
});