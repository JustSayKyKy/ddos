import { EmptyState } from '../components/EmptyState';
import { ScreenShell } from './ScreenShell';

export function FinanceScreen() {
  return (
    <ScreenShell
      eyebrow="Phase 2 · UI skeleton"
      title="Finance"
      description="Your accounts and budget workspace will appear here."
    >
      <EmptyState
        title="Finance is empty for now"
        description="This screen is intentionally a structural placeholder. Data, business logic and module-specific controls are added in later phases."
      />
    </ScreenShell>
  );
}
