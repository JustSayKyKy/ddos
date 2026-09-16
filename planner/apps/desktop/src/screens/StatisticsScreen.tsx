import { EmptyState } from '../components/EmptyState';
import { ScreenShell } from './ScreenShell';

export function StatisticsScreen() {
  return (
    <ScreenShell
      eyebrow="Phase 2 · UI skeleton"
      title="Statistics"
      description="Your cross-module statistics will appear here."
    >
      <EmptyState
        title="Statistics is empty for now"
        description="This screen is intentionally a structural placeholder. Data, business logic and module-specific controls are added in later phases."
      />
    </ScreenShell>
  );
}
