import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../app/page';

describe('Home Page', () => {
  it('rendersMainHeading', () => {
    render(<Home />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Greg Duck');
  });

  it('rendersTagline', () => {
    render(<Home />);
    expect(screen.getByText('Discover the wildlife around you.')).toBeDefined();
  });

  it('rendersNoUnexpectedBoilerplate', () => {
    render(<Home />);
    expect(screen.queryByText(/get started by editing/i)).toBeNull();
  });
});
