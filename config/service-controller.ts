import { spawn, type ChildProcess } from 'node:child_process'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import definitions from './services.json' with { type: 'json' }
import type { ServiceAction, ServiceCommand, ServiceDefinition } from './types.ts'

type RunningService = {
  definition: ServiceDefinition
  process?: ChildProcess
}

const services: RunningService[] = (definitions as unknown as ServiceDefinition[]).map(
  (definition) => ({
    definition,
  }),
)

const executableFor = ({ executable }: ServiceCommand) =>
  executable === 'npm' && process.platform === 'win32' ? 'npm.cmd' : executable

const isRunning = (service: RunningService) => Boolean(service.process && !service.process.killed)

const publicService = ({ definition, process }: RunningService) => ({
  id: definition.id,
  name: definition.name,
  icon: definition.icon,
  port: definition.port,
  running: Boolean(process && !process.killed),
})

function startService(service: RunningService) {
  if (isRunning(service)) return

  const { definition } = service
  const command = definition.commands.start
  service.process = spawn(executableFor(command), command.args, {
    cwd: resolve(process.cwd(), definition.projectPath),
    stdio: 'ignore',
  })
  service.process.once('exit', () => {
    service.process = undefined
  })
}

function stopService(service: RunningService) {
  if (service.definition.commands.stop.executable !== 'process:terminate') {
    throw new Error('Для остановки пока поддерживается только команда process:terminate.')
  }
  service.process?.kill('SIGTERM')
}

function runLint(service: RunningService, send: (body: unknown, status?: number) => void) {
  const { definition } = service
  const command = definition.commands.lint
  const process = spawn(executableFor(command), command.args, {
    cwd: resolve(globalThis.process.cwd(), definition.projectPath),
  })
  let output = ''

  process.stdout.on('data', (chunk) => {
    output += chunk.toString()
  })
  process.stderr.on('data', (chunk) => {
    output += chunk.toString()
  })
  process.once('close', (code) => {
    send({
      id: definition.id,
      success: code === 0,
      output:
        output.trim() ||
        (code === 0 ? 'Проверка завершена: ошибок не найдено.' : 'Линтер завершился с ошибкой.'),
    })
  })
}

export function serviceController(): Plugin {
  return {
    name: 'service-controller',
    configureServer(server) {
      server.middlewares.use('/api/services', (req, res, next) => {
        const send = (body: unknown, status = 200) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        }
        const match = req.url?.match(/^\/([^/]+)\/(start|stop|lint)$/)

        if (req.method === 'GET' && req.url === '/') {
          send(services.map(publicService))
          return
        }
        if (req.method !== 'POST' || !match) return next()

        const service = services.find(({ definition }) => definition.id === match[1])
        if (!service) return send({ error: 'Сервис не найден' }, 404)

        const action = match[2] as ServiceAction
        if (action === 'lint') return runLint(service, send)

        try {
          if (action === 'start') startService(service)
          if (action === 'stop') stopService(service)
          send({ id: service.definition.id, running: isRunning(service) })
        } catch (error) {
          send(
            { error: error instanceof Error ? error.message : 'Не удалось выполнить команду.' },
            400,
          )
        }
      })
    },
    closeBundle() {
      services.forEach((service) => service.process?.kill('SIGTERM'))
    },
  }
}
