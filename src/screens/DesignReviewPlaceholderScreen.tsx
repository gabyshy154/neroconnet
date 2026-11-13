import { EmptyState, ScreenCard, ScreenFeedback, ScreenTitle } from '../components/ScreenUI'

export default function DesignReviewPlaceholderScreen() {
  return (
    <div>
      <ScreenTitle title="Design Review" subtitle="Review submitted designs and manage revision requests." />
      <ScreenFeedback success="Design Review is scheduled for Step 3b." />
      <ScreenCard>
        <EmptyState>Coming in Step 3b</EmptyState>
      </ScreenCard>
    </div>
  )
}
