import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { ProjectProvider } from './context/ProjectContext'
import RoofInputPage from './pages/RoofInputPage'
import TileLayoutPage from './pages/TileLayoutPage'
import LeakCheckPage from './pages/LeakCheckPage'
import ArchivePage from './pages/ArchivePage'
import TemplatePage from './pages/TemplatePage'

function App() {
  return (
    <ProjectProvider>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title">古建瓦作系统</div>
            <div className="sidebar-subtitle">排瓦计算 · 防漏校核</div>
          </div>
          <nav className="sidebar-nav">
            <NavLink to="/roof-input" className="nav-item">
              <span className="nav-icon">🏠</span>
              屋面录入
            </NavLink>
            <NavLink to="/tile-layout" className="nav-item">
              <span className="nav-icon">🧱</span>
              排瓦计算
            </NavLink>
            <NavLink to="/leak-check" className="nav-item">
              <span className="nav-icon">🔍</span>
              防漏校核
            </NavLink>
            <NavLink to="/archive" className="nav-item">
              <span className="nav-icon">📁</span>
              施工档案
            </NavLink>
            <NavLink to="/templates" className="nav-item">
              <span className="nav-icon">📚</span>
              范式库
            </NavLink>
          </nav>
        </aside>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/roof-input" replace />} />
            <Route path="/roof-input" element={<RoofInputPage />} />
            <Route path="/tile-layout" element={<TileLayoutPage />} />
            <Route path="/leak-check" element={<LeakCheckPage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/templates" element={<TemplatePage />} />
          </Routes>
        </main>
      </div>
    </ProjectProvider>
  )
}

export default App
