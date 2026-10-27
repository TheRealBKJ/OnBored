import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './features/home'
import { Plans, PlanDetail } from './features/plans'
import { Library, DocDetail } from './features/library'
import { Codebase } from './features/codebase'
import { Tasks } from './features/tasks'
import { Messages } from './features/messages'

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
