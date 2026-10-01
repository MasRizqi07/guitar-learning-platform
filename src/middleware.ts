import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const incomingRequestId = request.headers.get('x-request-id');
  const validId =
    incomingRequestId && /^[a-zA-Z0-9\-_]{8,64}$/.test(incomingRequestId.trim())
      ? incomingRequestId.trim()
      : crypto.randomUUID();

  // Forward request-id into downstream request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', validId);

  // CSRF Origin validation for authenticated state-mutating requests
  const method = request.method.toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  if (isMutating && isApiRoute) {
    const hasAuthCookie = request.cookies.has('glp_session') || request.cookies.has('guitar_session');
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    // If an authenticated session cookie exists and an Origin header is sent, verify same-origin
    if (hasAuthCookie && origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'CSRF_ORIGIN_MISMATCH',
                message: 'Cross-origin request blocked by CSRF policy.',
                requestId: validId,
              },
            },
            {
              status: 403,
              headers: {
                'x-request-id': validId,
              },
            }
          );
        }
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ORIGIN_HEADER',
              message: 'Invalid request origin.',
              requestId: validId,
            },
          },
          {
            status: 403,
            headers: {
              'x-request-id': validId,
            },
          }
        );
      }
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Stamp x-request-id on response
  response.headers.set('x-request-id', validId);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
