import SimulationControl from './components/SimulationControl.js'
import BotTable from './components/BotTable.js'
import LogsViewer from './components/LogsViewer.js'
import CreatePost from './components/CreatePost.tsx'
export default function App() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">🧠 LLM Bot Admin</h1>
      <SimulationControl />
      <BotTable />
      <LogsViewer />
      <CreatePost onPostCreated={() => {}} />
    </div>
  )
}