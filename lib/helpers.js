'use strict';
/* utils.js
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const { Clutter, St, Gio, GLib } = imports.gi;
const Mainloop = imports.mainloop;
const Clipboard = St.Clipboard.get_default();

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const DomToImage = Me.imports.lib.dom_to_image;

// Print objects
function prettyPrint (name, obj, recurse, _indent) {
    let prefix = '';
    let indent = typeof _indent === 'number' ? _indent : 0;
    for (let i = 0; i < indent; i++) {
        prefix += '    ';
    }

    recurse = typeof recurse === 'boolean' ? recurse : true;
    if (typeof name !== 'string') {
        obj = arguments[0];
        recurse = arguments[1];
        _indent = arguments[2];
        name = obj.toString();
    }

    log(prefix + '--------------');
    log(prefix + name);
    log(prefix + '--------------');
    for (let k in obj) {
        if (typeof obj[k] === 'object' && recurse) {
            prettyPrint(name + '::' + k, obj[k], true, indent + 1);
        }
        else {
            log(prefix + k, typeof obj[k] === 'function' ? '[Func]' : obj[k]);
        }
    }
}

function contentTypeToMimeType (contentType) {
    log(contentType);
}

function getClipParameters (display, mimeTypes) {

    var process = true;
    var passthrough = false;
    var hasThumbnail = false;
    var hasText = false;
    var suffix = '';

    switch (true) {
        // skips Nautilus grabbing the copy event after a copy from another app and copying the file's path
        case (mimeTypes == 'text/plain;charset=utf-8' || mimeTypes == 'image/png') :
            if (display.get_focus_window() != null) {
                if (display.get_focus_window().wm_class.toLowerCase() == 'org.gnome.nautilus') {
                    process = false;
                }
            }
            break;
        // wps writer
        case mimeTypes.toString().includes('Kingsoft WPS 9.0 Format') :
            var mimeType = 'Kingsoft WPS 9.0 Format';
            var fileExt = 'docx';
            break;
        // wps spreadsheets
        case mimeTypes.toString().includes('WPS Spreadsheets 6.0 Format') :
            var mimeType = 'WPS Spreadsheets 6.0 Format';
            var fileExt = 'xlsx';
            break;
        case mimeTypes.toString().includes('WPS Drawing Shape Format') :
            var mimeType = 'WPS Drawing Shape Format';
            var fileExt = 'pptx';
            break;
        case mimeTypes.toString().includes('PowerPoint 14.0 Slides Package') :
            var mimeType = 'PowerPoint 14.0 Slides Package';
            var fileExt = 'pptx';
            break;
        // wps pdf
        
        // ods format
        case mimeTypes.toString().includes('application/x-openoffice-sylk;windows_formatname="Sylk"') :
            var mimeType = 'text/html';
            var fileExt = 'ods';
            break;
        // odp format
        case mimeTypes.toString().includes('application/x-openoffice-drawing;windows_formatname="Drawing Format"') :
            var mimeType = 'application/x-openoffice-drawing;windows_formatname="Drawing Format"';
            var fileExt = 'odp';
            break;
        // odt format
        case mimeTypes.toString().includes('application/x-openoffice-embed-source-xml;windows_formatname="Star Embed Source (XML)"') :
            var mimeType = 'text/html';
            var fileExt = 'odt';
            break;
        // general image format
        case mimeTypes.toString().split('/')[0].includes('image') && !mimeTypes.toString().includes('image/x-inkscape-svg'):
            var mimeType = 'image/png';
            var fileExt = 'png';
            break;
        // svg image format
        case mimeTypes.toString().split('/')[0].includes('image') && mimeTypes.toString().includes('image/x-inkscape-svg'):
            var mimeType = 'image/x-inkscape-svg';
            var fileExt = 'svg';
            break;
        // image copied in eog
        case mimeTypes.toString().includes('text/uri-list') && mimeTypes.toString().includes('image/png'):
            var mimeType = 'image/png';
            var fileExt = 'png';
            break;
        // files copied in file manager
        case mimeTypes.toString().includes('text/uri-list') && mimeTypes.toString().includes('x-special/gnome-copied-files'):
            var mimeType = 'x-special/gnome-copied-files';
            var fileExt = 'files';
            passthrough = true;
            break;
        // html text format
        case mimeTypes.toString().includes('text/html') :
            var mimeType = 'text/html';
            var fileExt = 'html';
            break;
        // plain text format
        case !mimeTypes.toString().includes('text/html') && (mimeTypes.toString().includes('text/plain;charset=utf-8') || mimeTypes.toString().includes('text/plain')) :
            var mimeType = 'text/plain;charset=utf-8';
            var fileExt = 'txt';
            break;
        default:
            process = false;
            break;
    }

    if (process) {
        if (!mimeType.includes('image') && mimeTypes.toString().includes('image/png')) {
            var hasThumbnail = true;
        }
        if (fileExt == 'docx' ||  fileExt == 'odt' || fileExt == 'html') {
            var hasText = true;
        }
    }

    return [process, passthrough, mimeType, fileExt, hasThumbnail, hasText];
}


function generateHashWithGioFile (gioFile) {
    let checkSum = new GLib.Checksum(GLib.ChecksumType.MD5);
    let [fileBytes, etag] = gioFile.load_bytes(null);
    checkSum.update(fileBytes.get_data());
    return checkSum.get_string();
}

function generateHashWithByteArray (byteArray) {
    let checkSum = new GLib.Checksum(GLib.ChecksumType.MD5);
    checkSum.update(byteArray);
    return checkSum.get_string();
}


function generateTempFile (suffix) {
    // https://gjs.guide/guides/gio/subprocesses.html#communicating-with-processes
    // this only prints out the filename
    let loop = GLib.MainLoop.new(null, false);

    try {
        let proc = Gio.Subprocess.new(
            ['mktemp', '-u', '--suffix', suffix],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );
    
        let [success, stdout, stderr] = proc.communicate_utf8(null, null);

        if (success) {
            loop.quit();
            return stdout;
        } else {
            loop.quit();
            throw new Error(stderr);
        }
    } catch (e) {
        logError(e);
    }
    
    loop.run();
}


function readFileContents (filepath, callback) {
    if (typeof callback !== 'function')
        throw TypeError('`callback` must be a function');

    if (GLib.file_test(filepath, GLib.FileTest.EXISTS)) {
        const file = Gio.File.new_for_path(filepath);

        file.load_contents_async(
            null, 
            function (file_, result) {
                let [success, contents] = file_.load_contents_finish(result);
                if (success) {
                    try {
                        callback(contents);
                    }
                    catch (e) {
                        throw TypeError(e);
                    }
                } else {
                    throw TypeError('load failed `file`');
                }
            });
    } else {
        throw TypeError('`filepath` doesn\'t exist');
    }
}


function readDirectory (gioFile, num_files, lower_idx, upper_idx, callback, parent) {
    if (typeof callback !== 'function')
        throw TypeError('`callback` must be a function');

    if (GLib.file_test(gioFile.get_path(), GLib.FileTest.EXISTS)) {
        gioFile.enumerate_children_async(
            'standard::*,time::*',
            Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
            GLib.PRIORITY_DEFAULT,
            null,
            (file_, result) => {
                try {
                    _enumerateFileInfo(gioFile.get_path(), gioFile.enumerate_children_finish(result), num_files, lower_idx, upper_idx, callback, parent);
                } catch (e) {
                    throw TypeError(e);
                }
            });
    } else {
        throw TypeError('`filepath` doesn\'t exist');
    }
}


function _enumerateFileInfo (directoryPath, gioFileEnumerator, num_files, lower_idx, upper_idx, callback, parent) {
    gioFileEnumerator.next_files_async(
        num_files, // limit results
        GLib.PRIORITY_DEFAULT,
        null,
        (iter_, res) => {
            parent.cacheFiles = gioFileEnumerator.next_files_finish(res);
            var idx = 0;
            parent.cacheFiles.sort(function(a,b){
                // Turn your strings into dates, and then subtract them
                // to get a value that is either negative, positive, or zero.
                // return new Date(b.date) - new Date(a.date);
                return a.get_attribute_as_string(Gio.FILE_ATTRIBUTE_TIME_CREATED) - b.get_attribute_as_string(Gio.FILE_ATTRIBUTE_TIME_CREATED);
            });
            parent.cacheFiles.forEach((child, index, arr) => {
                if (index >= lower_idx && index <= upper_idx && ! child.get_name().includes('-thumb') && ! child.get_name().includes('-text')) {
                    var params = [
                        child.get_content_type(), 
                        child.get_name(), 
                        directoryPath + '/' + child.get_name(), 
                        parent._appGrid
                    ];

                    Mainloop.timeout_add(500, function () {
                        callback(params);
                        return false;
                    });

                    idx++;
                }
            });
        }
    );
}


function writeFile (parent, directoryPath, mimeType, fileExt, hasThumbnail, hasText, callback, passthrough, paramsArray, hash, suffix) {
    if (typeof callback !== 'function')
        throw TypeError('`callback` must be a function');
    
    if (passthrough) {
        Clipboard.get_text(
            St.ClipboardType.CLIPBOARD, 
            (clipboard, data) => {
                const lines = data.split(/\r\n|\r|\n/);
                if (lines.length > 1) {
                    log(`passthrough: writeFile`);
                    writeFile(parent, directoryPath, mimeType, fileExt, hasThumbnail, hasText, callback, false, paramsArray, hash, suffix);
                } else {
                    let copiedFile = Gio.File.new_for_path(data);
                    let [data_, etag] = copiedFile.load_bytes(null);
                    let copiedFileInfo = copiedFile.query_info('standard::*,time::*', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
                    let fileExt_ = copiedFileInfo.get_name().split('.')[copiedFileInfo.get_name().split('.').length - 1];
                    if (copiedFileInfo.get_content_type().includes('image/')) {
                        log(`passthrough: writeDataToFile`);
                        writeDataToFile (data_, parent, directoryPath, copiedFileInfo.get_content_type(), fileExt_, hasThumbnail, hasText, callback, false, paramsArray, hash, '-uri');
                    } else {
                        writeFile(parent, directoryPath, mimeType, fileExt, hasThumbnail, hasText, callback, false, paramsArray, hash, suffix);
                    }
                }
            }
        );
    } else {
        Clipboard.get_content(
            St.ClipboardType.CLIPBOARD, 
            mimeType,
            (clipboard, data) => {
                // log(`data: ${data} typeof: ${typeof String(data.get_data())}`);
                writeDataToFile (data, parent, directoryPath, mimeType, fileExt, hasThumbnail, hasText, callback, passthrough, paramsArray, hash, suffix);
            }
        );
    }

}


function writeDataToFile (data, parent, directoryPath, mimeType, fileExt, hasThumbnail, hasText, callback, passthrough, paramsArray, hash, suffix) {

    if (suffix == null) {
        suffix = '';
    }

    if (hash == null) {
        var fileHash = generateHashWithByteArray(data.get_data()) + suffix;
    } else {
        if (hasThumbnail) {
            var fileHash = hash + suffix;
            hasThumbnail = false;
        }
        if (hasText) {
            var fileHash = hash + suffix;
            hasText = false;
        }
    }

    var newFileName = fileHash + '.' + fileExt;
    var newFilePath = directoryPath + '/' + newFileName;

    if (GLib.file_test(newFilePath, GLib.FileTest.EXISTS)) {
        // const newFileInfo = newFile.query_info('standard::*,time::*', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
        // log(`file exist: ${newFile.get_path()}`);
        // log(newFileInfo.list_attributes(null));
        log(`here file exist`);
    } else {
        var newFile = Gio.File.new_for_path(directoryPath + '/' + newFileName);
        // log(`here file doesn't exist`);
        newFile.replace_contents_bytes_async(
            data,
            null,
            false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null,
            (file_, result) => {
                let [success, etag] = newFile.replace_contents_finish(result);
                if (success) {
                    try {
                        log(`file write successful: ${newFile.get_path()}`);
                        const newFileInfo = newFile.query_info(
                            'standard::*,time::*', 
                            Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, 
                            null
                        )
                        // var d = new Date(0);
                        if (paramsArray == null) {
                            var params = [
                                newFileInfo.get_content_type(), 
                                // d.setSeconds(newFileInfo.get_attribute_as_string(Gio.FILE_ATTRIBUTE_TIME_CREATED)).valueOf(),
                                newFileInfo.get_name(), 
                                directoryPath + '/' + newFileInfo.get_name(), 
                                parent._appGrid
                            ];
                        } else {
                            var params = paramsArray;
                        }
                        
                        if (hasThumbnail || hasText) {
                            if (hasThumbnail) {
                                writeFile(parent, directoryPath, 'image/png', 'png', hasThumbnail, hasText, callback, passthrough, params, fileHash, '-thumb');
                            } else if (hasText) {
                                writeFile(parent, directoryPath, 'text/plain;charset=utf-8', 'txt', hasThumbnail, hasText, callback, passthrough, params, fileHash, '-text');
                            }
                        } else if (! hasThumbnail || ! hasText) {
                            Mainloop.timeout_add(500, function () {
                                callback(params);
                                return false;
                            });
                        }
                    } catch (e) {
                        throw TypeError(e);
                    }
                }
            }
        );
    }
}


// function writeFile (parent, directoryPath, mimeType, fileExt, hasThumbnail, hasText, callback, passthrough, paramsArray, hash, suffix) {
//     if (typeof callback !== 'function')
//         throw TypeError('`callback` must be a function');
    
//     if (passthrough) {
//         Clipboard.get_text(
//             St.ClipboardType.CLIPBOARD, 
//             (clipboard, data) => {
//                 const lines = data.split(/\r\n|\r|\n/);
//                 if (lines.length > 1) {
//                     log(`passthrough: writeFile`);
//                     writeFile(parent, directoryPath, mimeType, fileExt, hasThumbnail, hasText, callback, false, paramsArray, hash, suffix);
//                 } else {
//                     let copiedFile = Gio.File.new_for_path(data);
//                     let [data_, etag] = copiedFile.load_bytes(null);
//                     let copiedFileInfo = copiedFile.query_info('standard::*,time::*', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
//                     let fileExt_ = copiedFileInfo.get_name().split('.')[copiedFileInfo.get_name().split('.').length - 1];
//                     if (copiedFileInfo.get_content_type().includes('image/')) {
//                         log(`passthrough: writeDataToFile`);
//                         writeDataToFile (data_, parent, directoryPath, copiedFileInfo.get_content_type(), fileExt_, hasThumbnail, hasText, callback, false, paramsArray, hash, '-uri');
//                     } else {
//                         writeFile(parent, directoryPath, mimeType, fileExt, hasThumbnail, hasText, callback, false, paramsArray, hash, suffix);
//                     }
//                 }
//             }
//         );
//     } else {
//         Clipboard.get_content(
//             St.ClipboardType.CLIPBOARD, 
//             mimeType,
//             (clipboard, data) => {
//                 log(`data is Uint8Array: ${data}`);
//                 writeDataToFile (data, parent, directoryPath, mimeType, fileExt, hasThumbnail, hasText, callback, passthrough, paramsArray, hash, suffix);
//             }
//         );
//     }

// }


// function writeDataToFile (data, parent, directoryPath, mimeType, fileExt, hasThumbnail, hasText, callback, passthrough, paramsArray, hash, suffix) {

//     if (suffix == null) {
//         suffix = '';
//     }

//     if (hash == null) {
//         var fileHash = generateHashWithByteArray(data.get_data()) + suffix;
//     } else {
//         if (hasThumbnail) {
//             var fileHash = hash + suffix;
//             hasThumbnail = false;
//         }
//         if (hasText) {
//             var fileHash = hash + suffix;
//             hasText = false;
//         }
//     }

//     var newFileName = fileHash + '.' + fileExt;
//     var newFilePath = directoryPath + '/' + newFileName;

//     if (GLib.file_test(newFilePath, GLib.FileTest.EXISTS)) {
//         // const newFileInfo = newFile.query_info('standard::*,time::*', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
//         // log(`file exist: ${newFile.get_path()}`);
//         // log(newFileInfo.list_attributes(null));
//         log(`here file exist`);
//     } else {
//         var newFile = Gio.File.new_for_path(directoryPath + '/' + newFileName);
//         // log(`here file doesn't exist`);
//         newFile.replace_contents_bytes_async(
//             data,
//             null,
//             false,
//             Gio.FileCreateFlags.REPLACE_DESTINATION,
//             null,
//             (file_, result) => {
//                 let [success, etag] = newFile.replace_contents_finish(result);
//                 if (success) {
//                     try {
//                         log(`file write successful: ${newFile.get_path()}`);
//                         const newFileInfo = newFile.query_info(
//                             'standard::*,time::*', 
//                             Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, 
//                             null
//                         )
//                         // var d = new Date(0);
//                         if (paramsArray == null) {
//                             var params = [
//                                 newFileInfo.get_content_type(), 
//                                 // d.setSeconds(newFileInfo.get_attribute_as_string(Gio.FILE_ATTRIBUTE_TIME_CREATED)).valueOf(),
//                                 newFileInfo.get_name(), 
//                                 directoryPath + '/' + newFileInfo.get_name(), 
//                                 parent._appGrid
//                             ];
//                         } else {
//                             var params = paramsArray;
//                         }
                        
//                         if (hasThumbnail || hasText) {
//                             if (hasThumbnail) {
//                                 writeFile(parent, directoryPath, 'image/png', 'png', hasThumbnail, hasText, callback, passthrough, params, fileHash, '-thumb');
//                             } else if (hasText) {
//                                 writeFile(parent, directoryPath, 'text/plain;charset=utf-8', 'txt', hasThumbnail, hasText, callback, passthrough, params, fileHash, '-text');
//                             }
//                         } else if (! hasThumbnail || ! hasText) {
//                             Mainloop.timeout_add(500, function () {
//                                 callback(params);
//                                 return false;
//                             });
//                         }
//                     } catch (e) {
//                         throw TypeError(e);
//                     }
//                 }
//             }
//         );
//     }
// }


function showFileInFileManager (filepath) {
    const connection = Gio.DBus.session;
    
    let file = Gio.File.new_for_path(filepath);
    let uri = file.get_uri();
    
    const args = new GLib.Variant('(ass)', [
        [uri], ''
    ]);
    
    if (GLib.file_test(filepath, GLib.FileTest.IS_DIR)) {
        var functionName = 'ShowFolders';
    } else {
        var functionName = 'ShowItems';
        
    }

    connection.call(
        'org.freedesktop.FileManager1',
        '/org/freedesktop/FileManager1',
        'org.freedesktop.FileManager1',
        functionName,
        args,
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        null,
    );
}

function openFileInDefaultApp (filepath) {
    let file = Gio.File.new_for_path(filepath);
    let uri = file.get_uri();
    try {
        Gio.AppInfo.launch_default_for_uri(uri, null);
        return true;
    } catch (e) {
        throw TypeError(e);
    }
}


function copyClip (contenttype, filepath) {
    var copyFile = Gio.File.new_for_path(filepath);

    switch (true) {
        case filepath.includes('-uri') :
            var mimeType = 'x-special/gnome-copied-files';
            var copyFile = Gio.File.new_for_path(generateTempFile('.clips'));
            const content = 'copy\nfile://' + filepath;
            // log(`content: ${content}`);
            const [, etag] = copyFile.replace_contents(content, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
            break;
        case filepath.includes('.files') :
            var mimeType = 'x-special/gnome-copied-files';
            break;
        case contenttype.includes('text/plain') :
            var mimeType = 'text/plain;charset=utf-8';
            break;
        case filepath.includes('.docx') :
            var mimeType = 'Kingsoft WPS 9.0 Format';
            break;
        case filepath.includes('.xlsx') :
            var mimeType = 'WPS Spreadsheets 6.0 Format';
            break;
        // odp format
        case filepath.includes('.odp') :
        // case contenttype.includes('application/vnd.oasis.opendocument.presentation') :
            var mimeType = 'application/x-openoffice-drawing;windows_formatname="Drawing Format"';
            break;
        // odt format
        case filepath.includes('.odt') :
        // case contenttype.includes('application/vnd.oasis.opendocument') :
            // var mimeType = 'application/x-openoffice-embed-source-xml;windows_formatname="Star Embed Source (XML)"';
            var mimeType = 'text/html';
            break;
        // ods format
        case filepath.includes('.ods') :
        // case contenttype.includes('application/vnd.oasis.opendocument.spreadsheet') :
            // var mimeType = 'application/x-openoffice-sylk;windows_formatname="Sylk"';
            // var mimeType = 'application/x-openoffice-dif;windows_formatname="DIF"';
            var mimeType = 'text/html';
            break;
        default:
            var mimeType = contenttype;
            break;
    }

    try {
        let [fileBytes, etag] = copyFile.load_bytes(null);
        Clipboard.set_content(St.ClipboardType.CLIPBOARD, mimeType, fileBytes);
        log(`copy done: ${mimeType} ${filepath}`);
        return true;
    } catch (e) {
        throw TypeError(e);
    }
}


function deleteClip (filepath) {
    
    const file = Gio.File.new_for_path(filepath);

    file.delete_async(
        GLib.PRIORITY_DEFAULT,
        null,
        (file_, result) => {
            try {
                let success = file.delete_finish(result);
                if (success) {
                    log(`delete done: ${filepath}`);
                }
            } catch (e) {
                throw TypeError(e);
            }
        }
    );
}


function generateActionIcon (actionName, iconname, style_name, is_visible, has_hover_event) {
    let gIcon = Gio.icon_new_for_string(`${Me.path}/icons/${iconname}`);
    let icon = new St.Icon({ gicon: gIcon, icon_size: 16, style_class: 'icon', visible: true });
    let button = new St.Button({
        name: actionName,
        child: icon,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
        x_expand: true,
        y_expand: true,
        can_focus: false,
        visible: is_visible,
        style_class: style_name
    });
    button.connect('clicked', (button) => {
        this._onButtonClicked(button);
    })

    if (has_hover_event) {
        button.connect('enter-event', () => {
            Util.wiggle(button, {
                offset: 2,
                duration: 100,
                wiggleCount: 6,
            }
        );
        });
    }
    return button;
}

function toRgb (string) {
    var r, g, b, hsp, color;
    let reHex = /#([\da-f]{3}){1,2}/i;
    // let reRgb = /rgba\((\d{1,3}%?,\s?){3}(1|0?\.\d+)\)|(rgb\(\d{1,3}%?(,\s?\d{1,3}%?){2}\))/i;
    let reRgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/i;
    let reHsl = /^hsla?\((\d{1,3}%?,\s?){3}(1|0?\.\d+)\)|(hsl\(\d{1,3}%?(,\s?\d{1,3}%?){2}\))/i;
    let color_string = string.replace(";","").replace(" ","");

    switch(true) {
        case reHex.exec(color_string) != null:
            // If hex --> Convert it to RGB: http://gist.github.com/983661
            color = +("0x" + color_string.slice(1).replace(color_string.length < 5 && /./g, '$&$&'));
            r = color >> 16;
            g = color >> 8 & 255;
            b = color & 255;
            break;
        case reRgb.exec(color_string) != null:
            color = color_string.match(reRgb);
            r = color[1];
            g = color[2];
            b = color[3];
            break;
        case reHsl.exec(color_string) != null:
            color_string = color_string.replace(" ","");
            color = color_string.match(reHsl);
            let hsl = color[0].split(",");
            let h = hsl[0].split("(")[1];
            let s = hsl[1].replace("%","");
            let l = hsl[2].replace("%","");
            let rgb = hslToRgb(h,s,l);
            r = rgb.r;
            g = rgb.g;
            b = rgb.b;
            break;
    }
    return [r, g, b];
}

function isLight (string) {
    //Function to convert color codes to string by stripping other caharcters and returning rgba codes in tuple format
    //Original codes from https://awik.io/determine-color-bright-dark-using-javascript/ modified to fit my use case
    var r, g, b, hsp, color;

    let reHex = /#([\da-f]{3}){1,2}/i;
    // let reRgb = /rgba\((\d{1,3}%?,\s?){3}(1|0?\.\d+)\)|(rgb\(\d{1,3}%?(,\s?\d{1,3}%?){2}\))/i;
    let reRgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/i;
    let reHsl = /^hsla?\((\d{1,3}%?,\s?){3}(1|0?\.\d+)\)|(hsl\(\d{1,3}%?(,\s?\d{1,3}%?){2}\))/i;

    let rgb = toRgb(string);
    r = rgb[0];
    g = rgb[1];
    b = rgb[2];

    // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
    hsp = Math.sqrt(
        0.299 * (r * r) +
        0.587 * (g * g) +
        0.114 * (b * b)
    );

    // Using the HSP value, determine whether the color is light or dark
    if (hsp>127.5) {
        return true;
    } 
    else {
        return false;
    }
}

function hslToRgb (h, s, l) {
    // Convert hue to RGB
    let hueToRgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
  
    // Convert hsl values to range 0-1
    h /= 360;
    s /= 100;
    l /= 100;
  
    let r, g, b;
  
    if (s === 0) {
      // If saturation is 0, the color is gray
      r = g = b = l;
    } else {
      let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      let p = 2 * l - q;
      r = hueToRgb(p, q, h + 1 / 3);
      g = hueToRgb(p, q, h);
      b = hueToRgb(p, q, h - 1 / 3);
    }
  
    // Convert RGB values to 0-255 range
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }
