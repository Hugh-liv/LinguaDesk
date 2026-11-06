import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { CorpusPage } from '@/pages/corpus-page'
import { ListeningPage } from '@/pages/listening-page'
import { MePage } from '@/pages/me-page'
import { SpeakingPage } from '@/pages/speaking-page'
import { DiagnosticsPage } from '@/pages/diagnostics-page'
import { MaterialsPage } from '@/pages/materials-page'
import { StudyPage } from '@/pages/study-page'
import { TodayPage } from '@/pages/today-page'
import { WritingPage } from '@/pages/writing-page'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/today" replace />} />
          <Route path="today" element={<TodayPage />} />
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="study" element={<StudyPage />} />
          <Route path="writing" element={<WritingPage />} />
          <Route path="speaking" element={<SpeakingPage />} />
          <Route path="listening" element={<ListeningPage />} />
          <Route path="corpus" element={<CorpusPage />} />
          <Route path="diagnostics" element={<DiagnosticsPage />} />
          <Route path="me" element={<MePage />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
