import { EmptyState } from '../components/EmptyState';
import { ScreenShell } from './ScreenShell';

export function GoalsScreen() {
  return (
    <ScreenShell
      eyebrow="Phase 2 · UI skeleton"
      title="Goals"
      description="Your goals workspace will appear here."
    >
      <EmptyState
        title="Goals is empty for now"
        description="This screen is intentionally a structural placeholder. Data, business logic and module-specific controls are added in later phases."
      />
    </ScreenShell>
  );
}
