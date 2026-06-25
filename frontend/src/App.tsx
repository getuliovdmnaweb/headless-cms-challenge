import { Route, Routes } from 'react-router-dom'

function ShellPage() {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      Headless CMS
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<ShellPage />} />
    </Routes>
  )
}

export default App
