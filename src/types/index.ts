export type RoofType = '硬山' | '悬山' | '歇山' | '庑殿' | '攒尖' | '卷棚'

export interface TileSpec {
  name: string
  bottomTileLength: number
  bottomTileWidth: number
  topTileLength: number
  topTileWidth: number
  headOverlap: number
  sideOverlap: number
  exposedRatio: number
}

export interface RoofDimensions {
  slopeLength: number
  eaveWidth: number
  ridgeLength: number
  slopeAngle: number
  roofType: RoofType
  eaveOverhang: number
  ridgeHeight: number
}

export interface RoofProject {
  id: string
  name: string
  projectName: string
  createdAt: string
  updatedAt: string
  dimensions: RoofDimensions
  tileSpec: TileSpec
  notes?: string
}

export interface TileRowResult {
  rowIndex: number
  bottomTileCount: number
  topTileCount: number
  actualHeadOverlap: number
  actualSideOverlap: number
  exposedLength: number
  isAdjusted: boolean
  deviation: number
  hasLeakRisk: boolean
  riskLevel: 'normal' | 'warning' | 'danger'
}

export interface TileLayoutResult {
  totalRows: number
  totalBottomTiles: number
  totalTopTiles: number
  rows: TileRowResult[]
  averageHeadOverlap: number
  averageSideOverlap: number
  maxDeviation: number
  misalignedRows: number[]
  eaveTiles: {
    gutters: number
    dripTiles: number
    headTiles: number
  }
  ridgeTiles: {
    mainRidgeTiles: number
    verticalRidgeTiles: number
    hipRidgeTiles: number
  }
  totalMaterials: MaterialItem[]
}

export interface MaterialItem {
  name: string
  specification: string
  quantity: number
  unit: string
  lossRate: number
  finalQuantity: number
  category: '底瓦' | '盖瓦' | '檐口瓦' | '脊瓦' | '配件'
}

export interface LeakCheckResult {
  overallStatus: 'safe' | 'warning' | 'danger'
  overlapSufficient: boolean
  minHeadOverlap: number
  requiredHeadOverlap: number
  slopeDrainageCapacity: number
  maxRainfall: number
  leakPoints: LeakPoint[]
  drainageAnalysis: DrainageAnalysis
  warnings: string[]
  risks: string[]
}

export interface LeakPoint {
  rowIndex: number
  position: '檐口' | '中部' | '脊部' | '瓦垄间'
  type: '搭接不足' | '瓦垄歪斜' | '排水不畅' | '坡度不足'
  severity: 'warning' | 'danger'
  description: string
  recommendation: string
}

export interface DrainageAnalysis {
  slopeAngle: number
  flowVelocity: number
  flowRate: number
  retentionTime: number
  maxRainIntensity: number
  drainageStatus: 'excellent' | 'good' | 'normal' | 'poor' | 'critical'
  stormSimulation: StormResult
}

export interface StormResult {
  rainfall: number
  duration: number
  surfaceRunoff: number
  leakedWater: number
  leakRatio: number
  standingWater: number[]
  criticalPoints: string[]
}

export interface ArchiveRecord {
  id: string
  projectId: string
  projectName: string
  roofName: string
  roofType: RoofType
  createdAt: string
  layoutResult: TileLayoutResult
  leakResult: LeakCheckResult
  dimensions: RoofDimensions
  tileSpec: TileSpec
  status: 'draft' | 'approved' | 'completed'
  operator?: string
  reviewer?: string
}

export interface RoofTemplate {
  id: string
  name: string
  roofType: RoofType
  description: string
  tileSpec: TileSpec
  standardDimensions: RoofDimensions
  tags: string[]
  usageCount: number
  createdAt: string
  isBuiltIn: boolean
}

export const DEFAULT_TILE_SPECS: TileSpec[] = [
  {
    name: '青灰筒板瓦（标准）',
    bottomTileLength: 320,
    bottomTileWidth: 220,
    topTileLength: 300,
    topTileWidth: 130,
    headOverlap: 70,
    sideOverlap: 50,
    exposedRatio: 0.3
  },
  {
    name: '琉璃瓦（皇家制式）',
    bottomTileLength: 360,
    bottomTileWidth: 240,
    topTileLength: 340,
    topTileWidth: 140,
    headOverlap: 80,
    sideOverlap: 55,
    exposedRatio: 0.28
  },
  {
    name: '小青瓦（民间）',
    bottomTileLength: 240,
    bottomTileWidth: 180,
    topTileLength: 220,
    topTileWidth: 110,
    headOverlap: 55,
    sideOverlap: 40,
    exposedRatio: 0.32
  },
  {
    name: '合瓦（阴阳瓦）',
    bottomTileLength: 280,
    bottomTileWidth: 200,
    topTileLength: 260,
    topTileWidth: 120,
    headOverlap: 65,
    sideOverlap: 45,
    exposedRatio: 0.3
  }
]
