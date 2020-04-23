import React, { Component } from "react";
import { readdirSync, statSync } from "fs";
import p from "path";
import { CameraOutlined, FolderFilled } from "@ant-design/icons";

const constants = {
  DIRECTORY: "directory",
  FILE: "file",
};

function safeReadDirSync(path) {
  let dirData = {};
  try {
    dirData = readdirSync(path);
  } catch (ex) {
    if (ex.code == "EACCES" || ex.code == "EPERM") {
      //User does not have permissions, ignore directory
      return null;
    } else throw ex;
  }
  return dirData;
}

/**
 * Normalizes windows style paths by replacing double backslahes with single forward slahes (unix style).
 * @param  {string} path
 * @return {string}
 */
function normalizePath(path) {
  return path.replace(/\\/g, "/");
}

/**
 * Tests if the supplied parameter is of type RegExp
 * @param  {any}  regExp
 * @return {Boolean}
 */
function isRegExp(regExp) {
  return typeof regExp === "object" && regExp.constructor == RegExp;
}

/**
 * Collects the files and folders for a directory path into an Object, subject
 * to the options supplied, and invoking optional
 * @param  {String} path
 * @param  {Object} options
 * @param  {function} onEachFile
 * @param  {function} onEachDirectory
 * @return {Object}
 */
function directoryTree(path, options, onEachFile, onEachDirectory) {
  const name = p.basename(path);
  path = options && options.normalizePath ? normalizePath(path) : path;
  const item = { path, name };
  let stats;

  item.title = name;
  item.key = path;

  try {
    stats = statSync(path);
  } catch (e) {
    return null;
  }

  // Skip if it matches the exclude regex
  if (options && options.exclude) {
    const excludes = isRegExp(options.exclude)
      ? [options.exclude]
      : options.exclude;
    if (excludes.some((exclusion) => exclusion.test(path))) {
      return null;
    }
  }

  if (stats.isFile()) {
    const ext = p.extname(path).toLowerCase();

    // Skip if it does not match the extension regex
    if (options && options.extensions && !options.extensions.test(ext))
      return null;

    item.size = stats.size; // File size in bytes
    item.extension = ext;
    item.type = constants.FILE;

    if (ext === ".tc") item.icon = <CameraOutlined />;

    if (options && options.attributes) {
      options.attributes.forEach((attribute) => {
        item[attribute] = stats[attribute];
      });
    }

    if (onEachFile) {
      onEachFile(item, path, stats);
    }
  } else if (stats.isDirectory()) {
    let dirData = safeReadDirSync(path);
    if (dirData === null) return null;

    if (options && options.attributes) {
      options.attributes.forEach((attribute) => {
        item[attribute] = stats[attribute];
      });
    }

    item.children = dirData
      .map((child) =>
        directoryTree(p.join(path, child), options, onEachFile, onEachDirectory)
      )
      .filter((e) => !!e);

    item.size = item.children.reduce((prev, cur) => prev + cur.size, 0);
    item.type = constants.DIRECTORY;
    item.icon = <FolderFilled />;

    if (onEachDirectory) {
      onEachDirectory(item, path, stats);
    }
  } else {
    return null; // Or set item.size = 0 for devices, FIFO and sockets ?
  }
  return item;
}

function isFile(path) {
  return !!p.extname(path);
}

export { directoryTree, isFile };