import * as execa from "execa"
import { intersection } from "lodash"
import { BaseKubeApi } from "../src/plugins/kubernetes/api"
import { deleteNamespaces } from "../src/plugins/kubernetes/init"
import { TaskLogStatus } from "../src/logger/log-entry"
import { JSONLogEntry } from "../src/logger/writers/json-terminal-writer"
import { getAllNamespaces } from "../src/plugins/kubernetes/namespace"

export async function deleteExampleNamespaces(includeSystemNamespaces = false) {
  const namespacesToDelete: string[] = []

  const exampleProjectNames = [
    "debugger",
    "gatsby-hot-reload",
    "hello-world",
    "hot-reload",
    "local-tls",
    "multiple-modules",
    "remote-k8s",
    "remote-sources",
    "simple-project",
    "simple-project-start",
    "tasks",
    "vote",
    "vote-helm",
  ]

  for (const exampleProjectName of exampleProjectNames) {
    namespacesToDelete.push(exampleProjectName, `${exampleProjectName}--metadata`)
  }

  if (includeSystemNamespaces) {
    namespacesToDelete.push("garden-system", "garden-system--metadata")
  }

  const api = new BaseKubeApi("docker-for-desktop")
  const existingNamespaces = await getAllNamespaces(api)
  await deleteNamespaces(intersection(existingNamespaces, namespacesToDelete), api)

}

export async function touchFile(path: string): Promise<void> {
  await execa("touch", [path])
}

export function parseLogEntries(entries: string[]): JSONLogEntry[] {
  return entries.filter(Boolean).map((line) => {
    return JSON.parse(line)
  })
}

export function searchLog(entries: JSONLogEntry[], regex: RegExp) {
  const found = !!entries.find(e => !!e.msg.match(regex))
  return found ? true : null
}

export type TaskLogEntryResult = {
  startedIndex: number | null,
  completedIndex: number | null,
  errorIndex: number | null,
  executionTimeMs?: number,
}

export function findTasks(entries: JSONLogEntry[], baseKey: string, status?: TaskLogStatus): TaskLogEntryResult[] {

  const matching: FilteredTasks = filterTasks(entries, baseKey, status)

  const taskIds: string[] = [] // List of task ids, ordered by their first appearance in the log.

  for (const match of matching) {
    const taskId = match.entry.taskMetadata!.id
    if (!taskIds.find(id => id === taskId)) {
      taskIds.push(taskId)
    }
  }

  return taskIds.map((taskId) => {

    const matchesForKey = matching.filter(m => m.entry.taskMetadata!.id === taskId)

    const startedMatch = matchesForKey.find(m => m.entry.taskMetadata!.status === "active")
    const errorMatch = matchesForKey.find(m => m.entry.taskMetadata!.status === "error")
    const completedMatch = matchesForKey.find(m => m.entry.taskMetadata!.status === "success")

    const startedIndex = startedMatch ? startedMatch.index : null
    const errorIndex = errorMatch ? errorMatch.index : null
    const completedIndex = completedMatch ? completedMatch.index : null

    // Include the execution time, if the log entry contains it
    const executionTimeMs = completedMatch ? completedMatch.entry.taskMetadata!.durationMs : undefined

    return { startedIndex, completedIndex, errorIndex, executionTimeMs }
  })
}

/**
 * Returns the index of the matching log entry (in entries), or null if no matching entry was found.
 */
export function findTask(entries: JSONLogEntry[], baseKey: string, status?: TaskLogStatus): number | null {
  const index = entries.findIndex(e => matchTask(e, baseKey, status))
  return index === -1 ? null : index
}

export type FilteredTasks = { entry: JSONLogEntry, index: number }[]

export function filterTasks(entries: JSONLogEntry[], baseKey: string, status?: TaskLogStatus): FilteredTasks {
  const filtered: FilteredTasks = []
  for (const [index, entry] of entries.entries()) {
    if (matchTask(entry, baseKey, status)) {
      filtered.push({ index, entry })
    }
  }

  return filtered
}

export function matchTask(entry: JSONLogEntry, baseKey: string, status?: TaskLogStatus): boolean {
  const meta = entry.taskMetadata
  return !!meta && meta.baseKey === baseKey && (!status || status === meta.status)
}
