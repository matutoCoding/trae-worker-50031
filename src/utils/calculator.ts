import {
  RoofDimensions,
  TileSpec,
  TileLayoutResult,
  TileRowResult,
  LeakCheckResult,
  LeakPoint,
  DrainageAnalysis,
  StormResult,
  MaterialItem
} from '../types'

function safeNum(v: number, fallback: number, min = 0.001): number {
  if (v == null || isNaN(v) || !isFinite(v)) return fallback
  return Math.max(min, v)
}

function seededNoise(seed: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return s - Math.floor(s)
}

export function validateInputs(dimensions: RoofDimensions, tileSpec: TileSpec): string[] {
  const errors: string[] = []

  if (!dimensions.slopeLength || dimensions.slopeLength <= 0) {
    errors.push('坡长必须大于 0')
  } else if (dimensions.slopeLength < 500) {
    errors.push('坡长过短（< 500mm），请检查数值')
  } else if (dimensions.slopeLength > 50000) {
    errors.push('坡长过长（> 50m），请检查数值')
  }

  if (!dimensions.eaveWidth || dimensions.eaveWidth <= 0) {
    errors.push('檐口宽度必须大于 0')
  } else if (dimensions.eaveWidth < 500) {
    errors.push('檐口宽度过小（< 500mm），请检查数值')
  } else if (dimensions.eaveWidth > 100000) {
    errors.push('檐口宽度过大（> 100m），请检查数值')
  }

  if (!dimensions.slopeAngle || dimensions.slopeAngle <= 0) {
    errors.push('屋面坡度必须大于 0')
  } else if (dimensions.slopeAngle < 1) {
    errors.push('屋面坡度过小（< 1°），排水会失效')
  } else if (dimensions.slopeAngle > 85) {
    errors.push('屋面坡度过大（> 85°），请检查数值')
  }

  if (!tileSpec.bottomTileLength || tileSpec.bottomTileLength <= 0) {
    errors.push('底瓦长度必须大于 0')
  }
  if (!tileSpec.bottomTileWidth || tileSpec.bottomTileWidth <= 0) {
    errors.push('底瓦宽度必须大于 0')
  }
  if (!tileSpec.topTileLength || tileSpec.topTileLength <= 0) {
    errors.push('盖瓦长度必须大于 0')
  }
  if (!tileSpec.topTileWidth || tileSpec.topTileWidth <= 0) {
    errors.push('盖瓦宽度必须大于 0')
  }

  if (!tileSpec.exposedRatio || tileSpec.exposedRatio <= 0) {
    errors.push('外露比例必须大于 0')
  } else if (tileSpec.exposedRatio >= 0.9) {
    errors.push('外露比例过大（≥ 0.9），瓦片几乎没有搭接')
  }

  if (!tileSpec.headOverlap || tileSpec.headOverlap <= 0) {
    errors.push('头搭接必须大于 0')
  } else if (tileSpec.headOverlap >= tileSpec.bottomTileLength) {
    errors.push('头搭接不能大于等于底瓦长度')
  }

  if (!tileSpec.sideOverlap || tileSpec.sideOverlap <= 0) {
    errors.push('边搭接必须大于 0')
  } else if (tileSpec.sideOverlap >= tileSpec.bottomTileWidth) {
    errors.push('边搭接不能大于等于底瓦宽度')
  }

  return errors
}

