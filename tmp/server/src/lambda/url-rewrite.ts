/**
 * CloudFront Function: URL Rewriting for Dynamic Image Transformation
 * Optimized for Origin Failover logic.
 */
function handler(event: { request: any }): any {
  var request = event.request
  var uri = request.uri

  // Check if the request is for an image in the CDN path
  if (uri.startsWith('/cdn/')) {
    var originalImagePath = uri.replace('/cdn/', '')
    var normalizedOperations: { [key: string]: string } = {}

    if (request.querystring) {
      Object.keys(request.querystring).forEach(function (operation) {
        var value = request.querystring[operation].value
        if (!value) return

        switch (operation.toLowerCase()) {
          case 'w':
          case 'width':
            var width = parseInt(value)
            if (!isNaN(width) && width > 0) {
              normalizedOperations['width'] = width.toString()
            }
            break
          case 'h':
          case 'height':
            var height = parseInt(value)
            if (!isNaN(height) && height > 0) {
              normalizedOperations['height'] = height.toString()
            }
            break
          case 'f':
          case 'format':
            var SUPPORTED_FORMATS = ['auto', 'jpeg', 'webp', 'avif', 'png']
            var format = value.toLowerCase()
            if (SUPPORTED_FORMATS.includes(format)) {
              if (format === 'auto') {
                format = 'jpeg'
                if (request.headers['accept']) {
                  var accept = request.headers['accept'].value
                  if (accept.includes('avif')) {
                    format = 'avif'
                  } else if (accept.includes('webp')) {
                    format = 'webp'
                  }
                }
              }
              normalizedOperations['format'] = format
            }
            break
          case 'q':
          case 'quality':
            var quality = parseInt(value)
            if (!isNaN(quality) && quality > 0) {
              if (quality > 100) quality = 100
              normalizedOperations['quality'] = quality.toString()
            }
            break
        }
      })
    }

    // Rewrite URI for Origin Failover logic
    // Transformed images will be stored at: /cdn/original-path/ops=...
    if (Object.keys(normalizedOperations).length > 0) {
      var ops = []
      if (normalizedOperations.format) ops.push('format=' + normalizedOperations.format)
      if (normalizedOperations.width) ops.push('width=' + normalizedOperations.width)
      if (normalizedOperations.height) ops.push('height=' + normalizedOperations.height)
      if (normalizedOperations.quality) ops.push('quality=' + normalizedOperations.quality)

      request.uri = '/cdn/' + originalImagePath + '/' + ops.join(',')
    } else {
      request.uri = '/cdn/' + originalImagePath + '/original'
    }

    // Preserve signature and expiry if present (Exclusive access gate)
    var signature = request.querystring['s'] ? request.querystring['s'].value : null
    var expiry = request.querystring['e'] ? request.querystring['e'].value : null

    // Remove query strings to improve S3 cache hit ratio (Lambda will use normalized URI)
    request.querystring = {}

    if (signature) {
      request.querystring['s'] = { value: signature }
    }
    if (expiry) {
      request.querystring['e'] = { value: expiry }
    }
  }

  return request
}

// @ts-ignore
if (typeof module !== 'undefined') {
  module.exports = { handler }
}
