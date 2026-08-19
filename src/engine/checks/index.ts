import { check01 } from './check01-spQuadrant'
import { check02 } from './check02-lifecycle'
import { check03 } from './check03-emergency'
import { check04 } from './check04-insurance'
import { check05 } from './check05-debt'
import { check06 } from './check06-rule4321'
import { check07 } from './check07-riskMatch'
import { check08 } from './check08-retirement'
import { check09 } from './check09-concentration'
import { check10 } from './check10-liquidity'
import { check11 } from './check11-fxRisk'
import { check12 } from './check12-creditDuration'
import { check13 } from './check13-portfolioRisk'
import { check14 } from './check14-correlation'
import { check15 } from './check15-cashDrag'
import { check16 } from './check16-cashFlow'
import { check17 } from './check17-education'
import type { CheckResult, Snapshot, EngineContext } from '../../types'

export type CheckFn = (snapshot: Snapshot, ctx?: EngineContext) => CheckResult

export const ALL_CHECKS: CheckFn[] = [
  check01, check02, check03, check04, check05, check06, check07, check08,
  check09, check10, check11, check12, check13, check14, check15, check16,
  check17,
]

export { check01, check02, check03, check04, check05, check06, check07, check08,
  check09, check10, check11, check12, check13, check14, check15, check16, check17 }
