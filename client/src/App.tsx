import { Route, Routes } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { DashboardPage } from './pages/DashboardPage'
import { SingleTestPage } from './pages/SingleTestPage'
import { ComparisonPage } from './pages/ComparisonPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/test" element={<SingleTestPage />} />
          <Route path="/compare" element={<ComparisonPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
