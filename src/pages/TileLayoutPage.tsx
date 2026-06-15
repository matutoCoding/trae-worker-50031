import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { calculateTileLayout } from '../utils/calculator'
import { saveArchive } from '../utils/storage'
import { TileLayoutResult, ArchiveRecord } from '../types'

export default function TileLayoutPage() {
  const navigate = useNavigate()
  const { currentProject, layoutResult, setLayoutResult, setLeakResult } = useProject()
  const [activeTab, setActiveTab] = useState<'rows' | 'materials' | 'visual'>('rows')
  const [materialTab, setMaterialTab] = useState<'all' | '底瓦' | '盖瓦' | '檐口瓦' | '脊瓦' | '配件'>('all')

  useEffect(() => {
    if (currentProject && !layoutResult) {
      const result = calculateTileLayout(currentProject.dimensions, currentProject.tileSpec)
      setLayoutResult(result)
    }
  }, [currentProject, layoutResult, setLayoutResult])

  if (!currentProject) {
    return (
      <>
        <div className="content-header"><h1 className="page-title">排瓦计算</h1></div>
        <div className="content-body">
          <div className="empty-state">
            <div className="empty-state-icon">🏠</div>
            <div className="empty-state-text">请先在「屋面录入」页面录入屋面信息</div>
            <button className="btn btn-primary mt-20" onClick={() => navigate('/roof-input')}>去录入</button>
          </div>
        </div>
      </>
    )
  }

  const result: TileLayoutResult = layoutResult || calculateTileLayout(currentProject.dimensions, currentProject.tileSpec)
  const { dimensions, tileSpec } = currentProject

  const filteredMaterials = materialTab === 'all'
    ? result.totalMaterials
    : result.totalMaterials.filter(m => m.category === materialTab)

  const handleCheckLeak = () => {
    setLeakResult(null)
    navigate('/leak-check')
  }

  const handleSaveArchive = async () => {
    const record: ArchiveRecord = {
      id: `arch-${Date.now()}`,
      projectId: currentProject.id,
      projectName: currentProject.projectName,
      roofName: currentProject.name,
      roofType: dimensions.roofType,
      createdAt: new Date().toISOString(),
      layoutResult: result,
      leakResult: null as any,
      dimensions,
      tileSpec,
      status: 'draft'
    }
    await saveArchive(record)
    alert('排瓦方案已归档至施工档案')
  }

  const handleExport = async () => {
    if (window.api?.exportData) {
      await window.api.exportData(
        `${currentProject.name}_排瓦方案.json`,
        JSON.stringify({ project: currentProject, layout: result }, null, 2)
      )
    } else {
      const blob = new Blob([JSON.stringify({ project: currentProject, layout: result }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentProject.name}_排瓦方案.json`
      a.click()
    }
  }

  return (
    <>
      <div className="content-header">
        <h1 className="page-title">
          排瓦计算 · {currentProject.name}
          <span className="text-muted" style={{ fontSize: 13, fontWeight: 400, marginLeft: 12 }}>
            {currentProject.projectName} · {dimensions.roofType}
          </span>
        </h1>
        <div className="flex gap-8">
          <button className="btn btn-secondary" onClick={handleExport}>导出方案</button>
          <button className="btn btn-secondary" onClick={handleSaveArchive}>归档方案</button>
          <button className="btn btn-primary" onClick={handleCheckLeak}>防漏校核 →</button>
        </div>
      </div>
      <div className="content-body">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">总排数（垄）</div>
            <div className="stat-value">{result.totalRows}<span className="stat-unit">排</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">底瓦用量</div>
            <div className="stat-value">{result.totalBottomTiles}<span className="stat-unit">块</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">盖瓦用量</div>
            <div className="stat-value">{result.totalTopTiles}<span className="stat-unit">块</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">
              最大偏差
              {result.maxDeviation > 10 && <span className="text-danger" style={{ marginLeft: 6 }}>⚠</span>}
            </div>
            <div className={`stat-value ${result.maxDeviation > 15 ? 'text-danger' : result.maxDeviation > 10 ? 'text-warning' : ''}`}>
              {result.maxDeviation}<span className="stat-unit">%</span>
            </div>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">平均头搭接</div>
            <div className="stat-value" style={{ fontSize: 20 }}>
              {result.averageHeadOverlap}<span className="stat-unit">mm</span>
              {result.averageHeadOverlap < tileSpec.headOverlap * 0.95 && (
                <span className="text-danger" style={{ fontSize: 12, marginLeft: 6 }}>低于标准</span>
              )}
            </div>
            <div className="text-muted" style={{ fontSize: 11 }}>
              标准：{tileSpec.headOverlap}mm
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">平均边搭接</div>
            <div className="stat-value" style={{ fontSize: 20 }}>
              {result.averageSideOverlap}<span className="stat-unit">mm</span>
              {result.averageSideOverlap < tileSpec.sideOverlap * 0.95 && (
                <span className="text-danger" style={{ fontSize: 12, marginLeft: 6 }}>低于标准</span>
              )}
            </div>
            <div className="text-muted" style={{ fontSize: 11 }}>
              标准：{tileSpec.sideOverlap}mm
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">檐口瓦件</div>
            <div className="stat-value" style={{ fontSize: 20 }}>
              勾头{result.eaveTiles.headTiles} · 滴水{result.eaveTiles.dripTiles}
            </div>
            <div className="text-muted" style={{ fontSize: 11 }}>
              托泥沟 {result.eaveTiles.gutters} 件
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">脊部瓦件</div>
            <div className="stat-value" style={{ fontSize: 20 }}>
              正脊{result.ridgeTiles.mainRidgeTiles}
            </div>
            <div className="text-muted" style={{ fontSize: 11 }}>
              垂脊{result.ridgeTiles.verticalRidgeTiles} · 戗脊{result.ridgeTiles.hipRidgeTiles}
            </div>
          </div>
        </div>

        {result.misalignedRows.length > 0 && (
          <div className="alert alert-warning">
            <span className="alert-icon">⚠️</span>
            <div className="alert-content">
              <strong>排瓦不均预警</strong>
              第 {result.misalignedRows.join('、')} 排存在偏差超过10%，可能导致瓦垄歪斜或搭接不足，建议调整排距或瓦片规格。
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-title">
            <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
              <div className={`tab-item ${activeTab === 'rows' ? 'active' : ''}`} onClick={() => setActiveTab('rows')}>
                逐排排瓦明细
              </div>
              <div className={`tab-item ${activeTab === 'materials' ? 'active' : ''}`} onClick={() => setActiveTab('materials')}>
                备料清单
              </div>
              <div className={`tab-item ${activeTab === 'visual' ? 'active' : ''}`} onClick={() => setActiveTab('visual')}>
                瓦垄排布图
              </div>
            </div>
          </div>

          {activeTab === 'rows' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>排号</th>
                    <th>位置</th>
                    <th>底瓦数</th>
                    <th>盖瓦数</th>
                    <th>头搭接(mm)</th>
                    <th>边搭接(mm)</th>
                    <th>外露长(mm)</th>
                    <th>偏差(%)</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map(row => {
                    const pos = row.rowIndex <= 3 ? '檐口' : row.rowIndex >= result.totalRows - 2 ? '脊部' : '中部'
                    const rowClass =
                      row.riskLevel === 'danger' ? 'danger-row' :
                      row.riskLevel === 'warning' ? 'warning-row' : ''
                    return (
                      <tr key={row.rowIndex} className={row.riskLevel === 'danger' ? 'highlight-danger' : row.riskLevel === 'warning' ? 'highlight-warning' : ''}>
                        <td className={rowClass}>第 {row.rowIndex} 排</td>
                        <td>{pos}</td>
                        <td>{row.bottomTileCount}</td>
                        <td>{row.topTileCount}</td>
                        <td className={rowClass}>{row.actualHeadOverlap}</td>
                        <td className={rowClass}>{row.actualSideOverlap}</td>
                        <td>{row.exposedLength}</td>
                        <td className={rowClass}>{row.deviation}%</td>
                        <td>
                          {row.riskLevel === 'danger' ? (
                            <span className="badge badge-danger">渗漏高风险</span>
                          ) : row.riskLevel === 'warning' ? (
                            <span className="badge badge-warning">需关注</span>
                          ) : (
                            <span className="badge badge-success">正常</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'materials' && (
            <div>
              <div className="mb-16 flex gap-8">
                {(['all', '底瓦', '盖瓦', '檐口瓦', '脊瓦', '配件'] as const).map(t => (
                  <button
                    key={t}
                    className={`btn btn-sm ${materialTab === t ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setMaterialTab(t)}
                  >
                    {t === 'all' ? '全部' : t}
                  </button>
                ))}
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>类别</th>
                    <th>材料名称</th>
                    <th>规格</th>
                    <th>理论数量</th>
                    <th>损耗率</th>
                    <th>备料数量</th>
                    <th>单位</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((m, i) => (
                    <tr key={i}>
                      <td>
                        <span className={`badge ${
                          m.category === '底瓦' || m.category === '盖瓦' ? 'badge-info' :
                          m.category === '檐口瓦' ? 'badge-success' :
                          m.category === '脊瓦' ? 'badge-warning' : 'badge-info'
                        }`}>{m.category}</span>
                      </td>
                      <td className="fw-600">{m.name}</td>
                      <td className="text-muted">{m.specification}</td>
                      <td>{m.quantity}</td>
                      <td>{(m.lossRate * 100).toFixed(0)}%</td>
                      <td className="text-accent fw-700">{m.finalQuantity}</td>
                      <td>{m.unit}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-primary)' }}>
                      备料总计（含损耗）
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 16 }}>
                      {filteredMaterials.reduce((s, m) => s + m.finalQuantity, 0)}
                    </td>
                    <td className="text-muted">件</td>
                  </tr>
                </tfoot>
              </table>

              <div className="alert alert-info mt-20">
                <span className="alert-icon">📦</span>
                <div className="alert-content">
                  <strong>备料说明</strong>
                  底瓦、盖瓦按 5% 损耗，檐口瓦件按 6% 损耗，脊部瓦件按 8% 损耗计算。实际采购需根据现场情况和材料质量适当调整。
                </div>
              </div>
            </div>
          )}

          {activeTab === 'visual' && (
            <div>
              <RoofVisual result={result} dims={dimensions} />
              <div className="alert alert-info mt-20">
                <span className="alert-icon">📐</span>
                <div className="alert-content">
                  <strong>图例说明</strong>
                  <span style={{ display: 'inline-block', width: 14, height: 14, background: 'rgba(75,191,115,0.4)', border: '1px solid var(--success)', marginLeft: 8 }} /> 正常瓦垄
                  <span style={{ display: 'inline-block', width: 14, height: 14, background: 'rgba(240,160,64,0.4)', border: '1px solid var(--warning)', marginLeft: 16 }} /> 偏差警告
                  <span style={{ display: 'inline-block', width: 14, height: 14, background: 'rgba(232,83,79,0.4)', border: '1px solid var(--danger)', marginLeft: 16 }} /> 渗漏高风险
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function RoofVisual({ result, dims }: { result: TileLayoutResult; dims: any }) {
  const { totalRows } = result
  const rows = result.rows
  const maxCols = Math.max(...rows.map(r => r.bottomTileCount))
  const cellW = Math.min(36, 900 / maxCols)
  const cellH = 22
  const padX = 30
  const padY = 40
  const svgW = maxCols * cellW + padX * 2
  const svgH = totalRows * cellH + padY * 2 + 60

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', minWidth: 800 }}>
        <defs>
          <linearGradient id="eaveGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4da8da" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4da8da" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ridgeGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#c9a962" stopOpacity="0" />
            <stop offset="100%" stopColor="#c9a962" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        <text x={svgW / 2} y={18} textAnchor="middle" fill="#c9a962" fontSize="12" fontWeight="600">
          正脊（{dims.ridgeLength}mm）
        </text>
        <rect x={padX} y={padY - 6} width={maxCols * cellW} height={6} fill="#c9a962" />

        {rows.map((row, ri) => {
          const cols = row.bottomTileCount
          const offsetX = (maxCols - cols) * cellW / 2
          const y = padY + ri * cellH
          const color =
            row.riskLevel === 'danger' ? 'rgba(232,83,79,0.35)' :
            row.riskLevel === 'warning' ? 'rgba(240,160,64,0.35)' :
            'rgba(75,191,115,0.25)'
          const borderColor =
            row.riskLevel === 'danger' ? '#e8534f' :
            row.riskLevel === 'warning' ? '#f0a040' :
            '#4bbf73'

          return (
            <g key={ri}>
              {ri < 3 && (
                <rect x={padX - 4} y={y} width={maxCols * cellW + 8} height={cellH} fill="url(#eaveGrad)" />
              )}
              {ri >= totalRows - 2 && (
                <rect x={padX - 4} y={y} width={maxCols * cellW + 8} height={cellH} fill="url(#ridgeGrad)" />
              )}
              {Array.from({ length: cols }).map((_, ci) => (
                <rect
                  key={ci}
                  x={padX + offsetX + ci * cellW + 1}
                  y={y + 2}
                  width={cellW - 2}
                  height={cellH - 4}
                  fill={color}
                  stroke={borderColor}
                  strokeWidth={0.8}
                  rx={2}
                />
              ))}
              <text x={padX - 8} y={y + cellH / 2 + 4} textAnchor="end" fill="#9ba3b8" fontSize="10">
                {row.rowIndex}
              </text>
              <text x={padX + maxCols * cellW + 8} y={y + cellH / 2 + 4} fill="#9ba3b8" fontSize="10">
                {cols}块
              </text>
            </g>
          )
        })}

        <rect x={padX} y={padY + totalRows * cellH} width={maxCols * cellW} height={4} fill="#4da8da" />
        <text x={svgW / 2} y={padY + totalRows * cellH + 22} textAnchor="middle" fill="#4da8da" fontSize="12" fontWeight="600">
          檐口（{dims.eaveWidth}mm · 出檐{dims.eaveOverhang}mm）
        </text>

        <text x={10} y={padY + 3} fill="#9ba3b8" fontSize="10">排号</text>
        <text x={padX + maxCols * cellW + 60} y={padY + 3} fill="#9ba3b8" fontSize="10">底瓦数</text>
      </svg>
    </div>
  )
}
