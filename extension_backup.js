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

const GETTEXT_DOMAIN = 'clips-gnome-shell';

const { Clutter, GObject, St, Gio, Shell } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

// Normal FlowLayout doesn't work in a ScrollView. Overriding
// `vfunc_get_preferred_height` to return the `natHeight` as `minHeight`
// fixes this.
var ClipsAppFlowLayout = GObject.registerClass(
    class ClipsAppFlowLayout extends Clutter.FlowLayout {
        vfunc_get_preferred_height(container, forWidth) {
            const [minHeight, natHeight] = super.vfunc_get_preferred_height(container, forWidth);
            return [natHeight, natHeight];
        }
});

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('Clips'));

        let gicon = Gio.icon_new_for_string(`${Me.path}/icons/clips-symbolic.svg`);
        let icon = new St.Icon({ gicon, icon_size: 24, style_class: 'icon' });
        log(`this ${this}`);
        this.add_child(icon);
        // this.add_child(new St.Icon({
        //     icon_name: 'face-smile-symbolic',
        //     style_class: 'system-status-icon',
        // }));

        // let item = new PopupMenu.PopupMenuItem(_('Show Notification'));
        // item.connect('activate', () => {
        //     Main.notify(_('Whatʼs up, folks?'));
        //     this._buildMainWindow();
        // });
        // this.menu.addMenuItem(item);

        let statusMenu = new PopupMenu.PopupMenuSection();

        this._scrollView = new St.ScrollView({
            vscrollbar_policy: St.PolicyType.ALWAYS,
            hscrollbar_policy: St.PolicyType.NEVER,
            // x_expand: false,
            y_expand: true,
            // x_align: Clutter.ActorAlign.START,
            // y_align: Clutter.ActorAlign.FILL,
            overlay_scrollbars: true,
            style_class: 'clips-app-scrollview'
        });

        this.grid = new St.Viewport({
            layout_manager: new Clutter.GridLayout({
                orientation: Clutter.Orientation.VERTICAL,
                column_spacing: 20,
                row_spacing: 20,
                // row_homogeneous: true,
                // column_homogeneous: true,
            }),
            // x_expand: false,
            // y_expand: false,
            // x_align: Clutter.ActorAlign.START,
            // y_align: Clutter.ActorAlign.FILL,
            style_class: 'clips-app-grid',
        });
        let lm = this.grid.layout_manager;
        this._scrollView.add_actor(this.grid);

        let label = new St.Label({ text: 'Processor usage1', style_class: 'menu-header' });
        lm.attach(label, 0, 0, 1, 1)
        // this.grid.add_actor(label)

        label = new St.Label({ text: 'Processor usage2', style_class: 'menu-header' });
        lm.attach(label, 1, 0, 1, 1)
        // this.grid.add_actor(label)
        
        label = new St.Label({ text: 'Processor usage3', style_class: 'menu-header' });
        lm.attach(label, 0, 1, 1, 1)
        // this.grid.add_actor(label)
        
        label = new St.Label({ text: 'Processor usage4', style_class: 'menu-header' });
        lm.attach(label, 1, 1, 1, 1)
        // this.grid.add_actor(label)

        label = new St.Label({ text: 'Processor usage4', style_class: 'menu-header' });
        lm.attach(label, 0, 2, 1, 1)
        // this.grid.add_actor(label)

        label = new St.Label({ text: 'Processor usage4', style_class: 'menu-header' });
        lm.attach(label, 1, 2, 1, 1)
        // this.grid.add_actor(label)

        label = new St.Label({ text: 'Processor usage4', style_class: 'menu-header' });
        lm.attach(label, 0, 3, 1, 1)
        // this.grid.add_actor(label)

        label = new St.Label({ text: 'Processor usage4', style_class: 'menu-header' });
        lm.attach(label, 1, 3, 1, 1)
        // this.grid.add_actor(label)

        label = new St.Label({ text: 'Processor usage4', style_class: 'menu-header' });
        lm.attach(label, 0, 4, 1, 1)
        // this.grid.add_actor(label)

        label = new St.Label({ text: 'Processor usage4', style_class: 'menu-header' });
        lm.attach(label, 1, 4, 1, 1)
        // this.grid.add_actor(label)
        
        // let appSys = Shell.AppSystem.get_default();
        // let app = appSys.lookup_app('gnome-system-monitor.desktop');
        // let menuItem = new PopupMenu.PopupImageMenuItem('System Monitor', 'org.gnome.SystemMonitor-symbolic');
        // menuItem.connect('activate', () => {
        //     this.menu.close(true);
        //     app.activate();
        // });
        // menuItem.connect('leave-event', widget => {
        //     widget.set_hover(false);
        //     widget.remove_style_pseudo_class('focus');
        // });
        // // this.menu.addMenuItem(menuItem);
        // lm.attach(menuItem, 1, 0, 1, 1)
        
        // statusMenu.box.add_child(this._scrollView);

        // let pixbuf = GdkPixb2uf.Pixbuf.new_from_file(`${Me.path}/images/cyberpunk2077.jpg`);
        // let px_format = pixbuf.has_alpha ? Cogl.PixelFormat.RGBA_8888 : Cogl.PixelFormat.RGB_888;
        // let scaled_pixbuf = pixbuf.scale_simple(0.25 * pixbuf.width, 0.25 * pixbuf.height, GdkPixbuf.InterpType.BILINEAR);
        // let fitted_pixbuf = GdkPixbuf.Pixbuf.new(pixbuf.get_colorspace(), pixbuf.get_has_alpha(), pixbuf.get_bits_per_sample(), 250, 250)
        // let image = new St.ImageContent({
            //     preferred_height: scaled_pixbuf.height,
            //     preferred_width: scaled_pixbuf.width
            // });
            // image.set_bytes(scaled_pixbuf.pixel_bytes, px_format, scaled_pixbuf.width, scaled_pixbuf.height, scaled_pixbuf.rowstride);
            
            // let clip_image = new St.Icon({ 
                //     gicon: image, 
                //     style_class: 'clips-container-image',
                //     icon_size: scaled_pixbuf.height
                // });
                // lm.attach(clip_image, 0, 0, 1, 1);`
        statusMenu.box.add_actor(this._scrollView);
        this.menu.addMenuItem(statusMenu);

    }

    _buildMainWindow () {
        // let widget = new MainWindow.ClipsWindow();
        // widget.show();
        // return widget;
        // let window = new Gtk.Window();
        // window.show();
        log('_buildMainWindow');

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
