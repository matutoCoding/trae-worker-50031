import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { getArchives, deleteArchive } from '../utils/storage'
import { ArchiveRecord } from '../types'

export default function ArchivePage() {
  const navigate = useNavigate()
  const { setCurrentProject, setLayoutResult, setLeakResult } = useProject()
  const [archives, setArchives] = useState<ArchiveRecord[]>([])
  const [selected, setSelected] = useState<ArchiveRecord | null>(null)
  const [filter, setFilter] = useState<'all' | 'draft' | 'approved' | 'completed'>('all')

  useEffect(() => {
    load()
  }, [])

  const load = async () => setArchives(await getArchives())

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该档案记录？')) return
    await deleteArchive(id)
    load()
    if (selected?.id === id) setSelected(null)
  }

  const handleLoad = (a: ArchiveRecord) => {
    setCurrentProject({
      id: a.projectId,
      name: a.roofName,
      projectName: a.projectName,
      createdAt: a.createdAt,
      updatedAt: a.createdAt,
      dimensions: a.dimensions,
      tileSpec: a.tileSpec
    })
    setLayoutResult(a.layoutResult)
    setLeakResult(a.leakResult)
    navigate('/tile-layout')
  }

  const handleExport = async (a: ArchiveRecord) => {
    const data = JSON.stringify(a, null, 2)
    if (window.api?.exportData) {
      await window.api.exportData(`${a.roofName}_施工档案.json`, data)
    } else {
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${a.roofName}_施工档案.json`
      link.click()
    }
  }

  const filtered = filter === 'all' ? archives : archives.filter(a => a.status === filter)

  const statusBadge = (s: string) => {
    if (s === 'approved') return <span className="badge badge-success">已通过</span>
    if (s === 'completed') return <span className="badge badge-info">已施工</span>
    return <span className="badge badge-warning">草稿</span>
  }

  return (
    <>
      <div className="content-header">
        <h1 className="page-title">施工档案</h1>
        <div className="flex gap-8">
          {(['all', 'draft', 'approved', 'completed'] as const).map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '全部' : f === 'draft' ? '草稿' : f === 'approved' ? '已通过' : '已施工'}
              <span className="text-muted" style={{ marginLeft: 6 }}>
                ({f === 'all' ? archives.length : archives.filter(a => a.status === f).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="content-body">
        {archives.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <div className="empty-state-text">暂无施工档案</div>
            <div className="text-muted mt-8">在排瓦计算或防漏校核页面可将方案归档</div>
            <button className="btn btn-primary mt-20" onClick={() => navigate('/roof-input')}>去创建方案</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, height: '100%' }}>
            <div className="card" style={{ margin: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div className="card-title">档案列表</div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {filtered.map(a => (
                  <div
                    key={a.id}
                    onClick={() => setSelected(a)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      background: selected?.id === a.id ? 'var(--bg-tertiary)' : 'transparent',
                      borderLeft: selected?.id === a.id ? '3px solid var(--accent-primary)' : '3px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{a.roofName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {a.projectName}
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span className="badge badge-info" style={{ fontSize: 11 }}>{a.roofType}</span>
                          {statusBadge(a.status)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                          {new Date(a.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-danger"
                        style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={e => { e.stopPropagation(); handleDelete(a.id) }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ overflowY: 'auto' }}>
              {!selected ? (
                <div className="card">
                  <div className="empty-state">
                    <div className="empty-state-icon">👈</div>
                    <div className="empty-state-text">点击左侧档案查看详情</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="card">
                    <div className="card-title">
                      档案详情
                      <div className="flex gap-8">
                        <button className="btn btn-sm btn-secondary" onClick={() => handleExport(selected)}>导出</button>
                        <button className="btn btn-sm btn-primary" onClick={() => handleLoad(selected)}>载入方案</button>
                      </div>
                    </div>

                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <div className="form-group">
                        <div className="form-label">工程名称</div>
                        <div style={{ fontSize: 15, fontWeight: 500 }}>{selected.projectName}</div>
                      </div>
                      <div className="form-group">
                        <div className="form-label">屋面名称</div>
                        <div style={{ fontSize: 15, fontWeight: 500 }}>{selected.roofName}</div>
                      </div>
                      <div className="form-group">
                        <div className="form-label">屋面形式</div>
                        <div style={{ fontSize: 15, fontWeight: 500 }}>{selected.roofType}</div>
                      </div>
                      <div className="form-group">
                        <div className="form-label">归档状态</div>
                        <div>{statusBadge(selected.status)}</div>
                      </div>
                      <div className="form-group">
                        <div className="form-label">操作人</div>
                        <div style={{ fontSize: 15 }}>{selected.operator || '-'}</div>
                      </div>
                      <div className="form-group">
                        <div className="form-label">审核人</div>
                        <div style={{ fontSize: 15 }}>{selected.reviewer || '-'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title">屋面参数</div>
                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                      <div className="form-group">
                        <div className="form-label">坡长</div>
                        <div className="text-accent fw-600">{selected.dimensions.slopeLength} mm</div>
                      </div>
                      <div className="form-group">
                        <div className="form-label">檐口宽度</div>
                        <div className="text-accent fw-600">{selected.dimensions.eaveWidth} mm</div>
                      </div>
                      <div className="form-group">
                        <div className="form-label">正脊长度</div>
                        <div className="text-accent fw-600">{selected.dimensions.ridgeLength} mm</div>
                      </div>
                      <div className="form-group">
                        <div className="form-label">坡度</div>
                        <div className="text-accent fw-600">{selected.dimensions.slopeAngle}°</div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title">排瓦计算结果</div>
                    <div className="stat-grid">
                      <div className="stat-card">
                        <div className="stat-label">总排数</div>
                        <div className="stat-value">{selected.layoutResult.totalRows}</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">底瓦总数</div>
                        <div className="stat-value">{selected.layoutResult.totalBottomTiles}</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">盖瓦总数</div>
                        <div className="stat-value">{selected.layoutResult.totalTopTiles}</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">最大偏差</div>
                        <div className={`stat-value ${selected.layoutResult.maxDeviation > 15 ? 'text-danger' : selected.layoutResult.maxDeviation > 10 ? 'text-warning' : ''}`}>
                          {selected.layoutResult.maxDeviation}%
                        </div>
                      </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>类别</th><th>材料</th><th>规格</th><th>数量</th><th>备料</th><th>单位</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.layoutResult.totalMaterials.slice(0, 8).map((m, i) => (
                            <tr key={i}>
                              <td><span className="badge badge-info">{m.category}</span></td>
                              <td>{m.name}</td>
                              <td className="text-muted">{m.specification}</td>
                              <td>{m.quantity}</td>
                              <td className="text-accent fw-600">{m.finalQuantity}</td>
                              <td>{m.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {selected.leakResult && (
                    <div className="card">
                      <div className="card-title">
                        防漏校核结果
                        <span style={{ marginLeft: 12 }}>
                          {selected.leakResult.overallStatus === 'safe' ? (
                            <span className="badge badge-success">防漏合格</span>
                          ) : selected.leakResult.overallStatus === 'warning' ? (
                            <span className="badge badge-warning">需整改</span>
                          ) : (
                            <span className="badge badge-danger">高风险</span>
                          )}
                        </span>
                      </div>
                      <div className="stat-grid">
                        <div className="stat-card">
                          <div className="stat-label">最小头搭接</div>
                          <div className="stat-value">{selected.leakResult.minHeadOverlap}<span className="stat-unit">mm</span></div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-label">排水流速</div>
                          <div className="stat-value">{selected.leakResult.drainageAnalysis.flowVelocity}<span className="stat-unit">m/s</span></div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-label">暴雨渗漏率</div>
                          <div className={`stat-value ${selected.leakResult.drainageAnalysis.stormSimulation.leakRatio > 5 ? 'text-danger' : ''}`}>
                            {selected.leakResult.drainageAnalysis.stormSimulation.leakRatio}<span className="stat-unit">%</span>
                          </div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-label">渗漏点</div>
                          <div className={`stat-value ${selected.leakResult.leakPoints.length > 0 ? 'text-warning' : 'text-success'}`}>
                            {selected.leakResult.leakPoints.length}<span className="stat-unit">处</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
