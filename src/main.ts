import Fastify, { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { config } from 'dotenv'
import axios from 'axios'

config()

const PORT = process.env.PORT! || 3000
const BASIC_CREDENTIALS = process.env.BASIC_CREDENTIALS! || '[]'
const PROTECTED_ROUTES = process.env.PROTECTED_ROUTES! || '[]'
const IGNORED_LABELS = process.env.IGNORED_LABELS! || '[]'
const MESSENGER_API_URL = process.env.MESSENGER_API_URL!
const MESSENGER_API_TOKEN = process.env.MESSENGER_API_TOKEN!

const protectedRoutes = JSON.parse(PROTECTED_ROUTES)
const basicCredentials = JSON.parse(BASIC_CREDENTIALS)
const ignoredLabels = JSON.parse(IGNORED_LABELS)

const sendMessage = async (messageData: {
  to: string
  body: string
  text: string
}) => {
  try {
    const response = await axios.post(MESSENGER_API_URL, messageData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MESSENGER_API_TOKEN}`,
      },
    })
    console.log('Response:', response.data)
  } catch (error) {
    console.error('Error:', error)
  }
}

const validateCredential = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const credential = request.headers.authorization?.split(' ')[1]
  if (!credential || !basicCredentials.includes(atob(credential))) {
    reply.code(401).send({ error: 'Unauthorized: Basic Credential' })
  }
}

const alertRoute = async (fastify: FastifyInstance) => {
  fastify.post('/:id', async (request, reply) => {
    const data = request.body as any
    const { id } = request.params as { id: string }
    const titleMessage = []
    const bodyMessage = []
    if (data.status === 'resolved') {
      titleMessage.push('🌊')
    } else {
      for (let i = 0; i < data.alerts.length; i++) {
        titleMessage.push('🔥')
        if (i == 2) {
          break
        }
      }
      if (data.alerts.length > 3) {
        titleMessage.push('+')
      }
    }
    if (data.commonLabels.hasOwnProperty('object')) {
      titleMessage.push(` ${data.commonLabels.object}`)
    }
    titleMessage.push(` ${data.commonLabels.alertname}`)

    for (const alert of data.alerts) {
      const messageLine = []
      for (const label in alert.labels) {
        if (ignoredLabels.includes(label)) {
          continue
        }
        messageLine.push(`${label}: ${alert.labels[label]}`)
      }
      bodyMessage.push(messageLine.join(', '))
    }
    const messageData = {
      to: id,
      body: 'text',
      text: titleMessage.join('') + '\n' + bodyMessage.join('\n'),
    }
    sendMessage(messageData)
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
