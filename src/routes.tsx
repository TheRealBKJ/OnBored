import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Plans, PlanDetail } from './pages/Plans'
import { Library, DocDetail } from './pages/Library'
import { Codebase } from './pages/Codebase'
import { Tasks } from './pages/Tasks'
import { Messages } from './pages/Messages'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="plans" element={<Plans />} />
        <Route path="plans/:id" element={<PlanDetail />} />
        <Route path="library" element={<Library />} />
        <Route path="library/:id" element={<DocDetail />} />
        <Route path="codebase" element={<Codebase />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="messages" element={<Messages />} />
        <Route path="messages/:id" element={<Messages />} />
      </Route>
    </Routes>
  )
}
