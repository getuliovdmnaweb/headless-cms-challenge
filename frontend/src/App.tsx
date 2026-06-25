import { Route, Routes } from 'react-router-dom'
import ContentTypeBuilderScreen from './screens/ContentTypeBuilder/ContentTypeBuilderScreen'
import ContentTypeListScreen from './screens/ContentTypeListScreen'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ContentTypeListScreen />} />
      <Route path="/content-types/new" element={<ContentTypeBuilderScreen />} />
      <Route path="/content-types/:id/edit" element={<ContentTypeBuilderScreen />} />
    </Routes>
  )
}

export default App
