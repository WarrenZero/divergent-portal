import { getCurrentClient } from '@/lib/clerk';
import WelcomePage from './WelcomePage';

export const metadata = { title: 'Welcome · Divergent' };

export default async function Welcome() {
  const client = await getCurrentClient();
  const firstName = client?.first_name ?? 'there';

  return <WelcomePage firstName={firstName} />;
}
