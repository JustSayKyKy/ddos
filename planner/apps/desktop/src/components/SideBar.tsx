import { NavLink } from 'react-router-dom';

type NavigationItem = {
  label: string;
  path: string;
  shortcut: string;
  icon: string;
};

const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Dashboard', path: '/', shortcut: '1', icon: '⌂' },
  { label: 'Weekly Planner', path: '/weekly-planner', shortcut: '2', icon: '▦' },
  { label: 'Habits', path: '/habits', shortcut: '3', icon: '✓' },
  { label: 'Finance', path: '/finance', shortcut: '4', icon: '◫' },
  { label: 'Goals', path: '/goals', shortcut: '5', icon: '◇' },
  { label: 'Statistics', path: '/statistics', shortcut: '6', icon: '⌁' },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="brand-mark" aria-hidden="true">P</div>
        <div>
          <div className="sidebar__title">Planner</div>
          <div className="sidebar__subtitle">Personal workspace</div>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation">
        {NAVIGATION_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
          >
            <span className="nav-item__icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-item__label">{item.label}</span>
            <kbd>{item.shortcut}</kbd>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <span>Phase 2</span>
        <span className="status-dot" aria-hidden="true" />
      </div>
    </aside>
  );
}