export function calculateTileLayout(
  dimensions: RoofDimensions,
  tileSpec: TileSpec
): TileLayoutResult {
  const slopeLength = safeNum(dimensions.slopeLength, 3000, 10)
  const eaveWidth = safeNum(dimensions.eaveWidth, 5000, 10)
  const { roofType, ridgeLength, ridgeHeight } = dimensions
  const {
    bottomTileLength: rawBTL,
    bottomTileWidth: rawBTW,
    topTileLength: rawTTL,
    topTileWidth: rawTTW,
    headOverlap: baseHeadOverlap,
    sideOverlap: baseSideOverlap,
    exposedRatio: rawER
  } = tileSpec

  const bottomTileLength = safeNum(rawBTL, 320, 10)
  const bottomTileWidth = safeNum(rawBTW, 220, 10)
  const topTileLength = safeNum(rawTTL, 300, 10)
  const topTileWidth = safeNum(rawTTW, 130, 10)
  const exposedRatio = Math.min(0.85, Math.max(0.05, rawER || 0.3))

  const effectiveExposedLength = bottomTileLength * exposedRatio
  const effectiveBottomWidth = Math.max(1, bottomTileWidth - Math.max(0, baseSideOverlap || 0))
  const effectiveTopWidth = Math.max(1, topTileWidth - Math.max(0, baseSideOverlap || 0))

  let totalRows = Math.ceil(slopeLength / effectiveExposedLength)
  totalRows = Math.max(1, Math.min(5000, totalRows))

  const actualHeadOverlap = bottomTileLength - slopeLength / totalRows
  const headDeviation = baseHeadOverlap
    ? Math.abs(actualHeadOverlap - baseHeadOverlap) / baseHeadOverlap
    : 0

  let colsPerRow = Math.ceil(eaveWidth / effectiveBottomWidth)
  colsPerRow = Math.max(1, Math.min(5000, colsPerRow))
  const actualSideOverlap = bottomTileWidth - eaveWidth / colsPerRow
  const sideDeviation = baseSideOverlap
    ? Math.abs(actualSideOverlap - baseSideOverlap) / baseSideOverlap
    : 0

  const rows: TileRowResult[] = []
  let totalBottomTiles = 0
  let totalTopTiles = 0

  for (let i = 0; i < totalRows; i++) {
    const isEdge = i === 0 || i === totalRows - 1
    const rowDeviation = headDeviation + (isEdge ? 0.02 : 0)
    const riskLevel: 'normal' | 'warning' | 'danger' =
      rowDeviation > 0.2 ? 'danger' : rowDeviation > 0.1 ? 'warning' : 'normal'

    const hasLeakRisk = rowDeviation > 0.15

    const bottomCount = colsPerRow + (isEdge ? 1 : 0)
    const topCount = colsPerRow

    totalBottomTiles += bottomCount
    totalTopTiles += topCount

    rows.push({
      rowIndex: i + 1,
      bottomTileCount: bottomCount,
      topTileCount: topCount,
      actualHeadOverlap: Number(actualHeadOverlap.toFixed(2)),
      actualSideOverlap: Number(actualSideOverlap.toFixed(2)),
      exposedLength: Number(effectiveExposedLength.toFixed(2)),
      isAdjusted: rowDeviation > 0.05,
      deviation: Number((rowDeviation * 100).toFixed(2)),
      hasLeakRisk,
      riskLevel
    })
  }

  const misalignedRows = rows.filter(r => r.riskLevel !== 'normal').map(r => r.rowIndex)

  const dripTiles = colsPerRow + 2
  const headTiles = colsPerRow
  const gutters = Math.max(0, colsPerRow - 1)

  const safeTopLen = Math.max(1, topTileLength)
  const mainRidgeTiles = Math.max(0, Math.ceil((ridgeLength || 0) / (safeTopLen * 0.7)))

  let verticalRidgeTiles = 0
  let hipRidgeTiles = 0
  const ridgeH = Math.max(0, ridgeHeight || 0)
  if (roofType === '歇山' || roofType === '庑殿') {
    hipRidgeTiles = Math.ceil(slopeLength / (safeTopLen * 0.6)) * 2
    verticalRidgeTiles = Math.ceil(ridgeH / (safeTopLen * 0.5)) * 2
  } else if (roofType === '硬山' || roofType === '悬山') {
    verticalRidgeTiles = Math.ceil(ridgeH / (safeTopLen * 0.5)) * 2
  } else if (roofType === '攒尖') {
    verticalRidgeTiles = Math.ceil(slopeLength / (safeTopLen * 0.6)) * 4
  }

  const totalMaterials: MaterialItem[] = buildMaterialList(
    tileSpec,
    totalBottomTiles,
    totalTopTiles,
    dripTiles,
    headTiles,
    gutters,
    mainRidgeTiles,
    verticalRidgeTiles,
    hipRidgeTiles
  )

  return {
    totalRows,
    totalBottomTiles,
    totalTopTiles,
    rows,
    averageHeadOverlap: Number(actualHeadOverlap.toFixed(2)),
    averageSideOverlap: Number(actualSideOverlap.toFixed(2)),
    maxDeviation: Number((Math.max(headDeviation, sideDeviation) * 100).toFixed(2)),
    misalignedRows,
    eaveTiles: { gutters, dripTiles, headTiles },
    ridgeTiles: { mainRidgeTiles, verticalRidgeTiles, hipRidgeTiles },
    totalMaterials
  }
}

