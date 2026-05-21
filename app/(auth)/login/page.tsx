import { SignIn } from '@clerk/nextjs';
import { divergentAppearance } from '../clerkAppearance';

export default function LoginPage() {
  return (
    <SignIn
      appearance={divergentAppearance}
      forceRedirectUrl="/portal"
      signUpUrl="/signup"
    />
  );
}
