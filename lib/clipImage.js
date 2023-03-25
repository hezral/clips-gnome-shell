'use strict';
/* clipImage.js
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const { Clutter, St, GObject, Gio, GLib, Gdk, GdkPixbuf, Pango } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Helpers = Me.imports.lib.helpers;

const _ = ExtensionUtils.gettext;

var ClipsImageContainer = GObject.registerClass(
class ClipsImageContainer extends St.Widget {
    _init(parent, filepath, altContent) {
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
            width: parent.width - 6,
            height: parent.height - 6,
        });
        this._content.connect('repaint', () => this.repaintImage(altContent));
        this.layout_manager.attach(this._content, 0, 0, 1, 1);

        if (this._alpha) {
            this.style = `background-image: url("${Me.path}/images/checkerboard.svg"); background-repeat: repeat; background-color: transparent;`;
        }
        
    }
    
    repaintImage(altContent) {
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
            if (altContent) {
                x = 0;
                y = 0;
            } else {
                y = Math.abs((height - this._pixbuf.height) / 2);
                x = Math.abs((width - this._pixbuf.width) / 2);
            }
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