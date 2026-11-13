export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface RouteEstimate {
  distanceKm: number;
  estimatedDurationMinutes: number;
  recommendedTransport: 'MOTO' | 'CAMIONNETTE' | 'CAMION_POIDS_LOURD';
}

export interface IMapsProvider {
  readonly providerName: string;
  calculateDistance(origin: string, destination: string): Promise<RouteEstimate>;
  geocode(address: string, province: string): Promise<GeoCoordinates | null>;
}