function buildMaterialList(
  tileSpec: TileSpec,
  bottomTiles: number,
  topTiles: number,
  dripTiles: number,
  headTiles: number,
  gutters: number,
  mainRidge: number,
  verticalRidge: number,
  hipRidge: number
): MaterialItem[] {
  const standardLoss = 0.05
  const ridgeLoss = 0.08
  const eaveLoss = 0.06

  const btl = tileSpec.bottomTileLength || 0
  const btw = tileSpec.bottomTileWidth || 0
  const ttl = tileSpec.topTileLength || 0
  const ttw = tileSpec.topTileWidth || 0

  const items: MaterialItem[] = [
    {
      name: '底瓦',
      specification: `${btl}×${btw}mm`,
      quantity: bottomTiles,
      unit: '块',
      lossRate: standardLoss,
      finalQuantity: Math.ceil(bottomTiles * (1 + standardLoss)),
      category: '底瓦'
    },
    {
      name: '盖瓦',
      specification: `${ttl}×${ttw}mm`,
      quantity: topTiles,
      unit: '块',
      lossRate: standardLoss,
      finalQuantity: Math.ceil(topTiles * (1 + standardLoss)),
      category: '盖瓦'
    },
    {
      name: '滴水瓦',
      specification: '檐口专用',
      quantity: dripTiles,
      unit: '块',
      lossRate: eaveLoss,
      finalQuantity: Math.ceil(dripTiles * (1 + eaveLoss)),
      category: '檐口瓦'
    },
    {
      name: '勾头瓦',
      specification: '檐口专用',
      quantity: headTiles,
      unit: '块',
      lossRate: eaveLoss,
      finalQuantity: Math.ceil(headTiles * (1 + eaveLoss)),
      category: '檐口瓦'
    },
    {
      name: '瓦当',
      specification: '配套',
      quantity: headTiles,
      unit: '件',
      lossRate: 0.02,
      finalQuantity: Math.ceil(headTiles * 1.02),
      category: '配件'
    }
  ]

  if (gutters > 0) {
    items.push({
      name: '托泥沟',
      specification: '檐沟专用',
      quantity: gutters,
      unit: '件',
      lossRate: 0.03,
      finalQuantity: Math.ceil(gutters * 1.03),
      category: '檐口瓦'
    })
  }

  if (mainRidge > 0) {
    items.push({
      name: '正脊筒瓦',
      specification: '脊部专用',
      quantity: mainRidge,
      unit: '块',
      lossRate: ridgeLoss,
      finalQuantity: Math.ceil(mainRidge * (1 + ridgeLoss)),
      category: '脊瓦'
    })
    items.push({
      name: '正吻/吞脊兽',
      specification: '正脊两端',
      quantity: 2,
      unit: '件',
      lossRate: 0,
      finalQuantity: 2,
      category: '脊瓦'
    })
  }

  if (verticalRidge > 0) {
    items.push({
      name: '垂脊筒瓦',
      specification: '垂脊专用',
      quantity: verticalRidge,
      unit: '块',
      lossRate: ridgeLoss,
      finalQuantity: Math.ceil(verticalRidge * (1 + ridgeLoss)),
      category: '脊瓦'
    })
    items.push({
      name: '垂兽',
      specification: '垂脊下端',
      quantity: Math.ceil(verticalRidge / 10),
      unit: '件',
      lossRate: 0,
      finalQuantity: Math.ceil(verticalRidge / 10),
      category: '脊瓦'
    })
  }

  if (hipRidge > 0) {
    items.push({
      name: '戗脊筒瓦',
      specification: '戗脊专用',
      quantity: hipRidge,
      unit: '块',
      lossRate: ridgeLoss,
      finalQuantity: Math.ceil(hipRidge * (1 + ridgeLoss)),
      category: '脊瓦'
    })
    items.push({
      name: '戗兽',
      specification: '戗脊下端',
      quantity: Math.ceil(hipRidge / 10),
      unit: '件',
      lossRate: 0,
      finalQuantity: Math.ceil(hipRidge / 10),
      category: '脊瓦'
    })
  }

  items.push({
    name: '灰背/泥背',
    specification: '铺垫层',
    quantity: Math.ceil(bottomTiles * 0.5),
    unit: 'kg',
    lossRate: 0.1,
    finalQuantity: Math.ceil(bottomTiles * 0.5 * 1.1),
    category: '配件'
  })

  return items
}

