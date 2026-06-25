import { Route, Routes } from 'react-router-dom'
import ContentTypeBuilderScreen from './screens/ContentTypeBuilder/ContentTypeBuilderScreen'
import ContentTypeListScreen from './screens/ContentTypeListScreen'
import EntryEditorScreen from './screens/EntryEditor/EntryEditorScreen'
import EntryListScreen from './screens/EntryList/EntryListScreen'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ContentTypeListScreen />} />
      <Route path="/content-types/new" element={<ContentTypeBuilderScreen />} />
      <Route path="/content-types/:id/edit" element={<ContentTypeBuilderScreen />} />
      <Route path="/content-types/:contentTypeId/entries" element={<EntryListScreen />} />
      <Route path="/content-types/:contentTypeId/entries/new" element={<EntryEditorScreen />} />
      <Route path="/content-types/:contentTypeId/entries/:entryId" element={<EntryEditorScreen />} />
    </Routes>
  )
}

export default App
