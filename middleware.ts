import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Practitioner-only routes (maps to app/(practitioner)/*)
const isPractitionerRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/clients(.*)',
  '/naq(.*)',
  '/labs(.*)',
  '/protocols(.*)',
  '/mealplans(.*)',
  '/practitioner-journal(.*)',
  '/engage(.*)',
  '/symmap(.*)',
  '/formbuilder(.*)',
  '/aicfg(.*)',
]);

// Client-only routes (maps to app/(client)/*)
const isClientRoute = createRouteMatcher([
  '/checkin(.*)',
  '/journey(.*)',
  '/protocol(.*)',
  '/journal(.*)',
  '/vault(.*)',
  '/supplements(.*)',
  '/booking(.*)',
]);

// Public routes — no auth required
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next();

  // Protect all practitioner and client routes
  if (isPractitionerRoute(req) || isClientRoute(req)) {
    await auth.protect();
  }

  // Protect all API routes except public webhooks
  if (req.nextUrl.pathname.startsWith('/api/') && !req.nextUrl.pathname.startsWith('/api/webhooks')) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
