const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withGoogleMapsApiKey(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.application || !manifest.application[0]) {
      console.warn('Warning: AndroidManifest.xml application element not found');
      return config;
    }

    // Get API key from app.json config
    const apiKey = config.android?.config?.googleMaps?.apiKey;
    
    if (!apiKey) {
      console.warn('Warning: Google Maps API key not found in android.config.googleMaps.apiKey');
      return config;
    }

    // Find or create application element
    const application = manifest.application[0];
    
    // Initialize meta-data array if it doesn't exist
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    // Ensure meta-data is an array
    if (!Array.isArray(application['meta-data'])) {
      application['meta-data'] = [application['meta-data']];
    }

    // Remove old API key entries (both com.google.android.geo.API_KEY and deprecated com.google.android.maps.v2.API_KEY)
    application['meta-data'] = application['meta-data'].filter(
      (meta) => {
        if (!meta || !meta.$ || !meta.$['android:name']) {
          return true; // Keep entries without name
        }
        const name = meta.$['android:name'];
        return name !== 'com.google.android.geo.API_KEY' && 
               name !== 'com.google.android.maps.v2.API_KEY';
      }
    );

    // Add the correct API key meta-data entry
    const metaData = {
      $: {
        'android:name': 'com.google.android.geo.API_KEY',
        'android:value': apiKey,
      },
    };

    application['meta-data'].push(metaData);

    console.log('Google Maps API key injected into AndroidManifest.xml');

    return config;
  });
};

