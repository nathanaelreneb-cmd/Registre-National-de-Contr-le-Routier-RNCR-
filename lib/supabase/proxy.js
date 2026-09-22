import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;

  const pathname = request.nextUrl.pathname;
  const isProtected =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/agent') ||
    pathname.startsWith('/portail/responsable');

  const isPublicAuth =
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/agent/login') ||
    pathname.startsWith('/citoyen/login') ||
    pathname.startsWith('/citoyen/inscription') ||
    pathname.startsWith('/auth');

  if (!isProtected || isPublicAuth) {
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  if (!user?.sub) {
    const loginPath = pathname.startsWith('/admin') ? '/admin/login' : '/agent/login';
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const { data: agent } = await supabase
    .from('agents')
    .select('role, actif')
    .eq('user_id', user.sub)
    .maybeSingle();

  if (!agent || agent.actif === false) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith('/admin') ? '/admin/login' : '/agent/login';
    url.searchParams.set('error', 'acces_refuse');
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/admin') && agent.role !== 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/agent/dashboard';
    return NextResponse.redirect(url);
  }

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
