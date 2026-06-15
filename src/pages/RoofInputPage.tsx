import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { RoofProject, RoofDimensions, TileSpec, RoofType, DEFAULT_TILE_SPECS } from '../types'
import { getProjects, deleteProject } from '../utils/storage'
import { validateInputs } from '../utils/calculator'

const roofTypes: RoofType[] = ['硬山', '悬山', '歇山', '庑殿', '攒尖', '卷棚']

export default function RoofInputPage() {
  const navigate = useNavigate()
  const { currentProject, updateProject, createNewProject, setLayoutResult, setLeakResult } = useProject()
  const [projectList, setProjectList] = useState<RoofProject[]>([])
  const [form, setForm] = useState<RoofProject | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    refreshProjects()
  }, [])

  useEffect(() => {
    if (currentProject) {
      setForm({ ...currentProject })
      setShowErrors(false)
    }
  }, [currentProject])

  const refreshProjects = async () => {
    const list = await getProjects()
    setProjectList(list)
  }

  if (!form) return null

  const updateField = <K extends keyof RoofProject>(key: K, value: RoofProject[K]) => {
    setForm(prev => prev ? { ...prev, [key]: value } : prev)
    setShowErrors(false)
  }

  const updateDim = <K extends keyof RoofDimensions>(key: K, value: RoofDimensions[K]) => {
    setForm(prev => prev ? { ...prev, dimensions: { ...prev.dimensions, [key]: value } } : prev)
    setShowErrors(false)
  }

  const updateTile = <K extends keyof TileSpec>(key: K, value: TileSpec[K]) => {
    setForm(prev => prev ? { ...prev, tileSpec: { ...prev.tileSpec, [key]: value } } : prev)
    setShowErrors(false)
  }

  const applyPresetTile = (spec: TileSpec) => {
    setForm(prev => prev ? { ...prev, tileSpec: { ...spec } } : prev)
    setShowErrors(false)
  }

  const runValidation = (): string[] => {
    if (!form) return ['表单未初始化']
    return validateInputs(form.dimensions, form.tileSpec)
  }

  const handleSave = async () => {
    if (!form) return
    const errs = runValidation()
    if (errs.length > 0) {
      setErrors(errs)
      setShowErrors(true)
      if (!confirm(`当前数据有 ${errs.length} 项问题，是否仍要保存？\n\n• ${errs.slice(0, 5).join('\n• ')}${errs.length > 5 ? `\n...还有 ${errs.length - 5} 项` : ''}`)) {
        return
      }
    }
    await updateProject(form)
    refreshProjects()
    setShowErrors(false)
  }

  const handleSaveAndCalc = async () => {
    if (!form) return
    const errs = runValidation()
    if (errs.length > 0) {
      setErrors(errs)
      setShowErrors(true)
      alert(`参数校验未通过，无法计算排瓦：\n\n${errs.map((e, i) => `${i + 1}. ${e}`).join('\n')}`)
      return
    }
    await updateProject(form)
    setLayoutResult(null)
    setLeakResult(null)
    setShowErrors(false)
    navigate('/tile-layout')
  }

  const handleSelectProject = (p: RoofProject) => {
    setForm({ ...p })
    setShowErrors(false)
    setErrors([])
  }

  const handleNewProject = () => {
    const p = createNewProject()
    setForm({ ...p })
    setShowErrors(false)
    setErrors([])
  }

  const handleDeleteProject = async (id: string) => {
    if (!confirm('确定删除该屋面项目？')) return
    await deleteProject(id)
    refreshProjects()
  }

  return (
    <>
      <div className="content-header">
        <h1 className="page-title">屋面录入</h1>
        <div className="flex gap-8">
          <button className="btn btn-secondary" onClick={handleNewProject}>
            ＋ 新建屋面
          </button>
          <button className="btn btn-secondary" onClick={handleSave}>
            保存
          </button>
          <button className="btn btn-primary" onClick={handleSaveAndCalc}>
            保存并计算排瓦 →
          </button>
        </div>
      </div>

      <div className="content-body">
        {showErrors && errors.length > 0 && (
          <div className="alert alert-danger">
            <span className="alert-icon">⚠️</span>
            <div className="alert-content">
              <strong>参数校验发现以下问题：</strong>
              <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
          <div>
            <div className="card">
              <div className="card-title">基本信息</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">工程名称</label>
                  <input
                    className="form-input"
                    value={form.projectName}
                    onChange={e => updateField('projectName', e.target.value)}
                    placeholder="例如：某庙大雄宝殿修缮工程"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">屋面名称</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => updateField('name', e.target.value)}
                    placeholder="例如：东配殿南坡"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">屋面形式</label>
                  <select
                    className="form-select"
                    value={form.dimensions.roofType}
                    onChange={e => updateDim('roofType', e.target.value as RoofType)}
                  >
                    {roofTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">屋面尺寸</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">坡长（沿坡面）(mm) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.dimensions.slopeLength}
                    onChange={e => updateDim('slopeLength', Number(e.target.value))}
                    min={10}
                    step={10}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">檐口面阔 (mm) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.dimensions.eaveWidth}
                    onChange={e => updateDim('eaveWidth', Number(e.target.value))}
                    min={10}
                    step={10}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">正脊长度 (mm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.dimensions.ridgeLength}
                    onChange={e => updateDim('ridgeLength', Number(e.target.value))}
                    min={0}
                    step={10}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">屋面坡度 (°) *</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={form.dimensions.slopeAngle}
                    onChange={e => updateDim('slopeAngle', Number(e.target.value))}
                    min={0.1}
                    max={89}
                  />
                  <span className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                    五举≈26.6°，六举≈31°，七五举≈37°
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">出檐长度 (mm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.dimensions.eaveOverhang}
                    onChange={e => updateDim('eaveOverhang', Number(e.target.value))}
                    min={0}
                    step={10}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">脊部高度 (mm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.dimensions.ridgeHeight}
                    onChange={e => updateDim('ridgeHeight', Number(e.target.value))}
                    min={0}
                    step={10}
                  />
                </div>
              </div>

              <div className="card mt-20">
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  坡面投影示意：
                </div>
                <svg viewBox="0 0 600 200" style={{ width: '100%', height: 160 }}>
                  <defs>
                    <linearGradient id="roofGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#c9a962" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#8b6914" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>
                  <line x1="30" y1="170" x2="570" y2="170" stroke="#6b7390" strokeDasharray="4 4" />
                  <polygon
                    points={`60,170 300,${170 - Math.min(140, Math.max(10, 600 * Math.tan(Math.min(45, Math.max(1, form.dimensions.slopeAngle)) * Math.PI / 180) / 2)} 540,170`}
                    fill="url(#roofGrad)"
                    stroke="#c9a962"
                    strokeWidth="2"
                  />
                  <text x="300" y="190" textAnchor="middle" fill="#9ba3b8" fontSize="11">
                    檐口宽度 {form.dimensions.eaveWidth}mm
                  </text>
                </svg>
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                瓦片规格
                <span style={{ fontSize: 12, fontWeight: 'normal', color: 'var(--text-muted)' }}>
                  快速选择：
                  {DEFAULT_TILE_SPECS.map(s => (
                    <button
                      key={s.name}
                      className="btn btn-sm"
                      style={{ marginLeft: 8, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      onClick={() => applyPresetTile(s)}
                    >
                      {s.name}
                    </button>
                  ))}
                </span>
              </div>

              <div className="section-title">底瓦（板瓦）</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">底瓦长度 (mm) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.tileSpec.bottomTileLength}
                    onChange={e => updateTile('bottomTileLength', Number(e.target.value))}
                    min={1}
                    step={1}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">底瓦宽度 (mm) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.tileSpec.bottomTileWidth}
                    onChange={e => updateTile('bottomTileWidth', Number(e.target.value))}
                    min={1}
                    step={1}
                  />
                </div>
              </div>

              <div className="section-title">盖瓦（筒瓦）</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">盖瓦长度 (mm) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.tileSpec.topTileLength}
                    onChange={e => updateTile('topTileLength', Number(e.target.value))}
                    min={1}
                    step={1}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">盖瓦宽度 (mm) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.tileSpec.topTileWidth}
                    onChange={e => updateTile('topTileWidth', Number(e.target.value))}
                    min={1}
                    step={1}
                  />
                </div>
              </div>

              <div className="section-title">搭接参数（压七露三：头露约30%）</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">头搭接（上下）(mm) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.tileSpec.headOverlap}
                    onChange={e => updateTile('headOverlap', Number(e.target.value))}
                    min={1}
                    step={1}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">边搭接（左右）(mm) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.tileSpec.sideOverlap}
                    onChange={e => updateTile('sideOverlap', Number(e.target.value))}
                    min={1}
                    step={1}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">外露比例（如 0.3 为露三）*</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={form.tileSpec.exposedRatio}
                    onChange={e => updateTile('exposedRatio', Number(e.target.value))}
                    min={0.05}
                    max={0.8}
                  />
                </div>
              </div>

              <div className="alert alert-info mt-20">
                <span className="alert-icon">ℹ️</span>
                <div className="alert-content">
                  <strong>传统压七露三解释</strong>
                  每块瓦片长度外露约30%，压住约70%。头搭接 = 瓦长 × 0.7。实际施工按屋面长度做整数排调整。
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">备注</div>
              <textarea
                className="form-textarea"
                style={{ width: '100%', minHeight: 80 }}
                value={form.notes || ''}
                onChange={e => updateField('notes', e.target.value)}
                placeholder="施工特殊要求、修缮说明、材料来源等"
              />
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card-title">历史项目</div>
              {projectList.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-text">暂无保存的屋面项目</div>
                </div>
              ) : (
                <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                  {projectList.map(p => (
                    <div
                      key={p.id}
                      style={{
                        padding: '12px 0',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        opacity: currentProject?.id === p.id ? 1 : 0.85,
                        background: currentProject?.id === p.id ? 'rgba(201,169,98,0.08)' : 'transparent'
                      }}
                      onClick={() => handleSelectProject(p)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {p.projectName}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            {p.dimensions.roofType} · {p.dimensions.slopeLength}mm×{p.dimensions.eaveWidth}mm
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                            {new Date(p.updatedAt).toLocaleString('zh-CN')}
                          </div>
                        </div>
                        <button
                          className="btn btn-sm btn-danger"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={e => { e.stopPropagation(); handleDeleteProject(p.id) }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
