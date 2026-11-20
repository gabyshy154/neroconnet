import { ACCESS_LEVELS, MODULES } from '../lib/userAccess'
import type { AccessLevel, ModuleId, ModulePermissions } from '../types'
import { screenColors } from './ScreenUI'

export default function PermissionsGrid({
  permissions,
  defaults,
  locked,
  onChange,
}: {
  permissions: ModulePermissions
  defaults: ModulePermissions
  locked: boolean
  onChange: (moduleId: ModuleId, level: AccessLevel) => void
}) {
  const headerStyle: React.CSSProperties = {
    padding: '9px 10px',
    color: screenColors.muted,
    fontSize: 11,
    textTransform: 'uppercase',
    textAlign: 'center',
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
      <thead>
        <tr style={{ background: '#ECEAE3' }}>
          <th scope="col" style={{ ...headerStyle, textAlign: 'left' }}>Module</th>
          {ACCESS_LEVELS.map(level => <th key={level.value} scope="col" style={headerStyle}>{level.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {MODULES.map(module => {
          const current = permissions[module.id]
          const changed = !locked && current !== defaults[module.id]
          return (
            <tr key={module.id} style={{ borderBottom: `1px solid ${screenColors.border}`, background: changed ? '#FBF6E9' : 'transparent' }}>
              <th scope="row" style={{ padding: '9px 10px', textAlign: 'left', color: screenColors.foreground, fontSize: 13, fontWeight: 500 }}>
                {module.label}
                {changed && (
                  <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 10, border: '1px solid #E2CC8F', color: '#7A5A12', fontSize: 10, fontWeight: 600 }}>
                    Changed from default
                  </span>
                )}
              </th>
              {ACCESS_LEVELS.map(level => {
                const checked = current === level.value
                return (
                  <td key={level.value} style={{ padding: '9px 10px', textAlign: 'center' }}>
                    <label style={{ display: 'inline-flex', padding: 4, cursor: locked ? 'not-allowed' : 'pointer' }}>
                      <input
                        type="radio"
                        name={`perm-${module.id}`}
                        value={level.value}
                        checked={checked}
                        disabled={locked}
                        onChange={() => onChange(module.id, level.value)}
                        aria-label={`${module.label}: ${level.label}`}
                        style={{ width: 16, height: 16, accentColor: screenColors.accent }}
                      />
                    </label>
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
