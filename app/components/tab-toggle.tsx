'use client';

export interface Tab {
  id: string;
  label: string;
}

interface TabToggleProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabToggle({ tabs, activeTab, onTabChange }: TabToggleProps) {
  return (
    <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 gap-1">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => {
              if (!isActive) {
                onTabChange(tab.id);
              }
            }}
            className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
