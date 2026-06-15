import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { getTemplates, saveTemplate, deleteTemplate, incrementTemplateUsage } from '../utils/storage'
import { RoofTemplate, RoofType, DEFAULT_TILE_SPECS, RoofProject } from '../types'

const roofTypes: (RoofType | 'all')[] = ['all', '硬山', '悬山', '歇山', '庑殿', '攒尖', '卷棚']

export default function TemplatePage() {
  const navigate = useNavigate()
  const { currentProject, updateProject } = useProject()
  const [templates, setTemplates] = useState<RoofTemplate[]>([])
  const [filterType, setFilterType] = useState<RoofType | 'all'>('all')
  const [searchTag, setSearchTag] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => setTemplates(await getTemplates())

  const filtered = templates.filter(t => {
    if (filterType !== 'all' && t.roofType !== filterType) return false
    if (searchTag && !t.tags.some(tg => tg.includes(searchTag)) && !t.name.includes(searchTag)) return false
    return true
  })

  const handleApply = async (t: RoofTemplate) => {
    if (!currentProject) return
    if (!confirm(`应用范式「${t.name}」到当前屋面？将覆盖尺寸和瓦件规格。`)) return
    const updated: RoofProject = {
      ...currentProject,
      dimensions: { ...t.standardDimensions },
      tileSpec: { ...t.tileSpec }
    }
    await updateProject(updated)
    await incrementTemplateUsage(t.id)
    load()
    navigate('/roof-input')
  }

  const handleSaveAsTemplate = () => setShowCreate(true)

  const handleDelete = async (id: string, builtIn: boolean) => {
    if (builtIn) { alert('内置范式不可删除'); return }
    if (!confirm('确定删除该范式？')) return
    await deleteTemplate(id)
    load()
  }

  return (
    <>
      <div className="content-header">
        <h1 className="page-title">范式库</h1>
        <div className="flex gap-8">
          <button className="btn btn-secondary" onClick={handleSaveAsTemplate}>＋ 另存当前方案为范式</button>
        </div>
      </div>

      <div className="content-body">
        <div className="card">
          <div className="flex-between mb-16">
            <div className="flex gap-8">
              {roofTypes.map(t => (
                <button
                  key={t}
                  className={`btn btn-sm ${filterType === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilterType(t)}
                >
                  {t === 'all' ? '全部形式' : t}
                </button>
              ))}
            </div>
            <input
              className="form-input"
              style={{ width: 240 }}
              placeholder="搜索名称或标签..."
              value={searchTag}
              onChange={e => setSearchTag(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <div className="empty-state-text">没有匹配的范式</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {filtered.map(t => (
                <div
                  key={t.id}
                  className="card"
                  style={{
                    margin: 0,
                    border: t.isBuiltIn ? '1px solid rgba(201,169,98,0.3)' : '1px solid var(--border-color)',
                    background: t.isBuiltIn ? 'linear-gradient(135deg, rgba(201,169,98,0.05), var(--bg-card))' : 'var(--bg-card)'
                  }}
                >
                  <div className="flex-between mb-12">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="badge badge-warning">{t.roofType}</span>
                      {t.isBuiltIn && <span className="badge badge-info" style={{ fontSize: 11 }}>内置</span>}
                      <span className="text-muted" style={{ fontSize: 12 }}>使用 {t.usageCount} 次</span>
                    </div>
                    <button
                      className="btn btn-sm btn-danger"
                      style={{ padding: '2px 8px', fontSize: 11 }}
                      onClick={() => handleDelete(t.id, t.isBuiltIn)}
                      disabled={t.isBuiltIn}
                    >
                      删除
                    </button>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{t.name}</div>
                  <div className="text-muted mb-12" style={{ fontSize: 13 }}>{t.description}</div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12, marginBottom: 12 }}>
                    <div><span className="text-muted">坡长：</span><span className="text-accent">{t.standardDimensions.slopeLength}mm</span></div>
                    <div><span className="text-muted">檐宽：</span><span className="text-accent">{t.standardDimensions.eaveWidth}mm</span></div>
                    <div><span className="text-muted">坡度：</span><span className="text-accent">{t.standardDimensions.slopeAngle}°</span></div>
                    <div><span className="text-muted">瓦件：</span><span className="text-accent">{t.tileSpec.name}</span></div>
                  </div>

                  <div style={{ marginBottom: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {t.tags.map(tag => (
                      <span key={tag} style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 10,
                        background: 'var(--bg-tertiary)', color: 'var(--text-secondary)'
                      }}>#{tag}</span>
                    ))}
                  </div>

                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleApply(t)}>
                    应用此范式
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {showCreate && currentProject && (
          <CreateTemplateModal
            project={currentProject}
            onClose={() => setShowCreate(false)}
            onSaved={() => { setShowCreate(false); load() }}
          />
        )}
      </div>
    </>
  )
}

function CreateTemplateModal({ project, onClose, onSaved }: {
  project: RoofProject
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(`${project.name} - 自定义范式`)
  const [description, setDescription] = useState(project.notes || '')
  const [tagsInput, setTags] = useState(project.dimensions.roofType)
  const [presetTile, setPresetTile] = useState(0)

  const handleSave = async () => {
    const tags = tagsInput.split(/[,，#\s]+/).filter(Boolean)
    const t: RoofTemplate = {
      id: `tmpl-${Date.now()}`,
      name: name || '未命名范式',
      roofType: project.dimensions.roofType,
      description,
      tileSpec: presetTile >= 0 ? { ...DEFAULT_TILE_SPECS[presetTile] } : { ...project.tileSpec },
      standardDimensions: { ...project.dimensions },
      tags,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      isBuiltIn: false
    }
    await saveTemplate(t)
    onSaved()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div
        className="card"
        style={{ width: 560, maxHeight: '85vh', overflowY: 'auto', margin: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="card-title">
          另存为范式
          <button className="btn btn-sm btn-secondary" onClick={onClose}>关闭</button>
        </div>

        <div className="form-group mb-12">
          <label className="form-label">范式名称</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="form-group mb-12">
          <label className="form-label">描述说明</label>
          <textarea className="form-textarea" style={{ width: '100%' }} value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="form-group mb-12">
          <label className="form-label">标签（逗号或空格分隔）</label>
          <input className="form-input" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="例如：北方, 民居, 青灰瓦" />
        </div>

        <div className="form-group mb-12">
          <label className="form-label">瓦件规格</label>
          <select className="form-select" value={presetTile} onChange={e => setPresetTile(Number(e.target.value))}>
            {DEFAULT_TILE_SPECS.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
            <option value={-1}>使用当前屋面瓦件</option>
          </select>
        </div>

        <div className="alert alert-info mb-16">
          <span className="alert-icon">ℹ️</span>
          <div className="alert-content">
            将保存屋面尺寸（坡长{project.dimensions.slopeLength}mm × 檐宽{project.dimensions.eaveWidth}mm，坡度{project.dimensions.slopeAngle}°）作为范式标准。
          </div>
        </div>

        <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSave}>保存范式</button>
        </div>
      </div>
    </div>
  )
}
