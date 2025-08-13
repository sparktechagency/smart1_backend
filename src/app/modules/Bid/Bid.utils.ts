export const calculateDistanceInKm = (customerGeoLocation: any, serviceProviderGeoLocation: any) => {
     const toRad = (value: any) => (value * Math.PI) / 180;

     // Radius of the Earth in kilometers
     const R = 6371;

     // Convert latitude and longitude from degrees to radians
     const lat1 = toRad(customerGeoLocation.coordinates[1]);
     const lon1 = toRad(customerGeoLocation.coordinates[0]);
     const lat2 = toRad(serviceProviderGeoLocation.coordinates[1]);
     const lon2 = toRad(serviceProviderGeoLocation.coordinates[0]);

     // Difference in coordinates
     const dLat = lat2 - lat1;
     const dLon = lon2 - lon1;

     // Haversine formula
     const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

     // Distance in kilometers
     const distance = R * c;

     return distance;
};
