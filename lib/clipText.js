'use strict';
/* clipText.js
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const { Clutter, St, GObject, Gio, GLib, Gdk, GdkPixbuf, Pango } = imports.gi;
const Util = imports.misc.util;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Helpers = Me.imports.lib.helpers;

const _ = ExtensionUtils.gettext;

var ClipsTextContainer = GObject.registerClass(
class ClipsTextContainer extends St.Widget {
    _init(parent, filepath, altContent, params) {
        super._init({
            // style_class: 'clips-container',
            layout_manager: new Clutter.GridLayout({ orientation: Clutter.Orientation.VERTICAL }),
            x_expand: false,
            y_expand: false,
            width: parent.width - 6,
            height: parent.height - 6,
        });

        // this.add_style_class_name('clips-container-text');

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

        // log(`textContainer parent: ${parent}`);

    }

    _setContents (string) {

        this._contentGrid = new St.Widget({
            layout_manager: new Clutter.GridLayout({
                orientation: Clutter.Orientation.VERTICAL,
            }),
            can_focus: false,
            style_class: 'clips-grid-content'
        });

        this._content = new St.Label({ 
            text: string, 
        });

        this._contentGrid.layout_manager.attach(this._content, 0, 0, 1, 1);
        this.layout_manager.attach(this._contentGrid, 0, 0, 1, 1);

        // this.layout_manager.attach(this._content, 0, 0, 1, 1);

        // https://www.regexpal.com/97509
        let reColors = /(#([\da-f]{3}){1,2}|(rgb|hsl)a\((\d{1,3}%?,\s?){3}(1|0?\.\d+)\)|(rgb|hsl)\(\d{1,3}%?(,\s?\d{1,3}%?){2}\))/i;
        
        // https://urlregex.com/
        let reUrls = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/i;

        // https://regexr.com/3e48o
        let reEmails = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/i;

        switch(true) {
            case reColors.exec(string) != null:
                var isLight, color, alpha, style_string, font_color;

                isLight = Helpers.isLight(string);
                color = Helpers.toRgb(string);

                switch(true) {
                    case string.match("rgba") != null || string.match("hsla") != null:
                        var style_name = 'clips-container-color';
                        var alpha = string.replace(" ","").replace(";","").replace(")","").replace("(","").split(",");
                        alpha = alpha.slice(-1);
                        color = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
                        
                        switch(true) {
                            case isLight && parseFloat(alpha) >= 0.5:
                                font_color = "rgba(0,0,0,0.85)";
                                break;
                            case isLight && parseFloat(alpha) <= 0.5:
                                font_color = "rgba(255,255,255,0.85)";
                                break;
                            case !isLight && parseFloat(alpha) >= 0.5:
                                font_color = "rgba(255,255,255,0.85)"
                                break;
                            case !isLight && parseFloat(alpha) <= 0.5:
                                font_color = "rgba(0,0,0,0.85)";
                                break;
                        }
                        
                        break;
                    default:
                        color = `rgba(${color[0]},${color[1]},${color[2]},1)`;
                        font_color = "white";
                        break;
                }
            
                if (parseFloat(alpha) == 1) {
                    this.style  = `background-color: ${color}; color: ${font_color};`;
                } else {
                    this.style = `background-color: ${color}; background-image: url("${Me.path}/images/checkerboard.svg"); background-repeat: repeat; color: ${font_color};`;
                }

                log(`color: ${color}\nalpha: ${parseFloat(alpha)}\nisLight: ${isLight}\nstyle_string: ${style_string}\nfont_color: ${font_color}`);
                
                this._contentGrid.x_expand = true;
                this._contentGrid.y_expand = true;
                this._contentGrid.x_align = Clutter.ActorAlign.CENTER;
                this._contentGrid.y_align = Clutter.ActorAlign.CENTER;
                break;
            case reUrls.exec(string) != null:
                var style_name = 'clips-container-url';
                break;
            case reEmails.exec(string) != null:
                var style_name = 'clips-container-email';
                break;
            default:
                var style_name = 'clips-container-text';
                break;
        }

        this.add_style_class_name(style_name);

    }
    
});