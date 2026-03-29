/**
 * Feature updater injection point to modify active data
 * @param {import("./featureLoader.js").UserMapFeatures} data 
 * @returns 
 */
export function featureUpdater(data) {
  data.features.forEach((feature) => {
    // happens when copy defaultFeatures to features.json manually
    // also ui has issues if time is missing, so making sure its always there
    if (!('time' in feature.properties)) {
      feature.properties.time = (new Date()).toISOString()
    }
  })
  return data
}
