import { hash } from "node:crypto";

import { getMultipleDocumentsFromDB } from "./fileHandler.ts";


function format(data) {
  for (const feature of data) {
    if (!('time' in feature.properties)) {
      feature.properties.time = (new Date()).toISOString()
    }
  }
  const geoObj = {
    type: "FeatureCollection",
    features: data,
    hash: hash("sha1", JSON.stringify(data)),
  }
  return geoObj
}

export async function loadFeatures() {
  const features = await getMultipleDocumentsFromDB("Features", {});
  if (features.length <= 0) {
    return format(await defaultFeatures())
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
  
  return defaultFeatures
}

/**
 * Saves the features to the file system
 * @param {UserMapFeatures} features 
 * @returns {void}
 */

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