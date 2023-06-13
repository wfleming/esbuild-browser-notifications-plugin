# esbuild-browser-notifications-plugin

A plugin for [esbuild](https://esbuild.github.io/) to show build notifications within the browser.

## Motivation

esbuild's built-in [serve mode](https://esbuild.github.io/api/#serve) is great,
but may not be the best fit for all use cases. For situations where you want to
serve your assets a different way in development, but would like to get
in-browser notifications of the build finishing, or errors preventing the build
from finishing, this plugin can be helpful.

## Limitations

Unlike the built-in serve mode, this plugin can't block on pending builds
(because it's not actually serving anything, it's just handling notifications of
events).

## Screenshots

<picture>
  <img src="https://github.com/wfleming/esbuild-browser-notifications-plugin/blob/main/doc/readme/success.jpg?raw=true" alt="Screenshot of success notification" />
</picture>

<picture>
  <img src="https://github.com/wfleming/esbuild-browser-notifications-plugin/blob/main/doc/readme/error.jpg?raw=true" alt="Screenshot of error notification" />
</picture>

## Installation & configuration

```console
$ npm install --save @wfleming/esbuild-browser-notifications-plugin
```

In your esbuild configuration:

```javascript
import {browserNotificationsPlugin} from "@wfleming/esbuild-browser-notifications-plugin"

await esbuild.build({
  ...
  // You want to make this conditional on being in development, which will depend on your setup
  plugins: [browserNotificationsPlugin()],
  // this is not required, but without it you'll only get errors/warnings, not success notifications
  metafile: true,
})
```

### Options

You can pass several options to the plugin:

| Option    | Description                                                                                                                                | Default                                                                                       |
|-----------|--------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| host      | The host the server binds to                                                                                                               | 0.0.0.0                                                                                       |
| port      | The port the server binds to                                                                                                               | 8001                                                                                          |
| listenUrl | The URL the client JS will listen to. If you're running esbuild via docker compose or something similar, you'll probably want to set this. | http://localhost:port if host is 0.0.0.0, otherwise http://host:port      |

### Gotchas

1. Because `browserNotificationsPlugin` starts an HTTP server binding to a port, you can only call it once. So if you call `esbuild.build` or `esbuild.context` multiple times (e.g. to handle differing configs for different bundles), you should instantiate this plugin once and pass it to each bundle.

   ```
   const browserNotifications = browserNotificationsPlugin()

   const builders = entrypoints.map(e => esbuild.build({..., plugins: [browserNotifications] })
   ```
2. `browserNotificationsPlugin` injects the client-side JS to listen for events into JS bundles by modifying the [`banner`](https://esbuild.github.io/api/#servebanner) settings. The plugin will preserve existing banner contents, but strange interactions here may be possible depending on your usage of `banner` or if you use other plugins that also modify `banner`.
