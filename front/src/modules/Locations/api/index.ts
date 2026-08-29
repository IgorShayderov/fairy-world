import { api } from '@shared/api';

import routes from '@/routes';

export type LocationVariant = 'CITY' | 'DUNGEON' | 'FOREST' | 'VILLAGE' | 'SHOP';
export type EventType = 'NONE' | 'BATTLE' | 'TRADE' | 'QUEST' | 'REST';

export interface Location {
  id: number;
  name: string;
  variant: LocationVariant;
  eventType: EventType;
}

export interface UserLocation {
  userId: number;
  locationId: number;
  location: Location;
}

export const getLocations = async (): Promise<Location[]> => {
  const { data } = await api.get<Location[]>(routes.api.locations.listPath());
  return data;
};

export const getMyLocation = async (): Promise<UserLocation | null> => {
  const { data } = await api.get<UserLocation | null>(routes.api.locations.mePath());
  return data;
};

export const setMyLocation = async (locationId: number): Promise<UserLocation> => {
  const { data } = await api.post<UserLocation>(routes.api.locations.mePath(), { locationId });
  return data;
};
