import { SignUp } from '@clerk/nextjs';
import { divergentAppearance } from '../clerkAppearance';

export default function SignUpPage() {
  return (
    <SignUp
      appearance={divergentAppearance}
      forceRedirectUrl="/portal"
      signInUrl="/login"
    />
  );
}
