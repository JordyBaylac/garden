import { resolve } from "path"
import { expect } from "chai"
import { findTasks, searchLog, touchFile, findTask } from "../../integ-helpers"
import { examplesDir } from "../../helpers"
import { runGarden, GardenWatch } from "../../run-garden"
import { JSONLogEntry } from "../../../src/logger/writers/json-terminal-writer"

const voteExamplePath = resolve(examplesDir, "vote")

let testEntries: JSONLogEntry[]

describe("integ-helpers", () => {

  describe("findTasks", () => {

    before(async () => {
      testEntries = await runGarden("/Users/ths/go/src/garden/examples/vote", ["test"])
    })

    const specs = [
      { taskType: "build", baseKey: "build.result" },
      { taskType: "deploy", baseKey: "deploy.redis" },
      { taskType: "test", baseKey: "test.api.unit" },
    ]

    for (const { taskType, baseKey } of specs) {
      it(`should find a ${taskType} task`, () => {
        const found = findTasks(testEntries, baseKey)[0]
        expect(found, "entries not found").to.be.ok
        const { startedIndex, completedIndex, executionTimeMs } = found
        expect([startedIndex, completedIndex, executionTimeMs]).to.not.include([null, undefined])
      })
    }

  })

  describe("runGarden", () => {

    it("should run and produce the expected output for a test command in the vote example project", async () => {
      const logEntries = await runGarden(voteExamplePath, ["test"])
      expect(logEntries.length).to.be.greaterThan(0)
      const found = findTasks(logEntries, "build.result")[0]
      expect(found, "entries not found").to.be.ok
      const { startedIndex, completedIndex, executionTimeMs } = found
      expect([startedIndex, completedIndex, executionTimeMs]).to.not.include([null, undefined])
    })

  })

  describe("runGardenWatch", () => {

    it("runs a command in watch mode", async () => {
      const gardenWatch = new GardenWatch(voteExamplePath, ["dev", "--hot-reload", "vote"])

      const steps = [
        {
          description: "dashboard up",
          condition: async (logEntries: JSONLogEntry[]) => {
            return searchLog(logEntries, /Garden dashboard and API server running/) ? true : null
          },
        },
        {
          description: "touch services/vote/src/main.js",
          action: async () => {
            const touchPath = resolve(voteExamplePath, "services/vote/src/main.js")
            await touchFile(touchPath)
          },
        },
        {
          description: "hot reload completed",
          condition: async (logEntries: JSONLogEntry[]) => {
            return findTask(logEntries, "hot-reload.vote", "success") !== null
          },
        },
      ]

      await gardenWatch.run({ testSteps: steps, checkIntervalMs: 1000 })
    })

  })

})
