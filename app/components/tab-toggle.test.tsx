import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabToggle } from './tab-toggle';

describe('TabToggle component', () => {
  it('renders all tabs', () => {
    render(
      <TabToggle
        tabs={[
          { id: 'admin', label: 'Admin' },
          { id: 'picks', label: 'My Picks' },
        ]}
        activeTab="admin"
        onTabChange={() => {}}
      />
    );

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('My Picks')).toBeInTheDocument();
  });

  it('highlights the active tab', () => {
    render(
      <TabToggle
        tabs={[
          { id: 'admin', label: 'Admin' },
          { id: 'picks', label: 'My Picks' },
        ]}
        activeTab="admin"
        onTabChange={() => {}}
      />
    );

    const adminTab = screen.getByText('Admin').closest('button');
    const picksTab = screen.getByText('My Picks').closest('button');

    expect(adminTab?.className).toContain('bg-white');
    expect(picksTab?.className).not.toContain('bg-white');
  });

  it('calls onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn();

    render(
      <TabToggle
        tabs={[
          { id: 'admin', label: 'Admin' },
          { id: 'picks', label: 'My Picks' },
        ]}
        activeTab="admin"
        onTabChange={onTabChange}
      />
    );

    fireEvent.click(screen.getByText('My Picks'));

    expect(onTabChange).toHaveBeenCalledWith('picks');
  });

  it('does not call onTabChange when clicking active tab', () => {
    const onTabChange = vi.fn();

    render(
      <TabToggle
        tabs={[
          { id: 'admin', label: 'Admin' },
          { id: 'picks', label: 'My Picks' },
        ]}
        activeTab="admin"
        onTabChange={onTabChange}
      />
    );

    fireEvent.click(screen.getByText('Admin'));

    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('works with more than 2 tabs', () => {
    const onTabChange = vi.fn();

    render(
      <TabToggle
        tabs={[
          { id: 'one', label: 'Tab 1' },
          { id: 'two', label: 'Tab 2' },
          { id: 'three', label: 'Tab 3' },
        ]}
        activeTab="two"
        onTabChange={onTabChange}
      />
    );

    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();

    const tab2 = screen.getByText('Tab 2').closest('button');
    expect(tab2?.className).toContain('bg-white');
  });
});
