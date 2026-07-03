import { Routes, Route } from 'react-router-dom'
import ContentTypeList from './screens/contentTypes/ContentTypeList'
import NewContentType from './screens/contentTypes/NewContentType'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<ContentTypeList />} />
        <Route path="/new" element={<NewContentType />} />
      </Routes>
    </div>
  )
}
