import { useState } from 'react'
import type { Recommendation } from '../types'
import { useAdminStore } from '../store/adminStore'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'

export default function RecommendationsScreen() {
  const recommendations = useAdminStore(state => state.recommendations)
  const markRecommendationReviewed = useAdminStore(state => state.markRecommendationReviewed)
  const regenerateRecommendations = useAdminStore(state => state.regenerateRecommendations)
  const [success, setSuccess] = useState('Recommendations are input-based estimates, not predictive forecasting.')
  const [error, setError] = useState('')
  const reorders = recommendations.filter(item => item.kind === 'Reorder')
  const pricing = recommendations.filter(item => item.kind === 'Pricing')

  const review = (recommendation: Recommendation) => {
    setError('')
    try {
      markRecommendationReviewed(recommendation.id)
      setSuccess(recommendation.kind === 'Reorder'
        ? `Reorder alert for ${recommendation.subject} marked as reviewed. Record the delivery in Inventory when it arrives.`
        : `Pricing alert for ${recommendation.subject} marked as reviewed. Prices change only if you edit them in Pricing Rules.`)
    } catch (reason) {
      setSuccess('')
      setError(reason instanceof Error ? reason.message : 'Could not update the recommendation.')
    }
  }

  const generate = () => {
    setError('')
    try {
      const before = useAdminStore.getState().recommendations.length
      regenerateRecommendations()
      const added = useAdminStore.getState().recommendations.length - before
      setSuccess(added === 0
        ? 'No new recommendations. Everything that applies is already waiting for review.'
        : `${added} new recommendation${added === 1 ? '' : 's'} generated.`)
    } catch (reason) {
      setSuccess('')
      setError(reason instanceof Error ? reason.message : 'Recommendations could not be generated.')
    }
  }

  const renderList = (items: Recommendation[], empty: string) => items.length === 0
    ? <EmptyState>{empty}</EmptyState>
    : items.map(recommendation => (
        <article key={recommendation.id} style={{ padding: '14px 0', borderBottom: `1px solid ${screenColors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ color: screenColors.foreground, fontSize: 14, fontWeight: 600 }}>{recommendation.subject}</h3>
              <p style={{ color: screenColors.accent, fontSize: 13, marginTop: 5 }}>{recommendation.suggestion}</p>
              <p style={{ color: screenColors.muted, fontSize: 12, marginTop: 4 }}>{recommendation.basis}</p>
            </div>
            {recommendation.status === 'Pending'
              ? <div><ScreenButton variant="secondary" onClick={() => review(recommendation)}>Mark as reviewed</ScreenButton></div>
              : <span style={{ color: '#276749', fontSize: 12, fontWeight: 600 }}>Reviewed</span>}
          </div>
        </article>
      ))

  return (
    <div>
      <ScreenTitle
        title="Recommendations"
        subtitle="Rule-based reorder alerts from current stock and usage, and pricing alerts from current sales."
      />
      <ScreenFeedback success={success} error={error} />
      <ScreenCard style={{ marginBottom: 18, background: screenColors.accentLight }}>
        <p style={{ color: '#4A5A38', fontSize: 13, fontWeight: 600 }}>
          input-based estimates, not predictive forecasting
        </p>
        <p style={{ color: '#4A5A38', fontSize: 12, marginTop: 4 }}>
          Recommendations are alerts only: they never change stock or prices. If you agree, record the delivery in Inventory or adjust prices in Pricing Rules.
        </p>
      </ScreenCard>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <ScreenButton onClick={generate}>Generate recommendations</ScreenButton>
      </div>
      <ScreenCard style={{ marginBottom: 18 }}>
        <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Reorder alerts</h2>
        <p style={{ color: screenColors.muted, fontSize: 12, marginBottom: 8 }}>
          Suggested quantities cover two weeks of typical use above the reorder point. Stock changes only when a delivery is recorded in Inventory.
        </p>
        {renderList(reorders, 'No materials are at or below their reorder point.')}
      </ScreenCard>
      <ScreenCard>
        <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Pricing alerts</h2>
        <p style={{ color: screenColors.muted, fontSize: 12, marginBottom: 8 }}>
          Information only: these never change prices. If you agree, adjust the markup in Pricing Rules, where the change is scheduled.
        </p>
        {renderList(pricing, 'No high-demand or underperforming products in the current sales figures.')}
      </ScreenCard>
    </div>
  )
}
