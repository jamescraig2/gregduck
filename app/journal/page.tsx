import React, { Suspense } from 'react';
import { JournalContainer } from '@/components/journal/JournalContainer';
import { JournalGridSkeleton } from '@/components/journal/JournalGridSkeleton';

export const metadata = {
  title: 'Discovery Journal | Greg Duck',
  description: 'Explore your animal discoveries and encounter history.',
};

export default function JournalPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <Suspense fallback={<JournalGridSkeleton />}>
        <JournalContainer />
      </Suspense>
    </main>
  );
}
