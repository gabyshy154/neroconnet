import { useState } from 'react'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import { useAdminStore } from '../store/adminStore'

export default function DesignReviewScreen() {
  const submissions = useAdminStore(state => state.designSubmissions)
  const approveDesign = useAdminStore(state => state.approveDesign)
  const requestDesignRevision = useAdminStore(state => state.requestDesignRevision)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [failedPreviews, setFailedPreviews] = useState<Record<string, boolean>>({})
  const [success, setSuccess] = useState('Design Review data loaded from the local store.')
  const [error, setError] = useState('')

  const runAction = (action: () => void, message: string) => {
    setError('')
    try {
      action()
      setSuccess(message)
    } catch (reason) {
      setSuccess('')
      setError(reason instanceof Error ? reason.message : 'Design review action could not be completed.')
    }
  }

  const previewStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    padding: 10,
    borderRadius: 6,
    border: `1px dashed ${screenColors.border}`,
    background: '#F4F3EE',
    color: screenColors.muted,
    fontSize: 12,
    textAlign: 'center',
  }

  return (
    <div>
      <ScreenTitle title="Design Review" subtitle="Review submitted designs and provide a note when requesting revisions." />
      <ScreenFeedback success={success} error={error} />
      {submissions.length === 0
        ? <EmptyState>There are no submitted designs to review.</EmptyState>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {submissions.map(submission => (
              <ScreenCard key={submission.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                  <div>
                    <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600 }}>{submission.customer}</h2>
                    <p style={{ color: screenColors.muted, fontSize: 12, marginTop: 4 }}>{submission.orderRef} · {submission.source}</p>
                  </div>
                  <span style={{ color: submission.status === 'Approved' ? '#276749' : submission.status === 'Revision Required' ? '#9B3526' : screenColors.accent, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {submission.status}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <p style={{ color: screenColors.muted, fontSize: 11, marginBottom: 5 }}>Front preview</p>
                    <div style={previewStyle}>
                      {failedPreviews[`${submission.id}-front`]
                        ? 'Front preview unavailable'
                        : <img
                            src={submission.front}
                            alt={`${submission.customer} design front`}
                            onError={() => setFailedPreviews(current => ({ ...current, [`${submission.id}-front`]: true }))}
                            style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain' }}
                          />}
                    </div>
                  </div>
                  <div>
                    <p style={{ color: screenColors.muted, fontSize: 11, marginBottom: 5 }}>Back preview</p>
                    <div style={previewStyle}>
                      {submission.back && !failedPreviews[`${submission.id}-back`]
                        ? <img
                            src={submission.back}
                            alt={`${submission.customer} design back`}
                            onError={() => setFailedPreviews(current => ({ ...current, [`${submission.id}-back`]: true }))}
                            style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain' }}
                          />
                        : submission.back ? 'Back preview unavailable' : 'No back design submitted'}
                    </div>
                  </div>
                </div>
                {submission.note && (
                  <p style={{ color: screenColors.muted, fontSize: 12, marginBottom: 10 }}>Latest note: {submission.note}</p>
                )}
                {submission.status === 'Under Review' && (
                  <>
                    <label htmlFor={`revision-note-${submission.id}`} style={{ color: screenColors.muted, display: 'block', fontSize: 12, marginBottom: 5 }}>
                      Revision note (required to request revision)
                    </label>
                    <textarea
                      id={`revision-note-${submission.id}`}
                      value={notes[submission.id] ?? ''}
                      onChange={event => setNotes(current => ({ ...current, [submission.id]: event.target.value }))}
                      rows={3}
                      style={{
                        width: '100%',
                        resize: 'vertical',
                        border: `1px solid ${screenColors.border}`,
                        borderRadius: 5,
                        padding: 8,
                        color: screenColors.foreground,
                        font: '13px Inter, sans-serif',
                        marginBottom: 10,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <ScreenButton onClick={() => runAction(() => approveDesign(submission.id), 'Design approved.')}>Approve</ScreenButton>
                      <ScreenButton
                        variant="secondary"
                        onClick={() => runAction(
                          () => requestDesignRevision(submission.id, notes[submission.id] ?? ''),
                          'Revision requested and note saved.',
                        )}
                      >
                        Request Revision
                      </ScreenButton>
                    </div>
                  </>
                )}
              </ScreenCard>
            ))}
          </div>
        )}
    </div>
  )
}
