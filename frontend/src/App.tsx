import { Routes, Route } from 'react-router-dom'
import ContentTypeList from './screens/contentTypes/ContentTypeList'
import NewContentType from './screens/contentTypes/NewContentType'
import EditContentType from './screens/contentTypes/EditContentType'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<ContentTypeList />} />
        <Route path="/new" element={<NewContentType />} />
        <Route path="/edit/:slug" element={<EditContentType />} />
      </Routes>
    </div>
  )
}
