import { RoofProject, ArchiveRecord, RoofTemplate, DEFAULT_TILE_SPECS } from '../types'

const STORAGE_KEYS = {
  PROJECTS: 'roof_projects.json',
  CURRENT: 'current_project.json',
  ARCHIVES: 'archives.json',
  TEMPLATES: 'templates.json'
}

async function readFile(filename: string): Promise<any | null> {
  try {
    if (window.api && window.api.loadData) {
      const data = await window.api.loadData(filename)
      return data ? JSON.parse(data) : null
    }
    const raw = localStorage.getItem(filename)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

async function writeFile(filename: string, data: any): Promise<void> {
  const json = JSON.stringify(data, null, 2)
  if (window.api && window.api.saveData) {
    await window.api.saveData(filename, json)
  } else {
    localStorage.setItem(filename, json)
  }
}

export async function saveProject(project: RoofProject): Promise<void> {
  const projects = (await readFile(STORAGE_KEYS.PROJECTS)) as RoofProject[] | null
  const list = projects || []
  const idx = list.findIndex(p => p.id === project.id)
  if (idx >= 0) {
    list[idx] = { ...project, updatedAt: new Date().toISOString() }
  } else {
    list.push({ ...project, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  }
  await writeFile(STORAGE_KEYS.PROJECTS, list)
  await setCurrentProject(project)
}

export async function getProjects(): Promise<RoofProject[]> {
  return (await readFile(STORAGE_KEYS.PROJECTS)) || []
}

export async function getProject(id: string): Promise<RoofProject | null> {
  const projects = await getProjects()
  return projects.find(p => p.id === id) || null
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await getProjects()
  const filtered = projects.filter(p => p.id !== id)
  await writeFile(STORAGE_KEYS.PROJECTS, filtered)
}

export async function setCurrentProject(project: RoofProject): Promise<void> {
  await writeFile(STORAGE_KEYS.CURRENT, project)
}

export async function getCurrentProject(): Promise<RoofProject | null> {
  return await readFile(STORAGE_KEYS.CURRENT)
}

export async function saveArchive(archive: ArchiveRecord): Promise<void> {
  const archives = (await readFile(STORAGE_KEYS.ARCHIVES)) as ArchiveRecord[] | null
  const list = archives || []
  const idx = list.findIndex(a => a.id === archive.id)
  if (idx >= 0) {
    list[idx] = archive
  } else {
    list.unshift(archive)
  }
  await writeFile(STORAGE_KEYS.ARCHIVES, list)
}

export async function getArchives(): Promise<ArchiveRecord[]> {
  return (await readFile(STORAGE_KEYS.ARCHIVES)) || []
}

export async function deleteArchive(id: string): Promise<void> {
  const archives = await getArchives()
  const filtered = archives.filter(a => a.id !== id)
  await writeFile(STORAGE_KEYS.ARCHIVES, filtered)
}

export async function saveTemplate(template: RoofTemplate): Promise<void> {
  const templates = await getTemplates()
  const idx = templates.findIndex(t => t.id === template.id)
  if (idx >= 0) {
    templates[idx] = template
  } else {
    templates.unshift(template)
  }
  await writeFile(STORAGE_KEYS.TEMPLATES, templates)
}

export async function getTemplates(): Promise<RoofTemplate[]> {
  const stored = (await readFile(STORAGE_KEYS.TEMPLATES)) as RoofTemplate[] | null
  if (stored && stored.length > 0) return stored
  const defaults = getBuiltInTemplates()
  await writeFile(STORAGE_KEYS.TEMPLATES, defaults)
  return defaults
}

export async function deleteTemplate(id: string): Promise<void> {
  const templates = await getTemplates()
  const filtered = templates.filter(t => t.id !== id || t.isBuiltIn)
  await writeFile(STORAGE_KEYS.TEMPLATES, filtered)
}

export async function incrementTemplateUsage(id: string): Promise<void> {
  const templates = await getTemplates()
  const t = templates.find(x => x.id === id)
  if (t) {
    t.usageCount++
    await writeFile(STORAGE_KEYS.TEMPLATES, templates)
  }
}

function getBuiltInTemplates(): RoofTemplate[] {
  return [
    {
      id: 'tmpl-ys-hard',
      name: '北方硬山民居标准范式',
      roofType: '硬山',
      description: '适用于北方传统民居，青灰筒板瓦，五举或七五举架',
      tileSpec: DEFAULT_TILE_SPECS[0],
      standardDimensions: {
        slopeLength: 2800,
        eaveWidth: 4500,
        ridgeLength: 4500,
        slopeAngle: 26.5,
        roofType: '硬山',
        eaveOverhang: 600,
        ridgeHeight: 800
      },
      tags: ['北方', '民居', '青灰瓦', '硬山'],
      usageCount: 0,
      createdAt: new Date().toISOString(),
      isBuiltIn: true
    },
    {
      id: 'tmpl-xs-glazed',
      name: '官式歇山琉璃瓦范式',
      roofType: '歇山',
      description: '宫殿、庙宇等级别较高的歇山建筑，黄/绿琉璃瓦',
      tileSpec: DEFAULT_TILE_SPECS[1],
      standardDimensions: {
        slopeLength: 4200,
        eaveWidth: 9000,
        ridgeLength: 5000,
        slopeAngle: 30.9,
        roofType: '歇山',
        eaveOverhang: 900,
        ridgeHeight: 1500
      },
      tags: ['官式', '歇山', '琉璃瓦', '宫殿'],
      usageCount: 0,
      createdAt: new Date().toISOString(),
      isBuiltIn: true
    },
    {
      id: 'tmpl-hall-wudian',
      name: '重檐庑殿最高等级范式',
      roofType: '庑殿',
      description: '最高等级建筑，如太和殿形制，四面坡琉璃瓦',
      tileSpec: DEFAULT_TILE_SPECS[1],
      standardDimensions: {
        slopeLength: 6000,
        eaveWidth: 12000,
        ridgeLength: 7000,
        slopeAngle: 33.7,
        roofType: '庑殿',
        eaveOverhang: 1200,
        ridgeHeight: 2400
      },
      tags: ['最高等级', '庑殿', '重檐', '皇家'],
      usageCount: 0,
      createdAt: new Date().toISOString(),
      isBuiltIn: true
    },
    {
      id: 'tmpl-south-small',
      name: '江南民居小青瓦范式',
      roofType: '硬山',
      description: '江南水乡民居，小青瓦合瓦屋面，举架较缓',
      tileSpec: DEFAULT_TILE_SPECS[2],
      standardDimensions: {
        slopeLength: 2400,
        eaveWidth: 3800,
        ridgeLength: 3800,
        slopeAngle: 21.8,
        roofType: '硬山',
        eaveOverhang: 500,
        ridgeHeight: 600
      },
      tags: ['江南', '民居', '小青瓦', '合瓦'],
      usageCount: 0,
      createdAt: new Date().toISOString(),
      isBuiltIn: true
    },
    {
      id: 'tmpl-pavilion',
      name: '四角攒尖亭阁范式',
      roofType: '攒尖',
      description: '园林亭阁，四角攒尖，宝顶收束',
      tileSpec: DEFAULT_TILE_SPECS[0],
      standardDimensions: {
        slopeLength: 2000,
        eaveWidth: 3000,
        ridgeLength: 0,
        slopeAngle: 35,
        roofType: '攒尖',
        eaveOverhang: 400,
        ridgeHeight: 1200
      },
      tags: ['园林', '亭阁', '攒尖', '宝顶'],
      usageCount: 0,
      createdAt: new Date().toISOString(),
      isBuiltIn: true
    }
  ]
}
