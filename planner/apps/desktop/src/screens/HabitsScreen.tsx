import { EmptyState } from '../components/EmptyState';
import { ScreenShell } from './ScreenShell';

export function HabitsScreen() {
  return (
    <ScreenShell
      eyebrow="Phase 2 · UI skeleton"
      title="Habits"
      description="Your habit tracking workspace will appear here."
    >
      <EmptyState
        title="Habits is empty for now"
        description="This screen is intentionally a structural placeholder. Data, business logic and module-specific controls are added in later phases."
      />
    </ScreenShell>
  );
}
