import { EmptyState } from '../components/EmptyState';
import { ScreenShell } from './ScreenShell';

export function WeeklyPlannerScreen() {
  return (
    <ScreenShell
      eyebrow="Phase 2 · UI skeleton"
      title="Weekly Planner"
      description="Your seven-day planning workspace will appear here."
    >
      <EmptyState
        title="Weekly Planner is empty for now"
        description="This screen is intentionally a structural placeholder. Data, business logic and module-specific controls are added in later phases."
      />
    </ScreenShell>
  );
}
