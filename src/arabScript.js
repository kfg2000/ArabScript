#! /usr/bin/env node

import fs from "fs/promises"
import process from "process"
import compile from "./compiler.js"

const help = `ArabScript compiler
Syntax: src/arabScript.js <filename> <outputType>
Prints to stdout according to <outputType>, which must be one of:
    ast        the abstract syntax tree
    analyzed   the semantically analyzed representation
    generate   the translation to JavaScript
`

async function compileFromFile(filename, outputType) {
  try {
    const buffer = await fs.readFile(filename)
    console.log(await compile(buffer.toString(), outputType))
  } catch (e) {
    console.error(`${e}`)
    process.exitCode = 1
  }
}

if (process.argv.length !== 4) {
  console.log(help)
} else {
  compileFromFile(process.argv[2], process.argv[3])
}
