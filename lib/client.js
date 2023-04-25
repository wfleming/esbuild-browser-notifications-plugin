// When plugin is enabled, this file is injected into every JS bundle.
// It listens for server-side events from the esbuild process and notifies the
// developer in-browser of finished builds & errors/warnings

const MAX_CONNECT_WAIT = 60 * 1000

function connectEventSource(connectWait) {
  // there may be multiple scripts with this client injected on a page
  if (window.esbuildBrowserNotificationsListener) {
    return
  }

  window.esbuildBrowserNotificationsListener = new EventSource(`${LISTEN_URL}/build-events`)

  window.esbuildBrowserNotificationsListener.addEventListener("error", (_event) => {
    console.error(`esbuild EventSource connection failed, attempting reconnect in ${connectWait / 1000} seconds`)
    window.esbuildBrowserNotificationsListener = null
    window.setTimeout(() => connectEventSource(Math.min(connectWait * 2, MAX_CONNECT_WAIT)), connectWait)
  })

  window.esbuildBrowserNotificationsListener.addEventListener("buildEnd", (event) => {
    const data = JSON.parse(event.data)
    renderNotification(data, event.lastEventId)
  })
}

function injectTemplatesAndStyles() {
  const styleNode = document.createElement("style", { type: "text/css" })
  styleNode.innerHTML = `
  #esbuild-notification-container {
    margin: 20px;
    position: fixed;
    right: 0;
    top: 0;
  }

  .esbuild-notification {
    background: #fdfdfd;
    margin-top: 10px;
    padding: 5px;
    width: 30vw;
  }

  .esbuild-notification.esbn-success {
    border: solid 4px #1bcc2e;
  }

  .esbuild-notification.esbn-error,
  .esbuild-notification.esbn-warning {
    width: calc(100vw - 40px);
  }

  .esbuild-notification.esbn-error {
    border: solid 4px #e52020;
  }

  .esbuild-notification.esbn-warning {
    border: solid 4px #e6df20;
  }

  .esbuild-notification .esbn-close-wrapper {
    float: right
  }

  .esbuild-notification.esbn-success h1,
  .esbuild-notification.esbn-warning h1 {
    font-size: 1.5em;
  }

  .esbuild-notification .esbn-bundle-list {
    margin-left: 1em;
  }

  .esbuild-notification .esbn-message {
    margin-top: 2em;
  }

  .esbuild-notification .esbn-message pre {
    background-color: #444;
    color: #eee;
    font-family: monospace;
    padding: 5px;
  }
  `
  document.head.appendChild(styleNode)

  const notificationTmplNode = document.createElement("template")
  notificationTmplNode.id = "esbuild-notification-tmpl"
  notificationTmplNode.innerHTML = `
  <div class="esbuild-notification">
    <div class="esbn-close-wrapper">[<a href="#" title="dismiss notification">x</a>]</div>
    <h1></h1>
  </div>
  `
  document.body.appendChild(notificationTmplNode)
}

function dismissNotification(node) {
  node.parentNode.removeChild(node)

  const container = document.querySelector("div#esbuild-notification-container")
  if (container && container.childNodes.length == 0) {
    container.parentNode.removeChild(container)
  }
}

function renderNotification(data, eventId) {
  const tmpl = document.querySelector('template#esbuild-notification-tmpl');
  const node = tmpl.content.querySelector("div").cloneNode(true)
  node.id = `esbn-notification-${eventId}`

  const h1 = node.querySelector("h1")
  if (data.errors.length > 0) {
    node.classList.add("esbn-error")
    h1.innerHTML = `<span class="esbn-icon">❌</span>esbuild encountered errors`
  } else if (data.warnings.length > 0) {
    node.classList.add("esbn-warning")
    h1.innerHTML = `<span class="esbn-icon">⚠️</span> esbuild finished with warnings`
  } else {
    node.classList.add("esbn-success")
    h1.innerHTML = `<span class="esbn-icon">✅</span>esbuild finished`
  }

  if (data.errors.length === 0) {
    const ul = document.createElement("ul")
    ul.classList.add("esbn-bundle-list")
    ul.innerHTML = data.bundles.map(b => `<li>${b}</li>`).join("")
    node.appendChild(ul)

    if (data.warnings.length === 0) {
      window.setTimeout(function () { dismissNotification(node) }, 10000)
    }
  }

  for (const msg of data.errors) {
    node.appendChild(renderCodeMessage(msg))
  }
  for (const msg of data.warnings) {
    node.appendChild(renderCodeMessage(msg))
  }

  const closeLink = node.querySelector(".esbn-close-wrapper a")
  closeLink.addEventListener("click", (ev) => {
    ev.preventDefault()

    const node = ev.target.closest(".esbuild-notification")
    dismissNotification(node)
  })

  let container = document.querySelector("div#esbuild-notification-container")
  if (!container) {
    container = document.createElement("div")
    container.id = "esbuild-notification-container"
    document.body.appendChild(container)
  }
  container.appendChild(node)
}

// render a warning or error
function renderCodeMessage(msg) {
  const node = document.createElement("div")
  node.classList.add("esbn-message")

  node.innerHTML = `<pre>${msg}</pre>`

  return node
}

window.addEventListener("load", () => {
  connectEventSource(5 * 1000)
  injectTemplatesAndStyles()
})
