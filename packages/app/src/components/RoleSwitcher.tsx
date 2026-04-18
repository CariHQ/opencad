/**
 * RoleSwitcher — dev/admin only role override tool.
 * Visible only in development mode (import.meta.env.DEV) or for admin users.
 *
 * This is NOT a real auth mechanism — it just overrides the UI role locally
 * for testing purposes. The server enforces the real role on every write.
 */
import { ROLE_CONFIGS, type RoleId } from '../config/roles';
import { useDocumentStore } from '../stores/documentStore';
import { useRole } from '../hooks/useRole';

const ROLES = Object.keys(ROLE_CONFIGS) as RoleId[];

export function RoleSwitcher() {
  const { role } = useRole();
  const setUserRole = useDocumentStore((s) => s.setUserRole);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as RoleId | 'null';
    setUserRole(value === 'null' ? null : value);
  };

  return (
    <div className="role-switcher" title="Dev: role override">
      <span className="role-switcher-label">Dev:</span>
      <select
        className="role-switcher-select"
        value={role}
        onChange={handleChange}
        aria-label="Dev role override"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_CONFIGS[r].label}
          </option>
        ))}
      </select>
    </div>
  );
}
