import SimulationControl from './components/SimulationControl.js'
import BotTable from './components/BotTable.js'
import LogsViewer from './components/LogsViewer.js'
import CreatePost from './components/CreatePost.tsx'
import Feed from './components/Feed.jsx'
import { useState } from 'react'

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handlePostCreated = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">🧠 LLM Bot Admin</h1>
      <BotTable />
      <LogsViewer />
      <CreatePost onPostCreated={handlePostCreated} />
      <Feed key={refreshKey} />
    </div>
  )
}