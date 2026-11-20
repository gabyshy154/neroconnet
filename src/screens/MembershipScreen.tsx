import { useMemo, useState } from 'react'
import type { Tier } from '../types'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import { tierPointThresholds } from '../config'
import { nextTierProgress } from '../lib/admin'
import { useAdminStore } from '../store/adminStore'

const tiers: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum']
const cellStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: `1px solid ${screenColors.border}`, textAlign: 'left', fontSize: 12 }

function isTier(value: string): value is Tier {
  return tiers.some(tier => tier === value)
}

export default function MembershipScreen() {
  const members = useAdminStore(state => state.members)
  const corrections = useAdminStore(state => state.membershipTierCorrections)
  const pointsAdjustments = useAdminStore(state => state.membershipPointsAdjustments)
  const correctMemberTier = useAdminStore(state => state.correctMemberTier)
  const adjustMemberPoints = useAdminStore(state => state.adjustMemberPoints)
  const [search, setSearch] = useState('')
  const [draftTiers, setDraftTiers] = useState<Record<string, Tier>>({})
  const [draftPoints, setDraftPoints] = useState<Record<string, { points: string; reason: string }>>({})
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

  const savePoints = (npcNumber: string) => {
    const draft = draftPoints[npcNumber]
    setError('')
    try {
      adjustMemberPoints(npcNumber, draft?.points.trim() ? Number(draft.points) : Number.NaN, draft?.reason ?? '', new Date().toISOString())
      setDraftPoints(current => {
        const next = { ...current }
        delete next[npcNumber]
        return next
      })
      setSuccess(`Points adjustment for ${npcNumber} saved to the adjustment log.`)
    } catch (reason) {
      setSuccess('')
      setError(reason instanceof Error ? reason.message : 'Points adjustment could not be saved.')
    }
  }
  const memberName = (npcNumber: string) => members.find(item => item.npcNumber === npcNumber)?.name ?? npcNumber
  const log = [
    ...corrections.map(item => ({ id: item.id, at: item.at, text: `${memberName(item.npcNumber)} (${item.npcNumber}): tier ${item.fromTier} → ${item.toTier} — ${item.reason}` })),
    ...pointsAdjustments.map(item => ({ id: item.id, at: item.at, text: `${memberName(item.npcNumber)} (${item.npcNumber}): points ${item.fromPoints.toLocaleString()} → ${item.toPoints.toLocaleString()} — ${item.reason}` })),
  ].sort((first, second) => second.at.localeCompare(first.at))
  const smallField: React.CSSProperties = { padding: '5px 7px', border: `1px solid ${screenColors.border}`, borderRadius: 5, fontSize: 12 }

  return (
    <div>
      <ScreenTitle title="Membership" subtitle={`NPC = Nero Privilege Card. Oversight only: member enrollment is not available here. Tiers upgrade automatically by points: Silver ${tierPointThresholds.Silver}, Gold ${tierPointThresholds.Gold}, Platinum ${tierPointThresholds.Platinum}.`} />
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
              <thead><tr>{['NPC Number', 'Name', 'Tier', 'Points', 'Next tier', 'Joined', 'Tier correction', 'Points adjustment'].map(label => <th key={label} style={{ ...cellStyle, color: screenColors.muted, fontWeight: 600 }}>{label}</th>)}</tr></thead>
              <tbody>{filteredMembers.map(member => {
                const selectedTier = draftTiers[member.npcNumber] ?? member.tier
                const pointsDraft = draftPoints[member.npcNumber] ?? { points: '', reason: '' }
                const setPointsDraft = (field: 'points' | 'reason', value: string) =>
                  setDraftPoints(current => ({ ...current, [member.npcNumber]: { ...pointsDraft, [field]: value } }))
                return (
                  <tr key={member.npcNumber}>
                    <td style={cellStyle}>{member.npcNumber}</td><td style={cellStyle}>{member.name}</td>
                    <td style={cellStyle}>{member.tier}</td><td style={cellStyle}>{member.points.toLocaleString()}{member.openingPoints > 0 && <small style={{ display: 'block', color: screenColors.muted }}>{member.openingPoints} opening balance</small>}</td>
                    <td style={cellStyle}>{(() => { const next = nextTierProgress(member); return next ? `${next.tier} in ${next.pointsNeeded} pts` : 'Top tier' })()}</td>
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
                    <td style={cellStyle}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input type="number" min="0" step="1" aria-label={`New points balance for ${member.name}`} placeholder={String(member.points)} value={pointsDraft.points} onChange={event => setPointsDraft('points', event.target.value)} style={{ ...smallField, width: 80 }} />
                        <input aria-label={`Reason for points adjustment for ${member.name}`} placeholder="Reason" value={pointsDraft.reason} onChange={event => setPointsDraft('reason', event.target.value)} style={{ ...smallField, width: 140 }} />
                        <ScreenButton disabled={!pointsDraft.points.trim()} onClick={() => savePoints(member.npcNumber)}>Save</ScreenButton>
                      </div>
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
          </ScreenCard>
        )}
      <ScreenCard>
        <h2 style={{ color: screenColors.foreground, fontSize: 15, margin: '0 0 10px' }}>Manual tier and points adjustment log</h2>
        {log.length === 0
          ? <EmptyState>No manual tier corrections or points adjustments have been logged.</EmptyState>
          : log.map(entry => (
              <p key={entry.id} style={{ color: screenColors.foreground, fontSize: 12, padding: '7px 0', borderBottom: `1px solid ${screenColors.border}` }}>
                {entry.at} — {entry.text}
              </p>
            ))}
      </ScreenCard>
    </div>
  )
}