export function performLeakCheck(
  dimensions: RoofDimensions,
  tileSpec: TileSpec,
  layoutResult: TileLayoutResult
): LeakCheckResult {
  const slopeAngle = safeNum(dimensions.slopeAngle, 26.5, 0.1)
  const { headOverlap: requiredHeadOverlap = 70, sideOverlap: requiredSideOverlap = 50 } = tileSpec

  const headOverlaps = layoutResult.rows.map(r => r.actualHeadOverlap).filter(v => isFinite(v))
  const sideOverlaps = layoutResult.rows.map(r => r.actualSideOverlap).filter(v => isFinite(v))
  const minHeadOverlap = headOverlaps.length > 0 ? Math.min(...headOverlaps) : 0
  const minSideOverlap = sideOverlaps.length > 0 ? Math.min(...sideOverlaps) : 0

  const overlapSufficient =
    minHeadOverlap >= requiredHeadOverlap * 0.9 &&
    minSideOverlap >= requiredSideOverlap * 0.9

  const leakPoints: LeakPoint[] = []
  const warnings: string[] = []
  const risks: string[] = []

  layoutResult.rows.forEach(row => {
    if (requiredHeadOverlap > 0 && row.actualHeadOverlap < requiredHeadOverlap * 0.85) {
      leakPoints.push({
        rowIndex: row.rowIndex,
        position: row.rowIndex <= 3 ? '檐口' : row.rowIndex >= layoutResult.totalRows - 2 ? '脊部' : '中部',
        type: '搭接不足',
        severity: 'danger',
        description: `第${row.rowIndex}排头搭接${row.actualHeadOverlap}mm，低于要求值${requiredHeadOverlap}mm的85%`,
        recommendation: '调整排距，增加瓦片搭接长度或补充额外瓦片'
      })
    } else if (requiredHeadOverlap > 0 && row.actualHeadOverlap < requiredHeadOverlap * 0.95) {
      leakPoints.push({
        rowIndex: row.rowIndex,
        position: row.rowIndex <= 3 ? '檐口' : row.rowIndex >= layoutResult.totalRows - 2 ? '脊部' : '中部',
        type: '搭接不足',
        severity: 'warning',
        description: `第${row.rowIndex}排头搭接${row.actualHeadOverlap}mm，略低于要求值`,
        recommendation: '施工时注意对齐，确保实际搭接不小于计算值'
      })
    }

    if (row.deviation > 15) {
      leakPoints.push({
        rowIndex: row.rowIndex,
        position: '瓦垄间',
        type: '瓦垄歪斜',
        severity: 'danger',
        description: `第${row.rowIndex}排偏差${row.deviation}%，瓦垄可能歪斜`,
        recommendation: '重新放线定位，必要时调整瓦片规格'
      })
    }
  })

  if (slopeAngle < 20) {
    leakPoints.push({
      rowIndex: -1,
      position: '中部',
      type: '坡度不足',
      severity: slopeAngle < 15 ? 'danger' : 'warning',
      description: `屋面坡度${slopeAngle}°，排水能力不足`,
      recommendation: slopeAngle < 15 ? '建议增加坡度或采用防水垫层' : '加强防水层，增加搭接长度'
    })
    risks.push(`屋面坡度仅${slopeAngle}°，属于低坡度屋面，积水风险高`)
  }

  if (layoutResult.misalignedRows.length > 0) {
    warnings.push(`${layoutResult.misalignedRows.length}排存在排瓦不均，需重点监控`)
  }

  if (!overlapSufficient) {
    risks.push('存在搭接不足问题，暴雨工况下渗漏风险高')
  }

  const drainage = analyzeDrainage(dimensions, tileSpec, layoutResult)

  if (drainage.drainageStatus === 'poor' || drainage.drainageStatus === 'critical') {
    risks.push('排水能力不足，建议增设排水设施或优化坡度')
  }

  const hasDanger = leakPoints.some(p => p.severity === 'danger')
  const hasWarning = leakPoints.some(p => p.severity === 'warning')
  let overallStatus: 'safe' | 'warning' | 'danger' = 'safe'
  if (hasDanger) overallStatus = 'danger'
  else if (hasWarning) overallStatus = 'warning'

  return {
    overallStatus,
    overlapSufficient,
    minHeadOverlap: Number(minHeadOverlap.toFixed(2)),
    requiredHeadOverlap,
    slopeDrainageCapacity: Number(drainage.flowRate.toFixed(2)),
    maxRainfall: Number(drainage.maxRainIntensity.toFixed(2)),
    leakPoints,
    drainageAnalysis: drainage,
    warnings,
    risks
  }
}

