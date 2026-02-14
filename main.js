/**
 * StarUML Controller - Main Entry Point
 *
 * Provides an HTTP server within StarUML to allow remote control
 * of ER diagrams via REST API.
 */

const http = require('http')
const apiHandler = require('./api-handler')

const DEFAULT_PORT = 12345
let server = null
let currentPort = null

/**
 * Send JSON response with appropriate status code
 */
function sendResponse(res, result) {
  let statusCode = 200
  if (result.success) {
    statusCode = 200
  } else if (result.error && /^([\w ]+)?not found: /i.test(result.error)) {
    statusCode = 404
  } else if (result.error) {
    statusCode = 400
  }
  res.writeHead(statusCode)
  res.end(JSON.stringify(result, null, 2))
}

/**
 * Start the HTTP server
 */
function startServer(port) {
  if (server) {
    app.toast.warning('Server is already running on port ' + currentPort)
    return
  }

  server = http.createServer(function (req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    // Collect request body (limit to 10MB)
    const MAX_BODY_SIZE = 10 * 1024 * 1024
    const bodyChunks = []
    let bodySize = 0
    let bodyTooLarge = false
    req.on('data', function (chunk) {
      bodySize += chunk.length
      if (bodySize > MAX_BODY_SIZE) {
        bodyTooLarge = true
        req.destroy()
        return
      }
      bodyChunks.push(chunk)
    })
    req.on('end', function () {
      if (bodyTooLarge) {
        res.writeHead(413)
        res.end(JSON.stringify({ success: false, error: 'Request body too large (max 10MB)' }))
        return
      }

      let body = {}
      if (bodyChunks.length > 0) {
        try {
          body = JSON.parse(Buffer.concat(bodyChunks).toString())
        } catch (e) {
          res.writeHead(400)
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON in request body' }))
          return
        }
      }

      try {
        const result = apiHandler.route(req.method, req.url, body)

        if (result && typeof result.then === 'function') {
          result.then(function (asyncResult) {
            sendResponse(res, asyncResult)
          }).catch(function (e) {
            console.error('[StarUML Controller] Error:', e)
            res.writeHead(500)
            res.end(JSON.stringify({ success: false, error: e.message || 'Internal server error' }))
          })
        } else {
          sendResponse(res, result)
        }
      } catch (e) {
        console.error('[StarUML Controller] Error:', e)
        res.writeHead(500)
        res.end(JSON.stringify({ success: false, error: e.message || 'Internal server error' }))
      }
    })
  })

  server.on('error', function (err) {
    console.error('[StarUML Controller] Server error:', err)
    if (err.code === 'EADDRINUSE') {
      app.dialogs.showErrorDialog('Port ' + port + ' is already in use. Please choose another port.')
    } else {
      app.dialogs.showErrorDialog('Server error: ' + err.message)
    }
    server = null
    currentPort = null
  })

  server.listen(port, function () {
    currentPort = port
    console.log('[StarUML Controller] Server started on port ' + port)
    app.toast.info('StarUML Controller server started on port ' + port)
  })
}

/**
 * Stop the HTTP server
 */
function stopServer() {
  if (!server) {
    app.toast.warning('Server is not running')
    return
  }

  server.close(function () {
    console.log('[StarUML Controller] Server stopped')
    app.toast.info('StarUML Controller server stopped')
    server = null
    currentPort = null
  })
}

/**
 * Handle start server command - show port dialog then start
 */
function handleStartServer() {
  if (server) {
    app.toast.warning('Server is already running on port ' + currentPort)
    return
  }

  app.dialogs.showInputDialog(
    'Enter the port number for the controller server:',
    String(DEFAULT_PORT)
  ).then(function (result) {
    if (result.buttonId === 'ok') {
      const port = parseInt(result.returnValue, 10)
      if (isNaN(port) || port < 1 || port > 65535) {
        app.dialogs.showErrorDialog('Invalid port number. Please enter a number between 1 and 65535.')
        return
      }
      startServer(port)
    }
  })
}

/**
 * Handle stop server command
 */
function handleStopServer() {
  stopServer()
}

/**
 * Initialize the extension
 */
function init() {
  app.commands.register('controller:start-server', handleStartServer)
  app.commands.register('controller:stop-server', handleStopServer)
}

exports.init = init
