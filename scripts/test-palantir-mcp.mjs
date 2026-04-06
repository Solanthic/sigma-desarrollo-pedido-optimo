#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoDir = path.resolve(__dirname, '..')
const serverScript = path.join(repoDir, 'scripts', 'palantir-mcp')
const envFile = path.join(repoDir, '.env')
const defaultFoundryApiUrl = 'https://salimentos-ia.palantirfoundry.com'
const foundryApiUrl = process.env.FOUNDRY_API_URL ?? defaultFoundryApiUrl
const timeoutMs = Number(process.env.MCP_TEST_TIMEOUT_MS ?? 120000)

function fail(message) {
  console.error(message)
  process.exit(1)
}

async function main() {
  if (!process.env.FOUNDRY_TOKEN) {
    const envContents = await readFile(envFile, 'utf8').catch(() => null)
    if (!envContents) {
      fail(`Missing Foundry token. Set FOUNDRY_TOKEN in ${envFile} or export it in your shell.`)
    }

    const tokenMatch = envContents.match(/^FOUNDRY_TOKEN=(.*)$/m)
    if (!tokenMatch || !tokenMatch[1]) {
      fail(`Missing FOUNDRY_TOKEN in ${envFile}`)
    }

    process.env.FOUNDRY_TOKEN = tokenMatch[1].trim()
  }

  const child = spawn(serverScript, ['--foundry-api-url', foundryApiUrl], {
    cwd: repoDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      FOUNDRY_API_URL: foundryApiUrl,
    },
  })

  let stderr = ''
  let shuttingDown = false
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => {
    stderr += chunk
  })

  const pending = new Map()
  let nextId = 1
  let buffer = Buffer.alloc(0)
  let contentLength = null
  let headerEnd = -1

  const timeout = setTimeout(() => {
    child.kill('SIGTERM')
    fail(`Timed out after ${timeoutMs} ms while waiting for MCP response.\n${stderr}`)
  }, timeoutMs)

  function send(message) {
    const payload = Buffer.from(JSON.stringify(message), 'utf8')
    child.stdin.write(`Content-Length: ${payload.byteLength}\r\n\r\n`)
    child.stdin.write(payload)
  }

  function request(method, params) {
    const id = nextId++
    const payload = { jsonrpc: '2.0', id, method, params }
    const promise = new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
    })
    send(payload)
    return promise
  }

  function handleMessage(message) {
    if (message.id != null) {
      const entry = pending.get(message.id)
      if (!entry) {
        return
      }

      pending.delete(message.id)

      if (message.error) {
        entry.reject(new Error(JSON.stringify(message.error)))
      } else {
        entry.resolve(message.result)
      }
    }
  }

  child.stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk])

    while (true) {
      if (contentLength == null) {
        headerEnd = buffer.indexOf('\r\n\r\n')
        if (headerEnd === -1) {
          return
        }

        const headerText = buffer.subarray(0, headerEnd).toString('utf8')
        const match = headerText.match(/Content-Length:\s*(\d+)/i)
        if (!match) {
          fail(`MCP response missing Content-Length header.\n${headerText}`)
        }

        contentLength = Number(match[1])
        buffer = buffer.subarray(headerEnd + 4)
      }

      if (buffer.byteLength < contentLength) {
        return
      }

      const messageText = buffer.subarray(0, contentLength).toString('utf8')
      buffer = buffer.subarray(contentLength)
      contentLength = null
      headerEnd = -1

      let message
      try {
        message = JSON.parse(messageText)
      } catch (error) {
        fail(`Failed to parse MCP response: ${error.message}\n${messageText}`)
      }

      handleMessage(message)
    }
  })

  child.on('exit', (code, signal) => {
    if (shuttingDown && signal === 'SIGTERM') {
      return
    }

    if (code === 0) {
      return
    }

    fail(`palantir-mcp exited with code ${code ?? 'null'} signal ${signal ?? 'null'}\n${stderr}`)
  })

  try {
    const initializeResult = await request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'sigma-desarrollo-pedido-optimo-smoke-test',
        version: '1.0.0',
      },
    })

    if (!initializeResult) {
      fail(`initialize returned no result.\n${stderr}`)
    }

    send({ jsonrpc: '2.0', method: 'notifications/initialized' })

    const toolsResult = await request('tools/list', {})
    const tools = toolsResult?.tools ?? []

    if (!Array.isArray(tools) || tools.length === 0) {
      fail(`Expected at least one MCP tool, got ${JSON.stringify(toolsResult)}\n${stderr}`)
    }

    console.log(
      `palantir-mcp is working: initialize succeeded and ${tools.length} tool(s) were listed.`,
    )
    return
  } catch (error) {
    fail(`${error.message}\n${stderr}`)
  } finally {
    shuttingDown = true
    clearTimeout(timeout)
    child.kill('SIGTERM')
  }
}

main().catch((error) => {
  fail(error.message)
})