function analyzeDrainage(
  dimensions: RoofDimensions,
  tileSpec: TileSpec,
  layoutResult: TileLayoutResult
): DrainageAnalysis {
  const slopeAngle = safeNum(dimensions.slopeAngle, 26.5, 0.1)
  const slopeLength = safeNum(dimensions.slopeLength, 3000, 1)
  const eaveWidth = safeNum(dimensions.eaveWidth, 5000, 1)
  const g = 9.81
  const frictionCoeff = 0.15

  const angleRad = (slopeAngle * Math.PI) / 180
  const sinAngle = Math.sin(angleRad)
  const cosAngle = Math.cos(angleRad)

  const denom = 1 + frictionCoeff / Math.max(0.001, cosAngle)
  const flowVelocity = Math.sqrt((2 * g * slopeLength * sinAngle) / denom) / 3
  const safeVel = isFinite(flowVelocity) ? flowVelocity : 0.5

  const wettedArea = eaveWidth * 0.02
  const flowRate = safeVel * wettedArea * 1000

  const retentionTime = slopeLength / Math.max(0.001, safeVel)
  const roofAreaM2 = (eaveWidth * slopeLength) / 1000000
  const maxRainIntensity = (flowRate / Math.max(0.001, roofAreaM2)) / 60

  let drainageStatus: 'excellent' | 'good' | 'normal' | 'poor' | 'critical'
  if (slopeAngle >= 40) drainageStatus = 'excellent'
  else if (slopeAngle >= 30) drainageStatus = 'good'
  else if (slopeAngle >= 22) drainageStatus = 'normal'
  else if (slopeAngle >= 15) drainageStatus = 'poor'
  else drainageStatus = 'critical'

  const stormSimulation = simulateStorm(
    dimensions,
    tileSpec,
    layoutResult,
    safeVel,
    flowRate
  )

  return {
    slopeAngle,
    flowVelocity: Number(safeVel.toFixed(3)),
    flowRate: Number(flowRate.toFixed(2)),
    retentionTime: Number(retentionTime.toFixed(2)),
    maxRainIntensity: Number(Math.max(0, maxRainIntensity).toFixed(1)),
    drainageStatus,
    stormSimulation
  }
}

