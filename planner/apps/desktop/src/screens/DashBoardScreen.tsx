import { EmptyState } from '../components/EmptyState';
import { ScreenShell } from './ScreenShell';

export function DashboardScreen() {
  return (
    <ScreenShell
      eyebrow="Phase 2 · UI skeleton"
      title="Dashboard"
      description="Your daily overview will appear here."
    >
      <EmptyState
        title="Dashboard is empty for now"
        description="This screen is intentionally a structural placeholder. Data, business logic and module-specific controls are added in later phases."
      />
    </ScreenShell>
  );
}
