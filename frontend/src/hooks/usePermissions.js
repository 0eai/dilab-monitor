import { useAuthStore } from '../stores/authStore';

/**
 * usePermissions — single source of truth for all UI access control.
 *
 * Usage:
 *   const { can, isAdmin, username } = usePermissions();
 *   if (can('kill:any')) { ... }
 *   if (can('kill:own', process.user)) { ... }
 */
export function usePermissions() {
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.isAdmin ?? false;
  const username = user?.username ?? '';

  /**
   * Permission checker.
   * @param {string} action - Permission key (see matrix below)
   * @param {string} [resourceOwner] - Username of the resource owner (for ownership checks)
   */
  function can(action, resourceOwner) {
    const isOwner = resourceOwner && resourceOwner === username;

    switch (action) {
      // ── Dashboard / Monitoring (read-only — all authenticated users) ──────
      case 'view:dashboard':
      case 'view:metrics':
      case 'view:processes':
      case 'view:ports':
      case 'view:ssh-sessions':
      case 'view:storage':
      case 'view:datasets':
        return true;

      // ── Process / GPU management ──────────────────────────────────────────
      case 'kill:own':
        // Any user can kill their own processes
        return isOwner;

      case 'kill:any':
        // Only admins can kill other users' processes
        return isAdmin;

      case 'kill:zombies-batch':
        // Only admins can batch-kill zombie processes
        return isAdmin;

      // ── Dataset management ────────────────────────────────────────────────
      case 'dataset:create':
        // Any authenticated user can register a dataset
        return true;

      case 'dataset:edit':
      case 'dataset:delete':
        // Owner or admin
        return isOwner || isAdmin;

      case 'dataset:sync':
        // Any authenticated user can sync (owner or admin for better UX)
        return isOwner || isAdmin;

      // ── Terminal ──────────────────────────────────────────────────────────
      case 'terminal:own':
        // Any user can open their own tmux session
        return true;

      case 'terminal:any':
        // Only admins can attach to other users' sessions
        return isAdmin;

      case 'terminal:create-named':
        // Only admins can create sessions with arbitrary names
        return isAdmin;

      // ── Storage ───────────────────────────────────────────────────────────
      case 'storage:view-all':
        // All users can view storage overview
        return true;

      case 'storage:view-user-breakdown':
        // All users can see the per-user breakdown (it's just disk usage, not sensitive)
        return true;

      // ── Admin-only ────────────────────────────────────────────────────────
      case 'admin:view-all-sessions':
      case 'admin:manage-users':
      case 'admin:view-audit-log':
        return isAdmin;

      default:
        // Unknown permission → deny by default
        console.warn(`[Permissions] Unknown action: "${action}" — denied by default`);
        return false;
    }
  }

  return { can, isAdmin, username, user };
}

/**
 * Permission matrix reference (for documentation):
 *
 * ACTION                    | Standard User | Admin
 * --------------------------|---------------|------
 * view:dashboard            | ✅            | ✅
 * view:metrics              | ✅            | ✅
 * view:processes            | ✅            | ✅
 * view:ports                | ✅            | ✅
 * view:ssh-sessions         | ✅            | ✅
 * view:storage              | ✅            | ✅
 * view:datasets             | ✅            | ✅
 * kill:own                  | ✅ (own only) | ✅
 * kill:any                  | ❌            | ✅
 * kill:zombies-batch        | ❌            | ✅
 * dataset:create            | ✅            | ✅
 * dataset:edit              | ✅ (own only) | ✅
 * dataset:delete            | ✅ (own only) | ✅
 * dataset:sync              | ✅ (own only) | ✅
 * terminal:own              | ✅            | ✅
 * terminal:any              | ❌            | ✅
 * terminal:create-named     | ❌            | ✅
 * storage:view-all          | ✅            | ✅
 * storage:view-user-breakdown| ✅           | ✅
 * admin:view-all-sessions   | ❌            | ✅
 * admin:manage-users        | ❌            | ✅
 * admin:view-audit-log      | ❌            | ✅
 */