import fs from "node:fs";
import { resolve } from "node:path";
import { hash } from "node:crypto";

import { featureUpdater } from "./updater.js";
import { delayedSave } from "./fileHandler.ts";

import { getMultipleDocumentsFromDB } from "./fileHandler.ts";

const FEATURE_FILE = resolve('data/features.json')

function format(data) {
  for (const feature of data) {
    if (!('time' in feature.properties)) {
      feature.properties.time = (new Date()).toISOString()
    }
  }
  data.hash = hash("sha1", JSON.stringify(data));
  const geoObj = {
    type: "FeatureCollection",
    features: data,
    hash: data.hash
  }
  return geoObj
}

export async function loadFeatures() {
  const features = await getMultipleDocumentsFromDB("Features", {});
  if (features.length <= 0) {
    return await defaultFeatures()
  }
  return format(features)
}

/**
 * Load the default user map features from the file system
 * @returns {UserMapFeatures}
 */
export async function defaultFeatures() {
  const defaultFeatures = await getMultipleDocumentsFromDB("DefaultFeatures", {});
  if (defaultFeatures.length <= 0) {
    return []
  }
  
  return format(defaultFeatures)
}

/**
 * Saves the features to the file system
 * @param {UserMapFeatures} features 
 * @returns {void}
 */
// export function saveFeatures(features) {
//   features.hash = hash("sha1", JSON.stringify(features))
//   return delayedSave(FEATURE_FILE, features, 10_000, false)
// }

/**
 * User Map Features JSON File
 * @typedef {object} UserMapFeatures
 * @property {"FeatureCollection"} type
 * @property {UserMapFeature[]} features
 * @property {string} hash
 */

/**
 * User Map Feature Properties
 * @typedef {object} UserMapFeatureProperties
 * @property {string} [time]
 * @property {string} [expireDate]
 * @property {number} [expireTime]
 * @property {string} user
 * @property {string} userId
 * @property {?string} discordId
 * @property {string=} groupId
 * @property {string} notes
 * @property {string} [color]
 * @property {string} [clan]
 * @property {string} [lineType]
 * @property {string} id
 * @property {string} muser
 * @property {string} muserId
 * @property {string} type
 * @property {string[]} flags
 */

/**
 * User Map Feature Geometry
 * @typedef {object} UserMapFeatureGeometry
 */

/**
 * User Map Feature
 * @typedef {object} UserMapFeature
 * @property {"Feature"} type
 * @property {UserMapFeatureProperties} properties
 * @property {UserMapFeatureGeometry} geometry
 * @property {string} id
 * @property {number} [angle]
 */