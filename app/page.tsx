import { App } from '@/components/dashboard-app';
import { MOCK_AGENTS } from '@/lib/mock-data';

export default function Page() {
  return <App initialAgents={MOCK_AGENTS} />;
}
