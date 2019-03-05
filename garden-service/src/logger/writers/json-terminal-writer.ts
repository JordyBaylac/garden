/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { LogLevel } from "../log-node"
import { LogEntry, TaskMetadata } from "../log-entry"
import { Logger } from "../logger"
import { Writer } from "./base"
import { formatForJSON } from "../renderers"

export interface JSONLogEntry {
  msg: string,
  section?: string,
  durationMs?: number,
  taskMetadata?: TaskMetadata,
}

export class JSONTerminalWriter extends Writer {
  public level: LogLevel

  render(entry: LogEntry, logger: Logger): string | null {
    const level = this.level || logger.level
    if (level >= entry.level) {
      const jsonEntry = formatForJSON(entry)
      return jsonEntry.msg ? JSON.stringify(jsonEntry) : null
    }
    return null
  }

  onGraphChange(entry: LogEntry, logger: Logger) {
    const out = this.render(entry, logger)
    if (out) {
      process.stdout.write(out + "\n")
    }
  }

  stop() { }

}
