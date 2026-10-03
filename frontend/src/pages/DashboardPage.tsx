import { TranscriptionList } from '../components/transcriptions/TranscriptionList'
import { UploadCard } from '../components/transcriptions/UploadCard'

export function DashboardPage() {
  return (
    <div className="space-y-8">
      <UploadCard />
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Histórico</h2>
        <TranscriptionList />
      </section>
    </div>
  )
}
