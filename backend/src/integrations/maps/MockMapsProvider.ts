import { IMapsProvider, RouteEstimate, GeoCoordinates } from './MapsProvider.interface.js';

export class MockMapsProvider implements IMapsProvider {
  public readonly providerName = 'Mock-DRC-MapsRouting';

  public async calculateDistance(origin: string, destination: string): Promise<RouteEstimate> {
    // Estimation heuristique pour la RDC (ex: livraison intra-urbaine vs inter-villes)
    const isSameCity = origin.toLowerCase().includes(destination.toLowerCase()) || 
                       destination.toLowerCase().includes(origin.toLowerCase());
    
    const distanceKm = isSameCity ? 12 : 120;
    const estimatedDurationMinutes = isSameCity ? 45 : 240;

    return {
      distanceKm,
      estimatedDurationMinutes,
      recommendedTransport: isSameCity ? 'CAMIONNETTE' : 'CAMION_POIDS_LOURD',
    };
  }

  public async geocode(address: string, province: string): Promise<GeoCoordinates | null> {
    // Coordonnées approximatives selon la province congolaise
    const provinceCoords: Record<string, GeoCoordinates> = {
      'Kinshasa': { latitude: -4.4419, longitude: 15.2663 },
      'Haut-Katanga': { latitude: -11.6876, longitude: 27.5026 },
      'Nord-Kivu': { latitude: -1.6585, longitude: 29.2205 },
      'Kongo-Central': { latitude: -5.8167, longitude: 13.4500 },
      'Kwilu': { latitude: -5.0333, longitude: 18.8167 },
    };

    return provinceCoords[province] || { latitude: -4.0383, longitude: 21.7587 };
  }
}

export const defaultMapsProvider = new MockMapsProvider();

