export type ServiceAction = 'start' | 'stop' | 'lint'

export type ServiceCommand = {
  executable: string
  args: string[]
}

export type ServiceDefinition = {
  id: string
  name: string
  icon: string
  port: number
  projectPath: string
  commands: Record<ServiceAction, ServiceCommand>
}
