import { Routes, Route } from 'react-router-dom'
import ContentTypeList from './screens/contentTypes/ContentTypeList'
import NewContentType from './screens/contentTypes/NewContentType'
import EditContentType from './screens/contentTypes/EditContentType'
import EntryList from './screens/entries/EntryList'
import NewEntry from './screens/entries/NewEntry'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<ContentTypeList />} />
        <Route path="/new" element={<NewContentType />} />
        <Route path="/edit/:slug" element={<EditContentType />} />
        <Route path="/:slug/entries" element={<EntryList />} />
        <Route path="/:slug/entries/new" element={<NewEntry />} />
      </Routes>
    </div>
  )
}
