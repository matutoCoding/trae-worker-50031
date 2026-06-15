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

export function calculateTileLayout(
  dimensions: RoofDimensions,
  tileSpec: TileSpec
): TileLayoutResult {
  const { slopeLength, eaveWidth, roofType, eaveOverhang, ridgeLength } = dimensions
  const {
    bottomTileLength,
    bottomTileWidth,
    topTileLength,
    topTileWidth,
    headOverlap: baseHeadOverlap,
    sideOverlap: baseSideOverlap,
    exposedRatio
  } = tileSpec

  const effectiveExposedLength = bottomTileLength * exposedRatio
  const effectiveBottomWidth = bottomTileWidth - baseSideOverlap
  const effectiveTopWidth = topTileWidth - baseSideOverlap

  const totalRows = Math.ceil(slopeLength / effectiveExposedLength)

  const actualHeadOverlap = bottomTileLength - slopeLength / totalRows
  const headDeviation = Math.abs(actualHeadOverlap - baseHeadOverlap) / baseHeadOverlap

  const colsPerRow = Math.ceil(eaveWidth / effectiveBottomWidth)
  const actualSideOverlap = bottomTileWidth - eaveWidth / colsPerRow
  const sideDeviation = Math.abs(actualSideOverlap - baseSideOverlap) / baseSideOverlap

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
  const gutters = colsPerRow - 1

  const mainRidgeTiles = Math.ceil(ridgeLength / (topTileLength * 0.7))

  let verticalRidgeTiles = 0
  let hipRidgeTiles = 0
  if (roofType === '歇山' || roofType === '庑殿') {
    hipRidgeTiles = Math.ceil(slopeLength / (topTileLength * 0.6)) * 2
    verticalRidgeTiles = Math.ceil(dimensions.ridgeHeight / (topTileLength * 0.5)) * 2
  } else if (roofType === '硬山' || roofType === '悬山') {
    verticalRidgeTiles = Math.ceil(dimensions.ridgeHeight / (topTileLength * 0.5)) * 2
  } else if (roofType === '攒尖') {
    verticalRidgeTiles = Math.ceil(slopeLength / (topTileLength * 0.6)) * 4
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

  const items: MaterialItem[] = [
    {
      name: '底瓦',
      specification: `${tileSpec.bottomTileLength}×${tileSpec.bottomTileWidth}mm`,
      quantity: bottomTiles,
      unit: '块',
      lossRate: standardLoss,
      finalQuantity: Math.ceil(bottomTiles * (1 + standardLoss)),
      category: '底瓦'
    },
    {
      name: '盖瓦',
      specification: `${tileSpec.topTileLength}×${tileSpec.topTileWidth}mm`,
      quantity: topTiles,
      unit: '块',
      lossRate: standardLoss,
      finalQuantity: Math.ceil(topTiles * (1 + standardLoss)),
      category: '盖瓦'
    },
    {
      name: '滴水瓦',
      specification: `檐口专用`,
      quantity: dripTiles,
      unit: '块',
      lossRate: eaveLoss,
      finalQuantity: Math.ceil(dripTiles * (1 + eaveLoss)),
      category: '檐口瓦'
    },
    {
      name: '勾头瓦',
      specification: `檐口专用`,
      quantity: headTiles,
      unit: '块',
      lossRate: eaveLoss,
      finalQuantity: Math.ceil(headTiles * (1 + eaveLoss)),
      category: '檐口瓦'
    },
    {
      name: '瓦当',
      specification: `配套`,
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
      specification: `檐沟专用`,
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
      specification: `脊部专用`,
      quantity: mainRidge,
      unit: '块',
      lossRate: ridgeLoss,
      finalQuantity: Math.ceil(mainRidge * (1 + ridgeLoss)),
      category: '脊瓦'
    })
    items.push({
      name: '正吻/吞脊兽',
      specification: `正脊两端`,
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
      specification: `垂脊专用`,
      quantity: verticalRidge,
      unit: '块',
      lossRate: ridgeLoss,
      finalQuantity: Math.ceil(verticalRidge * (1 + ridgeLoss)),
      category: '脊瓦'
    })
    items.push({
      name: '垂兽',
      specification: `垂脊下端`,
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
      specification: `戗脊专用`,
      quantity: hipRidge,
      unit: '块',
      lossRate: ridgeLoss,
      finalQuantity: Math.ceil(hipRidge * (1 + ridgeLoss)),
      category: '脊瓦'
    })
    items.push({
      name: '戗兽',
      specification: `戗脊下端`,
      quantity: Math.ceil(hipRidge / 10),
      unit: '件',
      lossRate: 0,
      finalQuantity: Math.ceil(hipRidge / 10),
      category: '脊瓦'
    })
  }

  items.push({
    name: '灰背/泥背',
    specification: `铺垫层`,
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
  const { slopeAngle, slopeLength } = dimensions
  const { headOverlap: requiredHeadOverlap, sideOverlap: requiredSideOverlap } = tileSpec

  const minHeadOverlap = Math.min(...layoutResult.rows.map(r => r.actualHeadOverlap))
  const minSideOverlap = Math.min(...layoutResult.rows.map(r => r.actualSideOverlap))

  const overlapSufficient =
    minHeadOverlap >= requiredHeadOverlap * 0.9 &&
    minSideOverlap >= requiredSideOverlap * 0.9

  const leakPoints: LeakPoint[] = []
  const warnings: string[] = []
  const risks: string[] = []

  layoutResult.rows.forEach(row => {
    if (row.actualHeadOverlap < requiredHeadOverlap * 0.85) {
      leakPoints.push({
        rowIndex: row.rowIndex,
        position: row.rowIndex <= 3 ? '檐口' : row.rowIndex >= layoutResult.totalRows - 2 ? '脊部' : '中部',
        type: '搭接不足',
        severity: 'danger',
        description: `第${row.rowIndex}排头搭接${row.actualHeadOverlap}mm，低于要求值${requiredHeadOverlap}mm的85%`,
        recommendation: '调整排距，增加瓦片搭接长度或补充额外瓦片'
      })
    } else if (row.actualHeadOverlap < requiredHeadOverlap * 0.95) {
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
  const { slopeAngle, slopeLength, eaveWidth } = dimensions
  const g = 9.81
  const frictionCoeff = 0.15

  const angleRad = (slopeAngle * Math.PI) / 180
  const sinAngle = Math.sin(angleRad)
  const cosAngle = Math.cos(angleRad)

  const flowVelocity = Math.sqrt((2 * g * slopeLength * sinAngle) / (1 + frictionCoeff / cosAngle)) / 3
  const wettedArea = eaveWidth * 0.02
  const flowRate = flowVelocity * wettedArea * 1000

  const retentionTime = slopeLength / flowVelocity
  const maxRainIntensity = (flowRate / (eaveWidth * slopeLength / 1000000)) / 60

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
    flowVelocity,
    flowRate
  )

  return {
    slopeAngle,
    flowVelocity: Number(flowVelocity.toFixed(3)),
    flowRate: Number(flowRate.toFixed(2)),
    retentionTime: Number(retentionTime.toFixed(2)),
    maxRainIntensity: Number(maxRainIntensity.toFixed(1)),
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

  const roofArea = (dimensions.slopeLength * dimensions.eaveWidth) / 1000000
  const totalRainfall = rainfall * roofArea * 1000

  const efficiencyFactor = layoutResult.overlapSufficient ? 0.95 : 0.75
  const slopeFactor = Math.min(1, dimensions.slopeAngle / 30)
  const actualDrainage = baseFlowRate * duration * efficiencyFactor * slopeFactor

  const leakedWater = Math.max(0, totalRainfall - actualDrainage)
  const leakRatio = (leakedWater / totalRainfall) * 100

  const standingWater: number[] = []
  layoutResult.rows.forEach(row => {
    if (row.hasLeakRisk || row.rowIndex <= 2) {
      standingWater.push(Number((Math.random() * 5 + (row.riskLevel === 'danger' ? 3 : 0)).toFixed(2)))
    } else {
      standingWater.push(Number((Math.random() * 1.5).toFixed(2)))
    }
  })

  const criticalPoints: string[] = []
  if (dimensions.slopeAngle < 20) {
    criticalPoints.push('屋面整体坡度不足，易大面积积水')
  }
  if (layoutResult.misalignedRows.length > 0) {
    criticalPoints.push(`第${layoutResult.misalignedRows.join(',')}排瓦垄歪斜处`)
  }
  if (leakRatio > 5) {
    criticalPoints.push('檐口排水不及，可能倒灌')
  }
  criticalPoints.push('正脊与垂脊交接处需重点做防水')

  return {
    rainfall,
    duration,
    surfaceRunoff: Number(actualDrainage.toFixed(0)),
    leakedWater: Number(leakedWater.toFixed(0)),
    leakRatio: Number(leakRatio.toFixed(2)),
    standingWater,
    criticalPoints
  }
}
