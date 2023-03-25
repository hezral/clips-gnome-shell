'use strict';
/* baseContainer.js
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const { Clutter, St, GObject, Gio, GLib, Gdk, GdkPixbuf, Pango } = imports.gi;
const Util = imports.misc.util;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Helpers = Me.imports.lib.helpers;
const ClipImage = Me.imports.lib.clipImage;
const ClipText = Me.imports.lib.clipText;
const ClipEmpty = Me.imports.lib.clipEmpty;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;


var ClipsBaseContainer = GObject.registerClass(
class ClipsBaseContainer extends PopupMenu.PopupBaseMenuItem {
    _init(type, filename, filepath, hasThumbnail, params) {
        super._init({
            style_class: 'clips-container-base',
        });
        this.remove_child(this._ornamentLabel); //not needed
        // this.remove_style_class_name('popup-menu-item');
        // this.add_style_class_name('clips-container-base');
        // this.style = `padding: 2px 3px 2px 2px;`; //remove default padding which is not balanced left/right
        // this.style = `padding: 2px 2px 2px 2px;`; //remove default padding which is not balanced left/right
        this.width = 160;
        this.height = 120;
        
        this.index = 0;
        this._fileType = type;
        this._fileExt = filename.split('.')[1];
        this._fileName = filename;
        this._filePath = filepath;
        this._hasThumbnail = false;
        this._hasText = false;
        this._selected = false;

        const thisFile = Gio.File.new_for_path(filepath);
        const thisFileInfo = thisFile.query_info(
            'standard::*,time::*', 
            Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, 
            null
        )
        this._fileCreated = new Date(0);
        this._fileCreated.setSeconds(thisFileInfo.get_attribute_as_string(Gio.FILE_ATTRIBUTE_TIME_CREATED)).toString();

        const path = filepath.split(".");
        path.pop();
        this._thumbFile = path.join('.').toString() + '-thumb.png';
        this._textFile = path.join('.').toString() + '-text.txt';
        if (GLib.file_test(this._thumbFile, GLib.FileTest.EXISTS)) {
            filepath = this._thumbFile;
            this._hasThumbnail = true;
        }
        if (GLib.file_test(this._textFile, GLib.FileTest.EXISTS)) {
            filepath = this._textFile;
            this._hasText = true;
        }

        switch(true) {
            case type.split('/')[0] == 'image':
                var container = ClipImage.ClipsImageContainer;
                break;
            case type.split('/')[0] == 'text':
                var container = ClipText.ClipsTextContainer;
                break;
            case this._hasThumbnail:
                var container = ClipImage.ClipsImageContainer;
                var altContent = true;
                break;
            case this._hasText:
                var container = ClipText.ClipsTextContainer;
                var altContent = true;
                break;
            default:
                var container = containerEmpty.ClipsEmptyContainer;
                break;
        }
        
        this._clipContainer = new container(this, filepath, altContent);
        
        var labelText = this._fileExt.toUpperCase();
        // var labelText = type.split('/')[1].split('.')[type.split('/')[1].split('.').length - 1].toUpperCase();

        this._labelType = new St.Label({ 
            text: labelText, 
            style_class: 'clips-label-type',
            x_expand: true, 
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
            visible: false,
        });

        // this._btnCopyClip = this._generateActionIcon('copy', 'copy-symbolic.svg');
        const _generateActionIcon = Helpers.generateActionIcon.bind(this);
        this._btnViewClip = _generateActionIcon('view', 'view-symbolic.svg', 'clips-icons-actions', false);
        this._btnDeleteClip = _generateActionIcon('delete', 'delete-symbolic.svg', 'clips-icons-actions', false);
        this._btnSelectClip = this._generateSelectIcon();

        this._actionGrid = new St.Widget({
            layout_manager: new Clutter.GridLayout({
                orientation: Clutter.Orientation.VERTICAL,
            }),
            // height: 30,
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.END,
            can_focus: false,
            style_class: 'clips-grid-actions'
        });

        // this._actionGrid.layout_manager.attach(this._btnCopyClip, 0, 0, 1, 1);
        this._actionGrid.layout_manager.attach(this._labelType, 0, 0, 1, 1);
        this._actionGrid.layout_manager.attach(this._btnViewClip, 1, 0, 1, 1);
        this._actionGrid.layout_manager.attach(this._btnDeleteClip, 2, 0, 1, 1);

        this._grid = new St.Widget({
            layout_manager: new Clutter.GridLayout({
                orientation: Clutter.Orientation.HORIZONTAL,
                row_spacing: 10,
                column_spacing: 10,
            }),
        });
        this._grid.layout_manager.attach(this._clipContainer, 0, 0, 1, 1);
        this._grid.layout_manager.attach(this._actionGrid, 0, 0, 1, 1);
        this._grid.layout_manager.attach(this._btnSelectClip, 0, 0, 1, 1);

        this.add_child(this._grid);
        
        this.connect('activate', (clip, event) => {
            Helpers.copyClip(this._fileType, this._filePath);
            // let [indicator, appgrid, grid, scrollview, flowbox] = this._getContainer();
            // indicator._showNotification(`Copied clip # ${this.index} ${this._fileType}`);
            // indicator.menu.toggle();
        });

        this.connect('notify::active', () => {
            if (this.active) {
                this._onEnter();
            } else {
                this._onLeave();
            }
        });

    }

    _generateSelectIcon () {
        let gIconNormal = Gio.icon_new_for_string(`${Me.path}/icons/select-alt-symbolic.svg`);
        let iconNormal = new St.Icon({ gicon: gIconNormal, icon_size: 16, style_class: 'icon', visible: true });
        let button = new St.Button({
            name: 'select',
            child: iconNormal,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.START,
            x_expand: true,
            y_expand: true,
            can_focus: false,
            visible: false,
            style_class: 'clips-icons-select'
        });
        button.connect('clicked', (button) => {
            this._onButtonClicked(button);
        });

        button.connect('enter-event', () => {
            Util.wiggle(button, {
                offset: 1,
                duration: 100,
                wiggleCount: 3,
            });
            let giconSelected = Gio.icon_new_for_string(`${Me.path}/icons/selected.svg`);
            let iconSelected = new St.Icon({ gicon: giconSelected, icon_size: 16, style_class: 'icon', visible: true });
            button.set_child(iconSelected);
        });

        button.connect('leave-event', () => {
            button.set_child(iconNormal);
        });
        return button;
    }
    
    _getContainer () {
        let flowbox = this.get_parent();
        let scrollview = flowbox.get_parent();
        let grid = scrollview.get_parent();
        let app_grid = grid.get_parent();
        let popupmenusection = app_grid.get_parent();
        let popupmenu = popupmenusection.get_parent();
        let bincontainer = popupmenu.get_parent();
        let menu = bincontainer.get_parent();
        let indicator = menu._sourceActor;
        return [indicator, app_grid, grid, scrollview, flowbox];
    }

    _onButtonClicked (button) {
        // log(`clicked: ${button.name} ${this._filePath}`);
        let [indicator, app_grid, grid, scrollview, flowbox] = this._getContainer();
        switch (button.name) {
            case 'copy' :
                Helpers.copyClip(this._fileType, this._filePath);
                break;
            case 'view' :
                indicator.menu.toggle();
                Helpers.openFileInDefaultApp(this._filePath);
                break;
            case 'delete' :
                this.destroy();
                Helpers.deleteClip(this._filePath);
                if (this._hasThumbnail) {
                    Helpers.deleteClip(this._thumbFile);
                }
                if (this._hasText) {
                    Helpers.deleteClip(this._textFile);
                }
                app_grid._totalClips.set_text(`Clips: ${flowbox.get_children().length}`);
                break;
            case 'select' :
                this._selected = true;

            default :
                break;
        }
    }

    _onEnter () {
        this._actionGrid.get_children().forEach(child => {
            child.visible = true;
        });
        this._btnSelectClip.visible = true;
        let [indicator, appgrid, grid, scrollview, flowbox] = this._getContainer();
        appgrid._selected_child = this;
        appgrid._labelShortcutKey.visible = true;
        appgrid._labelShortcutMod.visible = true;
        if (this.index < 10) {
            appgrid._labelShortcutKey.set_text(this.index.toString());
        } else {
            appgrid._labelShortcutKey.set_text('C');
        }
;    }
    
    _onLeave () {
        this._actionGrid.get_children().forEach(child => {
            child.visible = false;
        });
        this._btnSelectClip.visible = false;
        let [indicator, appgrid, grid, scrollview, flowbox] = this._getContainer();
        appgrid._labelShortcutKey.visible = false;
        appgrid._labelShortcutMod.visible = false;
    }

});