function simulateStorm(
  dimensions: RoofDimensions,
  tileSpec: TileSpec,
  layoutResult: TileLayoutResult,
  baseVelocity: number,
  baseFlowRate: number
): StormResult {
  const rainfall = 100
  const duration = 60
  const slopeLength = safeNum(dimensions.slopeLength, 3000, 1)
  const eaveWidth = safeNum(dimensions.eaveWidth, 5000, 1)
  const slopeAngle = safeNum(dimensions.slopeAngle, 26.5, 0.1)

  const roofAreaM2 = (slopeLength * eaveWidth) / 1000000
  const totalRainfall = rainfall * roofAreaM2 * 1000

  const efficiencyFactor = layoutResult.overlapSufficient ? 0.95 : 0.72
  const slopeFactor = Math.min(1, Math.max(0.1, slopeAngle / 30))
  const actualDrainage = Math.max(0, baseFlowRate * duration * efficiencyFactor * slopeFactor)

  const leakedWater = Math.max(0, totalRainfall - actualDrainage)
  const leakRatio = totalRainfall > 0 ? (leakedWater / totalRainfall) * 100 : 0

  const standingWater: number[] = []
  const totalRows = layoutResult.rows.length

  for (let i = 0; i < totalRows; i++) {
    const row = layoutResult.rows[i]
    const ri = row.rowIndex

    const baseDepth = 0.5 + (1 - slopeFactor) * 4

    const rowFactor = row.hasLeakRisk ? 1.8 : 1.0
    const riskBonus = row.riskLevel === 'danger' ? 2.5 : row.riskLevel === 'warning' ? 1.0 : 0

    const eaveBonus = ri <= 3 ? (4 - ri) * 0.4 : 0
    const ridgeBonus = ri >= totalRows - 1 ? 0.8 : 0

    const noise = seededNoise(ri * 7.3 + totalRows * 0.1 + slopeAngle * 0.01) * 0.6

    let depth = (baseDepth + riskBonus + eaveBonus + ridgeBonus + noise) * rowFactor
    depth = Math.max(0.1, Math.min(12, depth))

    standingWater.push(Number(depth.toFixed(2)))
  }

  const criticalPoints: string[] = []
  if (slopeAngle < 20) {
    criticalPoints.push('屋面整体坡度不足，易大面积积水')
  }
  if (layoutResult.misalignedRows.length > 0) {
    criticalPoints.push(`第${layoutResult.misalignedRows.join('、')}排瓦垄歪斜处积水偏重`)
  }
  if (leakRatio > 5) {
    criticalPoints.push('檐口排水不及，短时暴雨可能倒灌')
  }
  criticalPoints.push('正脊与垂脊交接处需重点做防水加强层')
  if (!layoutResult.overlapSufficient) {
    criticalPoints.push('搭接量整体不足，建议增加一排瓦片以改善头搭接')
  }

  return {
    rainfall,
    duration,
    surfaceRunoff: Number(Math.floor(actualDrainage).toFixed(0)),
    leakedWater: Number(Math.floor(leakedWater).toFixed(0)),
    leakRatio: Number(leakRatio.toFixed(2)),
    standingWater,
    criticalPoints
  }
}
