'use strict';
/* containers.js
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

const { Clutter, St, GObject, Gio, GLib, Gdk, GdkPixbuf } = imports.gi;
const Util = imports.misc.util;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

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
            width: 500, // 3 columns
            // width: 700, // 4 columns
            height: 360,
        });
        
        this._selected_child = null;
        
        this._scrollView = new St.ScrollView({
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            x_expand: true,
            overlay_scrollbars: false,
        });
        this._scrollView.add_style_class_name('clips-app-scrollview');

        this._flowbox = new St.Viewport({
            layout_manager: new ClipsAppFlowLayout(),
            x_expand: true,
            y_expand: true,
        });

        this._searchEntry = new St.Entry({
            name: 'searchEntry',
            style_class: 'clips-app-search-entry',
            can_focus: true,
            hint_text: _('Type here to search...'),
            track_hover: true,
            x_expand: true,
            y_expand: false
        });

        this._grid = new St.Widget({
            layout_manager: new Clutter.GridLayout({
                orientation: Clutter.Orientation.VERTICAL,
                // row_spacing: 10,
            }),
            x_expand: true,
            y_expand: true,
        });

        let _topSeparator = new PopupMenu.PopupSeparatorMenuItem();
        _topSeparator.style = `margin: 0px; margin-top: 10px; padding: 0px;`;
        _topSeparator.remove_child(_topSeparator._ornamentLabel); //not needed
        _topSeparator.x_align = Clutter.ActorAlign.FILL;

        let _bottomSeparator = new PopupMenu.PopupSeparatorMenuItem();
        _bottomSeparator.style = `margin: 0px; margin-bottom: 10px; padding: 0px;`;
        _bottomSeparator.remove_child(_bottomSeparator._ornamentLabel); //not needed
        _bottomSeparator.x_align = Clutter.ActorAlign.FILL;


        this._scrollView.add_actor(this._flowbox);

        this._grid.layout_manager.attach(this._searchEntry, 0, 0, 1, 1);
        this._grid.layout_manager.attach(_topSeparator, 0, 1, 1, 1);
        this._grid.layout_manager.attach(this._scrollView, 0, 2, 1, 1);
        this._grid.layout_manager.attach(_bottomSeparator, 0, 3, 1, 1);

        this.add_actor(this._grid);

    }
});


var ClipsBaseContainer = GObject.registerClass(
class ClipsBaseContainer extends PopupMenu.PopupBaseMenuItem {
    _init(type, filename, filepath, params) {
        super._init(params);
        this.remove_child(this._ornamentLabel); //not needed
        this.style = `padding: 2px;`; //remove default padding which is not balanced left/right
        this.width = 160;
        this.height = 120;
        // check base content type
        switch(type.split('/')[0]) {
            case 'image':
                var container = ClipsImageContainer;
                break;
            case 'text':
                var container = ClipsTextContainer;
                break;
            default:
                var container = ClipsTextContainer;
                break;
        }

        this.name = filename;
        this.type = type;
        this.path = filepath;

        this._clipContainer = new container(this, filepath);

        this._typeLabel = new St.Label({ 
            text: type.split('/')[1].toUpperCase(), 
            style_class: 'clips-label-type',
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.START,
            visible: false,
        });

        this._grid = new St.Widget({
            layout_manager: new Clutter.GridLayout({
                orientation: Clutter.Orientation.HORIZONTAL,
                row_spacing: 10,
                column_spacing: 10,
            }),
        });
        this._grid.layout_manager.attach(this._clipContainer, 0, 0, 1, 1);
        this._grid.layout_manager.attach(this._typeLabel, 0, 0, 1, 1);

        this.add_child(this._grid);
        
        // this.connect('enter-event', this._onEnter.bind(this));
        // this.connect('leave-event', this._onLeave.bind(this));
        this.connect('key-focus-in', this._onEnter.bind(this));
        this.connect('key-focus-out', this._onLeave.bind(this));

    }

    _onEnter () {
        this._typeLabel.visible = true;
        this.get_parent()._selected_child = this;
    }
    
    _onLeave () {
        this._typeLabel.visible = false;
    }

});
    

var ClipsTextContainer = GObject.registerClass(
class ClipsTextContainer extends St.Widget {
    _init(parent, filepath) {
        super._init({
            style_class: 'clips-container',
            layout_manager: new Clutter.GridLayout({ orientation: Clutter.Orientation.VERTICAL }),
            x_expand: false,
            y_expand: false,
            width: parent.width - 4,
            height: parent.height - 4,
        });
        this.add_style_class_name('clips-container-text');

        let file = Gio.File.new_for_path(filepath);

        // Synchronous, blocking method
        const [, contents, etag] = file.load_contents(null);
        
        // Asynchronous, non-blocking method
        // file.load_contents_async(
        //     null, 
        //     function (obj, res) {
        //         let [success, contents] = obj.load_contents_finish(res);

        //         if (success) {
        //             try {
        //                 if (contents instanceof Uint8Array) {
        //                     contents = imports.byteArray.toString(contents);
        //                     log(contents);
        //                 }
        //             } catch (e) {
        //                 log(`${filepath} error: ${e}`);
        //             }
        //         } else {
        //             log(`${filepath} error: unable to load`);;
        //         }
                
        // });

        if (contents instanceof Uint8Array) {
            var strContents = imports.byteArray.toString(contents);
        }

        this._content = new St.Label({ 
            text: strContents, 
            // x_align: Clutter.ActorAlign.FILL,
            // y_align: Clutter.ActorAlign.START,
            // x_expand: true,
            // y_expand: true,
        });

        this.layout_manager.attach(this._content, 0, 0, 1, 1);

        this.set_clip(0, 0, this.width, this.height);
        

        

    }
    
});


var ClipsImageContainer = GObject.registerClass(
class ClipsImageContainer extends St.Widget {
    _init(parent, filepath) {
        super._init({
            style_class: 'clips-container',
            layout_manager: new Clutter.GridLayout({ orientation: Clutter.Orientation.VERTICAL }),
            x_expand: false,
            y_expand: false,
            // width: parent.width - 6,
            // height: parent.height - 6,
        });

        // if (filepath.includes('.gif')) {
        //     this._pixbuf = GdkPixbuf.PixbufAnimation.new_from_file(filepath);
        //     this.iter = this._pixbuf.get_iter();
        //     this.alpha = this.iter.get_has_alpha();
        // }

        this._pixbuf = GdkPixbuf.Pixbuf.new_from_file(filepath);
        this._alpha = this._pixbuf.get_has_alpha();
        
        this._ratio_w_h = this._pixbuf.width / this._pixbuf.height;
        this._ratio_h_w = this._pixbuf.height / this._pixbuf.width;
        
        this._content = new St.DrawingArea({ 
            // style_class: 'clips-sub-container' 
            width: parent.width - 6,
            height: parent.height - 6,
        });
        this._content.connect('repaint', () => this.repaintImage());
        this.layout_manager.attach(this._content, 0, 0, 1, 1);

        if (this._alpha) {
            this.style = `background-image: url("${Me.path}/images/checkerboard.svg"); background-repeat: repeat; background-color: transparent;`;
        }
        
    }
    
    repaintImage() {
        let radius = 4;
        let pi = Math.PI;
        let final_pixbuf = null;
        let y = 0;
        let x = 0;

        let [width, height] = this._content.get_surface_size();
        let ctx = this._content.get_context();

        // if (this.type == 'gif') {
        //     pixbuf = GdkPixbuf.PixbufAnimationIter.get_pixbuf(this.iter);
        // } else {
        //     pixbuf = this._pixbuf;
        // }

        this._fitted_pixbuf = GdkPixbuf.Pixbuf.new(this._pixbuf.get_colorspace(), this._pixbuf.get_has_alpha(), this._pixbuf.get_bits_per_sample(), width, height);

        if (Math.round(width * this._ratio_h_w) < height) {
            this._scaled_pixbuf = this._pixbuf.scale_simple(Math.round(height * this._ratio_w_h), height, GdkPixbuf.InterpType.BILINEAR);
        } else {
            this._scaled_pixbuf = this._pixbuf.scale_simple(width, Math.round(width * this._ratio_h_w), GdkPixbuf.InterpType.BILINEAR);
        }

        if (this._pixbuf.width * this._pixbuf.height < width * height) {
            // # Find the offset we need to center the source pixbuf on the destination since its smaller
            y = Math.abs((height - this._pixbuf.height) / 2);
            x = Math.abs((width - this._pixbuf.width) / 2);
            final_pixbuf = this._pixbuf;
        } else {
            // # Find the offset we need to center the source pixbuf on the destination
            y = Math.abs((height - this._scaled_pixbuf.height) / 2);
            x = Math.abs((width - this._scaled_pixbuf.width) / 2);
            this._scaled_pixbuf.copy_area(x, y, width, height, this._fitted_pixbuf, 0, 0);
            // # Set coordinates for cairo surface since this has been fitted, it should be (0, 0) coordinate
            y = 0;
            x = 0;
            final_pixbuf = this._fitted_pixbuf;
        }

        ctx.save();
        
        // draws rounded rectangle
        ctx.arc(width - radius, radius, radius, 0-pi/2, 0); //# top-right-corner
        ctx.arc(width - radius, height - radius, radius, 0, pi/2); //# bottom-right-corner
        ctx.arc(radius, height - radius, radius, pi/2, pi); //# bottom-left-corner
        ctx.arc(radius, radius, radius, pi, pi + pi/2); //# top-left-corner
  
        Gdk.cairo_set_source_pixbuf(ctx, final_pixbuf, x, y)

        ctx.clip();
        ctx.paint();
        ctx.restore();

        ctx.$dispose();
    }
});