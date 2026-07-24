'use client';

import { FC } from 'react';
import { MarkerData } from '@/types';

export interface AnimalMarkerClustererProps {
  markers: MarkerData[];
}

/** Stub — renders null until Issue #43 (Marker Clustering) is implemented. */
export const AnimalMarkerClusterer: FC<AnimalMarkerClustererProps> = (_props) => null;
