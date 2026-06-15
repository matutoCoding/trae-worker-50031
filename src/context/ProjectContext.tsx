import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { RoofProject, TileLayoutResult, LeakCheckResult, DEFAULT_TILE_SPECS } from '../types'
import { getCurrentProject, saveProject } from '../utils/storage'

interface ProjectContextType {
  currentProject: RoofProject | null
  setCurrentProject: (p: RoofProject | null) => void
  layoutResult: TileLayoutResult | null
  setLayoutResult: (r: TileLayoutResult | null) => void
  leakResult: LeakCheckResult | null
  setLeakResult: (r: LeakCheckResult | null) => void
  updateProject: (p: RoofProject) => Promise<void>
  createNewProject: () => RoofProject
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export const defaultProject = (): RoofProject => ({
  id: `proj-${Date.now()}`,
  name: '新建屋面',
  projectName: '未命名工程',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  dimensions: {
    slopeLength: 3000,
    eaveWidth: 5000,
    ridgeLength: 5000,
    slopeAngle: 26.5,
    roofType: '硬山',
    eaveOverhang: 600,
    ridgeHeight: 800
  },
  tileSpec: { ...DEFAULT_TILE_SPECS[0] },
  notes: ''
})

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<RoofProject | null>(null)
  const [layoutResult, setLayoutResult] = useState<TileLayoutResult | null>(null)
  const [leakResult, setLeakResult] = useState<LeakCheckResult | null>(null)

  useEffect(() => {
    const init = async () => {
      const saved = await getCurrentProject()
      if (saved) {
        setCurrentProject(saved)
      } else {
        setCurrentProject(defaultProject())
      }
    }
    init()
  }, [])

  const updateProject = async (p: RoofProject) => {
    setCurrentProject(p)
    await saveProject(p)
    setLayoutResult(null)
    setLeakResult(null)
  }

  const createNewProject = (): RoofProject => {
    const p = defaultProject()
    setCurrentProject(p)
    setLayoutResult(null)
    setLeakResult(null)
    return p
  }

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        layoutResult,
        setLayoutResult,
        leakResult,
        setLeakResult,
        updateProject,
        createNewProject
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within ProjectProvider')
  return ctx
}
