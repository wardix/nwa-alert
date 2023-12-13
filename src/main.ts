import Fastify, { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { config } from 'dotenv'

config()

const PORT = process.env.PORT! || 3000
const BASIC_CREDENTIALS = process.env.BASIC_CREDENTIALS! || '[]'
const PROTECTED_ROUTES = process.env.PROTECTED_ROUTES! || '[]'

const protectedRoutes = JSON.parse(PROTECTED_ROUTES)
const basicCredentials = JSON.parse(BASIC_CREDENTIALS)

const validateCredential = async (request: FastifyRequest, reply: FastifyReply) => {
  const credential = request.headers.authorization?.split(' ')[1]
  if (!credential || !basicCredentials.includes(atob(credential))) {
    reply.code(401).send({ error: 'Unauthorized: Basic Credential' })
  }
}

const alertRoute = async (fastify: FastifyInstance) => {
  fastify.post('/', async (request, reply) => {
    console.log(request.body)
    reply.send('OK')
  })
}

const fastify = Fastify({ logger: true })

fastify.addHook('preValidation', async (request, reply) => {
  for (const route of protectedRoutes) {
    if (request.routeOptions.url.startsWith(route)) {
      await validateCredential(request, reply)
      break
    }
  }
})

fastify.register(alertRoute, { prefix: '/alert' })

fastify.listen({ port: +PORT, host: '0.0.0.0' }, (err) => {
  if (err) throw err
})
