'use strict';
/* prefs.js
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
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

function init () {}

function buildPrefsWidget () {
  let widget = new MyPrefsWidget();
  widget.show();
  return widget;
}

const MyPrefsWidget = GObject.registerClass(
class MyPrefsWidget extends Gtk.Box {
    _init (params) {
        super._init(params);

        this.margin = 20;
        this.set_spacing(15);
        this.set_orientation(Gtk.Orientation.VERTICAL);

        // this.connect('destroy', Gtk.main_quit);

        let myLabel = new Gtk.Label({
            label : "Translated Text"
        });

        let spinButton = new Gtk.SpinButton();
        spinButton.set_sensitive(true);
        spinButton.set_range(-60, 60);
        spinButton.set_value(0);
        spinButton.set_increments(1, 2);

        spinButton.connect("value-changed", function (w) {
            log(w.get_value_as_int());
        });

        let hBox = new Gtk.Box();
        hBox.set_orientation(Gtk.Orientation.HORIZONTAL);

        hBox.append(myLabel);
        hBox.append(spinButton);

        this.append(hBox);
    }
});