import { ChildProcess } from "child_process"
import * as execa from "execa"
import * as mlog from "mocha-logger"
import parseArgs = require("minimist")
import { resolve } from "path"
import { sleep } from "../src/util/util"
import { TimeoutError } from "bluebird"
import { parseLogEntries } from "./integ-helpers"
import { JSONLogEntry } from "../src/logger/writers/json-terminal-writer"
import { ParameterError } from "../src/exceptions"
import { dedent, deline } from "../src/util/string"

const argv = parseArgs(process.argv.slice(2))

export const gardenBinPath = argv.binPath || resolve(__dirname, "..", "static", "bin", "garden")
export const showLog = !!argv.showLog

export async function runGarden(dir: string, command: string[]): Promise<JSONLogEntry[]> {
  const out = (await execa(gardenBinPath, [...command, "--jsonLog", "-l", "4"], { cwd: dir })).stdout
  return parseLogEntries(out.split("\n").filter(Boolean))
}

export type RunGardenWatchOpts = {
  testSteps: WatchTestStep[],
  checkIntervalMs?: number,
}

export type WatchTestStep = {
  description: string,
  condition?: WatchTestCondition,
  action?: WatchTestAction,
}

export const watchTestStepTypes = ["checkpoint", "action"]

/**
 * Return values:
 *   null: the condition hasn't passed or failed yet
 *   true: condition has passed (proceed to next step)
 *   false: condition has failed (terminates the watch command)
 */
export type WatchTestCondition = (logEntries: JSONLogEntry[]) => Promise<boolean | null>

export type WatchTestAction = (logEntries: JSONLogEntry[]) => Promise<void>

export const DEFAULT_CHECK_INTERVAL_MS = 500

export class GardenWatch {

  public proc: ChildProcess
  public logEntries: JSONLogEntry[]
  public checkIntervalMs: number
  public testSteps: WatchTestStep[]
  public currentTestStepIdx: number

  constructor(public dir: string, public command: string[]) {
    this.logEntries = []
    this.checkIntervalMs = DEFAULT_CHECK_INTERVAL_MS
  }

  async run({ testSteps, checkIntervalMs = DEFAULT_CHECK_INTERVAL_MS }: RunGardenWatchOpts) {

    this.validateSteps(testSteps)

    this.currentTestStepIdx = 0
    this.testSteps = testSteps

    this.proc = execa(gardenBinPath, [...this.command, "--jsonLog", "-l", "4"], { cwd: this.dir })
    this.proc.stdout.on("data", (rawLine) => {
      const lines = rawLine.toString().trim().split("\n")
      if (showLog) {
        console.log(lines)
      }
      this.logEntries.push(...lines.map((l: string) => JSON.parse(l)))
    })

    this.checkIntervalMs = checkIntervalMs || DEFAULT_CHECK_INTERVAL_MS

    let error = undefined

    while (true) {
      try {
        if (!!this.testSteps[this.currentTestStepIdx].condition) {
          const done = await this.checkCondition()
          if (done) {
            break
          }
        } else {
          await this.performAction()
        }
      } catch (err) {
        error = err
        break
      }
      await (sleep(this.checkIntervalMs))
    }

    await this.stop()

    if (error) {
      throw error
    }

    return true

  }

  /**
   * Returns true if the final test step has passed, false otherwise.
   */
  private async checkCondition(): Promise<boolean> {
    const { condition, description } = this.testSteps[this.currentTestStepIdx]
    const conditionStatus = await condition!(this.logEntries)

    if (conditionStatus === null) {
      return false
    }

    if (conditionStatus === true) {
      this.currentTestStepIdx++
      mlog.success(`${description}`)
      if (this.currentTestStepIdx === this.testSteps.length) {
        return true
      }
      return false
    }

    mlog.error(`${description}`)
    console.error(dedent`
      Watch test failed. Here is the log for the command run:

      ${this.logEntries.map(e => JSON.stringify(e)).join("\n")}`)

    throw new Error(`Test step ${description} failed.`)

  }

  private async performAction() {
    const { action, description } = this.testSteps[this.currentTestStepIdx]
    await action!(this.logEntries)
    mlog.log(`${description}`)
    this.currentTestStepIdx++
  }

  private async stop() {

    this.proc.kill()

    const startTime = new Date().getTime()
    while (true) {
      await sleep(DEFAULT_CHECK_INTERVAL_MS)
      if (this.proc.killed) {
        break
      }
      const now = new Date().getTime()
      if (now - startTime > 10 * DEFAULT_CHECK_INTERVAL_MS) {
        throw new TimeoutError(`Timed out waiting for garden command to terminate.`)
      }
    }
  }

  private validateSteps(testSteps: WatchTestStep[]) {

    for (const { condition, action, description } of testSteps) {
      const hasCondition = !!condition
      const hasAction = !!action
      if (!hasCondition && !hasAction) {
        throw new ParameterError(deline`
          GardenWatch: step ${description} in testSteps defines neither a condition nor an action.
          Steps must define either a condition or an action.`,
          { testSteps })
      }
      if (hasCondition && hasAction) {
        throw new ParameterError(deline`
          GardenWatch: step ${description} in testSteps defines both a condition and an action.
          Steps must define either a condition or an action, but not both.`,
          { testSteps })
      }
    }

    if (testSteps.length === 0) {
      throw new ParameterError(deline`
        GardenWatch: run method called with an empty testSteps array. At least one test step must be provided.`,
        {})
    }

    if (!testSteps[testSteps.length - 1].condition) {
      throw new ParameterError(deline`
        GardenWatch: The last element of testSteps must be a condition, not an action.`,
        { testSteps })
    }

  }

}
