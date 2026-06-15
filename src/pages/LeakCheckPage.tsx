import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { calculateTileLayout, performLeakCheck } from '../utils/calculator'
import { saveArchive } from '../utils/storage'
import { LeakCheckResult, TileLayoutResult, ArchiveRecord } from '../types'

export default function LeakCheckPage() {
  const navigate = useNavigate()
  const { currentProject, layoutResult, setLayoutResult, leakResult, setLeakResult } = useProject()

  useEffect(() => {
    if (currentProject) {
      const layout = layoutResult || calculateTileLayout(currentProject.dimensions, currentProject.tileSpec)
      if (!layoutResult) setLayoutResult(layout)
      if (!leakResult) {
        const leak = performLeakCheck(currentProject.dimensions, currentProject.tileSpec, layout)
        setLeakResult(leak)
      }
    }
  }, [currentProject])

  if (!currentProject) {
    return (
      <>
        <div className="content-header"><h1 className="page-title">防漏校核</h1></div>
        <div className="content-body">
          <div className="empty-state">
            <div className="empty-state-icon">🏠</div>
            <div className="empty-state-text">请先在「屋面录入」页面录入屋面信息</div>
          </div>
        </div>
      </>
    )
  }

  const result: LeakCheckResult = leakResult || performLeakCheck(
    currentProject.dimensions,
    currentProject.tileSpec,
    layoutResult || calculateTileLayout(currentProject.dimensions, currentProject.tileSpec)
  )
  const layout: TileLayoutResult = layoutResult || calculateTileLayout(currentProject.dimensions, currentProject.tileSpec)
  const { dimensions, tileSpec } = currentProject
  const { drainageAnalysis, stormSimulation } = result

  const overallBadge =
    result.overallStatus === 'danger' ? <span className="badge badge-danger">渗漏高风险</span> :
    result.overallStatus === 'warning' ? <span className="badge badge-warning">需整改</span> :
    <span className="badge badge-success">防漏合格</span>

  const drainageBadgeMap: Record<string, JSX.Element> = {
    excellent: <span className="badge badge-success">极佳</span>,
    good: <span className="badge badge-success">良好</span>,
    normal: <span className="badge badge-info">正常</span>,
    poor: <span className="badge badge-warning">较差</span>,
    critical: <span className="badge badge-danger">严重不足</span>
  }

  const handleArchiveFull = async () => {
    const record: ArchiveRecord = {
      id: `arch-${Date.now()}`,
      projectId: currentProject.id,
      projectName: currentProject.projectName,
      roofName: currentProject.name,
      roofType: dimensions.roofType,
      createdAt: new Date().toISOString(),
      layoutResult: layout,
      leakResult: result,
      dimensions,
      tileSpec,
      status: result.overallStatus === 'safe' ? 'approved' : 'draft'
    }
    await saveArchive(record)
    alert('完整方案（含防漏校核）已归档至施工档案')
  }

  return (
    <>
      <div className="content-header">
        <h1 className="page-title">
          防漏校核 · {currentProject.name}
          <span style={{ marginLeft: 16 }}>{overallBadge}</span>
        </h1>
        <div className="flex gap-8">
          <button className="btn btn-secondary" onClick={() => navigate('/tile-layout')}>← 返回排瓦</button>
          <button className="btn btn-primary" onClick={handleArchiveFull}>归档校核结果</button>
        </div>
      </div>

      <div className="content-body">
        {result.risks.length > 0 && (
          <div className="alert alert-danger">
            <span className="alert-icon">🚨</span>
            <div className="alert-content">
              <strong>风险预警</strong>
              <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                {result.risks.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>
        )}
        {result.warnings.length > 0 && result.risks.length === 0 && (
          <div className="alert alert-warning">
            <span className="alert-icon">⚠️</span>
            <div className="alert-content">
              <strong>注意事项</strong>
              <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>
        )}
        {result.overallStatus === 'safe' && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            <div className="alert-content">
              <strong>校核通过</strong>
              搭接量与排水能力满足规范要求，可按此方案施工。
            </div>
          </div>
        )}

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">最小头搭接</div>
            <div className={`stat-value ${result.minHeadOverlap < result.requiredHeadOverlap * 0.9 ? 'text-danger' : ''}`} style={{ fontSize: 22 }}>
              {result.minHeadOverlap}<span className="stat-unit">mm</span>
            </div>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
              要求 ≥ {result.requiredHeadOverlap}mm（标准值的90%）
            </div>
            <div className="water-flow-bar mt-12">
              <div
                className="water-flow-fill"
                style={{
                  width: `${Math.min(100, (result.minHeadOverlap / result.requiredHeadOverlap) * 100)}%`,
                  background: result.minHeadOverlap < result.requiredHeadOverlap * 0.9
                    ? 'linear-gradient(90deg,#e8534f,#f0a040)'
                    : 'linear-gradient(90deg,var(--info),var(--success))'
                }}
              />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">搭接是否合格</div>
            <div className="stat-value" style={{ fontSize: 28 }}>
              {result.overlapSufficient ? '✅' : '❌'}
              <span className="stat-unit" style={{ fontSize: 14, marginLeft: 8 }}>
                {result.overlapSufficient ? '合格' : '不合格'}
              </span>
            </div>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
              搭接量同时满足头搭和边搭的最低要求
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">排水能力评级</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {drainageBadgeMap[drainageAnalysis.drainageStatus]}
            </div>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
              坡度 {drainageAnalysis.slopeAngle}° · 流速 {drainageAnalysis.flowVelocity} m/s
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">可承受最大暴雨强度</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {drainageAnalysis.maxRainIntensity}<span className="stat-unit">mm/h</span>
            </div>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
              特大暴雨标准：>16 mm/h
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">渗漏点分布</div>
          {result.leakPoints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-text">未发现渗漏风险点</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>位置</th>
                    <th>类型</th>
                    <th>严重程度</th>
                    <th>问题描述</th>
                    <th>整改建议</th>
                  </tr>
                </thead>
                <tbody>
                  {result.leakPoints.map((p, i) => (
                    <tr key={i} className={p.severity === 'danger' ? 'highlight-danger' : p.severity === 'warning' ? 'highlight-warning' : ''}>
                      <td>
                        {p.rowIndex > 0 ? `第 ${p.rowIndex} 排 · ` : ''}{p.position}
                      </td>
                      <td>
                        <span className={`badge ${p.type === '搭接不足' ? 'badge-danger' : p.type === '瓦垄歪斜' ? 'badge-warning' : p.type === '坡度不足' ? 'badge-warning' : 'badge-info'}`}>
                          {p.type}
                        </span>
                      </td>
                      <td>
                        {p.severity === 'danger' ? (
                          <span className="badge badge-danger">🔴 高风险</span>
                        ) : (
                          <span className="badge badge-warning">🟡 中等</span>
                        )}
                      </td>
                      <td className={p.severity === 'danger' ? 'danger-row' : 'warning-row'}>{p.description}</td>
                      <td className="text-muted">{p.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.leakPoints.length > 0 && (
            <div className="mt-20">
              <div className="section-title">渗漏点屋面位置示意</div>
              <LeakMap layout={layout} leakPoints={result.leakPoints} />
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">排水能力分析</div>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-label">屋面坡度</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{drainageAnalysis.slopeAngle}°</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">排水流速</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{drainageAnalysis.flowVelocity}<span className="stat-unit">m/s</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-label">排水流量</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{drainageAnalysis.flowRate}<span className="stat-unit">L/s</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-label">雨水滞留时间</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{drainageAnalysis.retentionTime}<span className="stat-unit">s</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-label">最大暴雨强度</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{drainageAnalysis.maxRainIntensity}<span className="stat-unit">mm/h</span></div>
            </div>
          </div>

          <div className="section-title">坡度-防水关系说明</div>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div>
              <table className="data-table">
                <thead>
                  <tr><th>坡度范围</th><th>排水评级</th><th>防漏建议</th></tr>
                </thead>
                <tbody>
                  <tr><td>≥ 40°</td><td><span className="badge badge-success">极佳</span></td><td>无需额外措施</td></tr>
                  <tr><td>30° ~ 39°</td><td><span className="badge badge-success">良好</span></td><td>常规搭接即可</td></tr>
                  <tr><td>22° ~ 29°</td><td><span className="badge badge-info">正常</span></td><td>可适当增加搭接</td></tr>
                  <tr><td>15° ~ 21°</td><td><span className="badge badge-warning">较差</span></td><td>必须增加搭接+防水层</td></tr>
                  <tr><td>{'<'} 15°</td><td><span className="badge badge-danger">严重不足</span></td><td>需重做防水系统</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <div className="alert alert-info">
                <span className="alert-icon">📖</span>
                <div className="alert-content">
                  <strong>传统举架制度</strong>
                  <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                    <li>五举（5/10）：≈ 26.6°，最常见民居</li>
                    <li>六举（6/10）：≈ 31°，普通殿堂</li>
                    <li>七五举（7.5/10）：≈ 37°，高等级殿堂</li>
                    <li>九举（9/10）：≈ 42°，塔楼等陡峻屋面</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">暴雨工况模拟（100mm/h，持续60分钟）</div>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat-card">
              <div className="stat-label">累计降雨量</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{stormSimulation.rainfall}<span className="stat-unit">mm</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-label">排出水量</div>
              <div className="stat-value text-success" style={{ fontSize: 20 }}>{stormSimulation.surfaceRunoff}<span className="stat-unit">L</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-label">渗漏水量</div>
              <div className={`stat-value ${stormSimulation.leakRatio > 5 ? 'text-danger' : 'text-warning'}`} style={{ fontSize: 20 }}>
                {stormSimulation.leakedWater}<span className="stat-unit">L</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">渗漏率</div>
              <div className={`stat-value ${stormSimulation.leakRatio > 5 ? 'text-danger' : stormSimulation.leakRatio > 1 ? 'text-warning' : 'text-success'}`} style={{ fontSize: 20 }}>
                {stormSimulation.leakRatio}<span className="stat-unit">%</span>
              </div>
            </div>
          </div>

          <div className="section-title">各排积水深度分布 (mm)</div>
          <StandingWaterChart data={stormSimulation.standingWater} />

          {stormSimulation.criticalPoints.length > 0 && (
            <>
              <div className="section-title">暴雨工况下的薄弱环节</div>
              <div className="alert alert-warning">
                <span className="alert-icon">⚠️</span>
                <div className="alert-content">
                  <ul style={{ paddingLeft: 18 }}>
                    {stormSimulation.criticalPoints.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function LeakMap({ layout, leakPoints }: { layout: TileLayoutResult; leakPoints: any[] }) {
  const rows = layout.rows
  const maxCols = Math.max(...rows.map(r => r.bottomTileCount))
  const cellW = Math.min(36, 800 / maxCols)
  const cellH = 22
  const padX = 40
  const padY = 30
  const svgW = maxCols * cellW + padX * 2
  const svgH = rows.length * cellH + padY * 2

  const rowLeakMap: Record<number, any[]> = {}
  leakPoints.forEach(p => {
    if (p.rowIndex > 0) {
      if (!rowLeakMap[p.rowIndex]) rowLeakMap[p.rowIndex] = []
      rowLeakMap[p.rowIndex].push(p)
    }
  })

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', minWidth: 700 }}>
        <rect x={padX} y={padY - 4} width={maxCols * cellW} height={3} fill="#c9a962" />
        <text x={svgW / 2} y={padY - 10} textAnchor="middle" fill="#c9a962" fontSize="10">正脊</text>

        {rows.map((row, ri) => {
          const cols = row.bottomTileCount
          const offsetX = (maxCols - cols) * cellW / 2
          const y = padY + ri * cellH
          const leaks = rowLeakMap[row.rowIndex] || []
          const hasDanger = leaks.some(l => l.severity === 'danger')
          const hasWarn = leaks.some(l => l.severity === 'warning')
          const color = hasDanger ? 'rgba(232,83,79,0.5)' : hasWarn ? 'rgba(240,160,64,0.45)' : 'rgba(155,163,184,0.15)'
          const border = hasDanger ? '#e8534f' : hasWarn ? '#f0a040' : '#3d4560'
          return (
            <g key={ri}>
              {Array.from({ length: cols }).map((_, ci) => (
                <rect
                  key={ci}
                  x={padX + offsetX + ci * cellW + 1}
                  y={y + 2}
                  width={cellW - 2}
                  height={cellH - 4}
                  fill={color}
                  stroke={border}
                  strokeWidth={hasDanger || hasWarn ? 1.2 : 0.5}
                  rx={1}
                />
              ))}
              <text x={padX - 6} y={y + cellH / 2 + 4} textAnchor="end" fill="#9ba3b8" fontSize="9">
                {row.rowIndex}
              </text>
              {leaks.length > 0 && (
                <>
                  <circle cx={padX + offsetX + cols * cellW + 14} cy={y + cellH / 2} r={5}
                    fill={hasDanger ? '#e8534f' : '#f0a040'} />
                  <text x={padX + offsetX + cols * cellW + 24} y={y + cellH / 2 + 4}
                    fill={hasDanger ? '#e8534f' : '#f0a040'} fontSize="10">
                    {leaks.map(l => l.type).join('，')}
                  </text>
                </>
              )}
            </g>
          )
        })}

        <rect x={padX} y={padY + rows.length * cellH} width={maxCols * cellW} height={3} fill="#4da8da" />
        <text x={svgW / 2} y={padY + rows.length * cellH + 16} textAnchor="middle" fill="#4da8da" fontSize="10">檐口</text>
      </svg>
    </div>
  )
}

function StandingWaterChart({ data }: { data: number[] }) {
  const maxV = Math.max(...data, 2)
  const barW = Math.max(10, 600 / data.length)
  const chartH = 140
  const pad = 30
  const svgW = data.length * barW + pad * 2

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${svgW} ${chartH + pad}`} style={{ width: '100%', minWidth: 600 }}>
        <line x1={pad} y1={chartH} x2={svgW - pad} y2={chartH} stroke="#3d4560" />
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <g key={t}>
            <line x1={pad} y1={chartH - t * chartH} x2={svgW - pad} y2={chartH - t * chartH}
              stroke="#3d4560" strokeDasharray="2 3" opacity={0.5} />
            <text x={pad - 4} y={chartH - t * chartH + 4} textAnchor="end" fill="#6b7390" fontSize="9">
              {(maxV * t).toFixed(1)}
            </text>
          </g>
        ))}
        {data.map((v, i) => {
          const h = (v / maxV) * chartH
          const color = v > 5 ? '#e8534f' : v > 2 ? '#f0a040' : '#4bbf73'
          return (
            <g key={i}>
              <rect
                x={pad + i * barW + 1}
                y={chartH - h}
                width={barW - 2}
                height={h}
                fill={color}
                opacity={0.75}
                rx={1}
              />
              {i % Math.ceil(data.length / 20) === 0 && (
                <text x={pad + i * barW + barW / 2} y={chartH + 14} textAnchor="middle" fill="#9ba3b8" fontSize="9">
                  {i + 1}
                </text>
              )}
            </g>
          )
        })}
        <text x={svgW / 2} y={chartH + pad} textAnchor="middle" fill="#9ba3b8" fontSize="10">瓦垄排号</text>
      </svg>
    </div>
  )
}
