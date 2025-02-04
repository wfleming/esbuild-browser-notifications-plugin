import * as http from "node:http"
import * as url from "node:url"
import {EventEmitter} from "node:events"

function buildListeners(eventHub: EventEmitter) {
  const buildEventsListener = (request: http.IncomingMessage, response: http.ServerResponse) => {
    request.socket.setTimeout(30 * 60 * 1000)
    response.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Content-Type': 'text/event-stream',
    })
    response.flushHeaders()

    let eventId = 0
    const listener = ev => {
      response.write("event: buildEnd\n")
      response.write(`data: ${JSON.stringify(ev)}\n`)
      response.write(`id: ${eventId}\n\n`)
      eventId += 1
    }

    eventHub.addListener("buildEnd", listener)
    request.on('close', () => {
      eventHub.removeListener("buildEnd", listener)
      response.end('OK')
    })

  }

  return (request: http.IncomingMessage, response: http.ServerResponse) => {
    const reqUrl = url.parse(request.url as string, true),
      path = reqUrl.pathname

    switch (path) {
      case "/build-events":
        buildEventsListener(request, response)
        break
      default:
        response.writeHead(404)
        response.end("Not found")
    }
  }
}

export function createServer(host: string, port: number, eventHub: EventEmitter) {
  const server = http.createServer(buildListeners(eventHub))
  server.listen(port, host, () => {
    console.log(`browser-notifications server is listening on ${host}:${port}`)
  })
}
