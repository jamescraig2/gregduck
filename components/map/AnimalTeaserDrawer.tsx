'use client';

import { FC } from 'react';
import { MarkerData } from '@/types';

export interface AnimalTeaserDrawerProps {
  animal: MarkerData | null;
}

/** Stub — renders null until Issue #44 (Animal Teaser Drawer) is implemented. */
export const AnimalTeaserDrawer: FC<AnimalTeaserDrawerProps> = (_props) => null;
