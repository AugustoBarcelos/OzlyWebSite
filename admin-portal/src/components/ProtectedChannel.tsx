import { Navigate, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, hasAnyChannelOfKind, type ChannelKind, type ChannelPerm } from '@/lib/auth';

/**
 * Guard a route by channel grant.
 *
 * Two modes:
 *
 *  1. Specific channel: `<ProtectedChannel kind="paid_meta" need="read" />`
 *     → admin always passes; otherwise checks single grant.
 *
 *  2. Group prefix: `<ProtectedChannel anyOf="paid_" need="read" />`
 *     → admin always passes; otherwise passes if any matching channel grant exists.
 *
 * Falha → /unauthorized. Operadores apenas: o servidor re-checa em toda RPC.
 */
interface Props {
  kind?: ChannelKind;
  anyOf?: 'org_' | 'paid_' | 'msg_';
  need?: ChannelPerm;
  children?: ReactNode;
}

export function ProtectedChannel({ kind, anyOf, need = 'read', children }: Props) {
  const { isAdmin, grants, hasChannelGrant } = useAuth();

  let allowed = false;
  if (isAdmin) {
    allowed = true;
  } else if (kind) {
    allowed = hasChannelGrant(kind, need);
  } else if (anyOf) {
    allowed = hasAnyChannelOfKind(grants, anyOf, need);
  }

  if (!allowed) return <Navigate to="/unauthorized" replace />;
  return children ? <>{children}</> : <Outlet />;
}
