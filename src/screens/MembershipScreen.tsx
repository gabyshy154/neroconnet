import { useMemo, useState } from 'react'
import type { Tier } from '../types'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import { useAdminStore } from '../store/adminStore'

const tiers: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum']
const cellStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: `1px solid ${screenColors.border}`, textAlign: 'left', fontSize: 12 }

function isTier(value: string): value is Tier {
  return tiers.some(tier => tier === value)
}

export default function MembershipScreen() {
  const members = useAdminStore(state => state.members)
  const corrections = useAdminStore(state => state.membershipTierCorrections)
  const correctMemberTier = useAdminStore(state => state.correctMemberTier)
  const [search, setSearch] = useState('')
  const [draftTiers, setDraftTiers] = useState<Record<string, Tier>>({})
  const [success, setSuccess] = useState('Membership oversight data loaded from the local store.')
  const [error, setError] = useState('')
  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return members.filter(member =>
      !query || member.name.toLowerCase().includes(query) || member.npcNumber.toLowerCase().includes(query),
    )
  }, [members, search])

  const saveCorrection = (npcNumber: string, tier: Tier) => {
    setError('')
    try {
      correctMemberTier(npcNumber, tier, new Date().toISOString())
      setDraftTiers(current => {
        const next = { ...current }
        delete next[npcNumber]
        return next
      })
      setSuccess(`Tier correction for ${npcNumber} saved to the correction log.`)
    } catch (reason) {
      setSuccess('')
      setError(reason instanceof Error ? reason.message : 'Tier correction could not be saved.')
    }
  }

  return (
    <div>
      <ScreenTitle title="Membership" subtitle="NPC = Nero Privilege Card. Oversight only: member enrollment is not available here." />
      <ScreenFeedback success={success} error={error} />
      <label htmlFor="membership-search" style={{ display: 'block', marginBottom: 6, color: screenColors.foreground, fontSize: 12 }}>Search members</label>
      <input
        id="membership-search"
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="Search by name or NPC number"
        style={{ width: '100%', maxWidth: 360, padding: 9, marginBottom: 14, border: `1px solid ${screenColors.border}`, borderRadius: 6 }}
      />
      {filteredMembers.length === 0
        ? <EmptyState>{members.length === 0 ? 'There are no members in the store.' : 'No members match this search.'}</EmptyState>
        : (
          <ScreenCard style={{ padding: 0, overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['NPC Number', 'Name', 'Tier', 'Points', 'Joined', 'Manual correction'].map(label => <th key={label} style={{ ...cellStyle, color: screenColors.muted, fontWeight: 600 }}>{label}</th>)}</tr></thead>
              <tbody>{filteredMembers.map(member => {
                const selectedTier = draftTiers[member.npcNumber] ?? member.tier
                return (
                  <tr key={member.npcNumber}>
                    <td style={cellStyle}>{member.npcNumber}</td><td style={cellStyle}>{member.name}</td>
                    <td style={cellStyle}>{member.tier}</td><td style={cellStyle}>{member.points.toLocaleString()}</td>
                    <td style={cellStyle}>{member.joinedAt}</td>
                    <td style={cellStyle}>
                      <label htmlFor={`tier-${member.npcNumber}`} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)' }}>Correct tier for {member.name}</label>
                      <select id={`tier-${member.npcNumber}`} value={selectedTier} onChange={event => {
                        const tier = event.target.value
                        if (isTier(tier)) {
                          setDraftTiers(current => ({ ...current, [member.npcNumber]: tier }))
                        }
                      }}>
                        {tiers.map(tier => <option key={tier}>{tier}</option>)}
                      </select>
                      <ScreenButton
                        disabled={selectedTier === member.tier}
                        onClick={() => saveCorrection(member.npcNumber, selectedTier)}
                      >Save</ScreenButton>
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
          </ScreenCard>
        )}
      <ScreenCard>
        <h2 style={{ color: screenColors.foreground, fontSize: 15, margin: '0 0 10px' }}>Manual tier correction log</h2>
        {corrections.length === 0
          ? <EmptyState>No manual tier corrections have been logged.</EmptyState>
          : [...corrections].reverse().map(correction => {
              const member = members.find(item => item.npcNumber === correction.npcNumber)
              return (
                <p key={correction.id} style={{ color: screenColors.foreground, fontSize: 12, padding: '7px 0', borderBottom: `1px solid ${screenColors.border}` }}>
                  {correction.at} — {member?.name ?? correction.npcNumber} ({correction.npcNumber}): {correction.fromTier} → {correction.toTier}
                </p>
              )
            })}
      </ScreenCard>
    </div>
  )
}
