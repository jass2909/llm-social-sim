import Feed from './pages/Feed.jsx'
import Layout from './components/layout/Layout.jsx'
import BotSelection from './pages/BotSelection.jsx'
import { UserProvider, useUser } from './context/UserContext.jsx'

function AppContent() {
  const { user } = useUser()
  
  if (!user) {
    return <BotSelection />
  }

  return (
    <Layout>
      <Feed />
    </Layout>
  )
}

export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  )
}
