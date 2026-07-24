import type { Metadata } from 'next';
import { MapDashboard } from '@/components/map/MapDashboard';

export const metadata: Metadata = {
  title: 'Interactive Map | Greg Duck',
  description: 'Explore nearby wildlife sightings and discoveries on the interactive map.',
};

export default function MapPage() {
  return (
    <main className="relative w-full h-[calc(100vh-4rem)]">
      <MapDashboard />
    </main>
  );
}
