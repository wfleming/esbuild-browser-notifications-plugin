import {EventEmitter} from "node:events"
import {readFileSync} from "node:fs"
import path from "node:path"
import ansi2html from "./ansi2html"
import {Message, transformSync, formatMessages as esbuildFormatMessages} from "esbuild"
import {createServer} from "./server"

export interface BrowserNotificationsPluginOptions {
  host?: string,
  port?: number,
  listenUrl?: string, // defaults to `http://host:port`
}

const DEFAULT_OPTIONS = {
  host: "0.0.0.0",
  port: 8001,
}

async function formatMessages(messages: Message[], kind: 'error' | 'warning'): Promise<string[]> {
  return (await esbuildFormatMessages(messages, {
    kind: kind,
    color: true,
    terminalWidth: 100,
  })).map(m => ansi2html(m))
}

function clientSrc(listenUrl: string): string {
  const clientSrc = readFileSync(path.join(__dirname, "./client.js"))
  return transformSync(
    clientSrc,
    {
      loader: "js",
      minify: true,
      sourcemap: false,
      format: "iife",
      define: { LISTEN_URL: `"${listenUrl}"` }
    }
  ).code
}

export function browserNotificationsPlugin(options: BrowserNotificationsPluginOptions) {
  const host: string = options.host ?? DEFAULT_OPTIONS.host,
    port: number = options.port ?? DEFAULT_OPTIONS.port,
    listenUrl = options.listenUrl ?? `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`,
    eventHub = new EventEmitter(),
    server = createServer(host, port, eventHub)

  return {
    name: "browser-notifications",
    setup(build) {
      const clientJsStr = clientSrc(listenUrl)
      if (build.initialOptions.banner) {
        if (build.initialOptions.banner.js) {
          build.initialOptions.banner.js = `${clientJsStr}\n${build.initialOptions.banner.js}`
        } else {
          build.initialOptions.banner.js = clientJsStr
        }
      } else {
        build.initialOptions.banner = { js: clientJsStr }
      }

      build.onEnd(async result => {
        let bundles: string[] = []
        if (result.metafile && result.metafile.outputs) {
          bundles = Object.keys(result.metafile.outputs).filter(p => !p.endsWith(".map"))

          // make the names relative to outdir if present
          if (build.initialOptions.outdir) {
            bundles = bundles.map(p => path.relative(build.initialOptions.outdir, p))
          }
        }
        const errors = await formatMessages(result.errors, "error")
        const warnings = await formatMessages(result.warnings, "warning")

        eventHub.emit("buildEnd", { bundles, errors, warnings })
      })
    }
  }
}

