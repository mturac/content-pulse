#!/usr/bin/env node
import { runCli } from './index'

const { exitCode } = runCli(process.argv)
process.exit(exitCode)
