'use strict';
/* prefs.js
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const { Adw, Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

function init() {
}

function fillPreferencesWindow(window) {
    // Use the same GSettings schema as in `extension.js`
    const settings = ExtensionUtils.getSettings(
        'org.gnome.shell.extensions.clips');
    
    // Create a preferences page and group
    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup();
    page.add(group);

    // Create a new preferences row
    const row = new Adw.ActionRow({ title: 'First run' });
    group.add(row);

    // Create the switch and bind its value to the `show-indicator` key
    const toggle = new Gtk.Switch({
        active: settings.get_boolean ('first-run'),
        valign: Gtk.Align.CENTER,
    });
    settings.bind(
        'first-run',
        toggle,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );

    // Add the switch to the row
    row.add_suffix(toggle);
    row.activatable_widget = toggle;

    // Add our page to the window
    window.add(page);
}