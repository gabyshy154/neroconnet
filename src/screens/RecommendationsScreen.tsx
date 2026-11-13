import { useState } from 'react'
import { useAdminStore } from '../store/adminStore'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import { includePendingPurchases, isLowStock } from '../lib/admin'

export default function RecommendationsScreen() {
  const materials = useAdminStore(state => state.materials)
  const movements = useAdminStore(state => state.inventoryMovements)
  const recommendations = useAdminStore(state => state.recommendations)
  const approveRecommendation = useAdminStore(state => state.approveRecommendation)
  const rejectRecommendation = useAdminStore(state => state.rejectRecommendation)
  const regenerateRecommendations = useAdminStore(state => state.regenerateRecommendations)
  const [success, setSuccess] = useState('Recommendations are input-based estimates, not predictive forecasting.')
  const [error, setError] = useState('')
  const hasLowStock = includePendingPurchases(materials, movements).some(isLowStock)
  const visible = recommendations.filter(item =>
    item.kind === (hasLowStock ? 'Reorder' : 'Pricing'),
  )

  const decide = (id: string, approve: boolean) => {
    setError('')
    try {
      if (approve) {
        approveRecommendation(id)
      } else {
        rejectRecommendation(id)
      }
      setSuccess(`Recommendation ${approve ? 'approved' : 'rejected'}.`)
    } catch (reason) {
      setSuccess('')
      setError(reason instanceof Error ? reason.message : 'Could not update the recommendation.')
    }
  }

  return (
    <div>
      <ScreenTitle
        title="Recommendations"
        subtitle="Rule-based suggestions from current stock and sample pricing inputs."
      />
      <ScreenFeedback success={success} error={error} />
      <ScreenCard style={{ marginBottom: 18, background: screenColors.accentLight }}>
        <p style={{ color: '#4A5A38', fontSize: 13, fontWeight: 600 }}>
          input-based estimates, not predictive forecasting
        </p>
      </ScreenCard>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <ScreenButton onClick={regenerateRecommendations}>Generate recommendations</ScreenButton>
      </div>
      <ScreenCard>
        <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
          {hasLowStock ? 'Reorder recommendations' : 'Pricing recommendations'}
        </h2>
        {visible.length === 0
          ? <EmptyState>No {hasLowStock ? 'reorder' : 'pricing'} recommendations are available.</EmptyState>
          : visible.map(recommendation => (
              <article key={recommendation.id} style={{ padding: '14px 0', borderBottom: `1px solid ${screenColors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ color: screenColors.foreground, fontSize: 14, fontWeight: 600 }}>{recommendation.subject}</h3>
                    <p style={{ color: screenColors.accent, fontSize: 13, marginTop: 5 }}>{recommendation.suggestion}</p>
                    <p style={{ color: screenColors.muted, fontSize: 12, marginTop: 4 }}>{recommendation.basis}</p>
                  </div>
                  {recommendation.status === 'Pending'
                    ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ScreenButton onClick={() => decide(recommendation.id, true)}>Approve</ScreenButton>
                        <ScreenButton variant="danger" onClick={() => decide(recommendation.id, false)}>Reject</ScreenButton>
                      </div>
                    )
                    : <span style={{ color: recommendation.status === 'Approved' ? '#276749' : '#9B3526', fontSize: 12, fontWeight: 600 }}>{recommendation.status}</span>}
                </div>
              </article>
            ))}
      </ScreenCard>
    </div>
  )
}
