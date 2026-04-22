import { Request, Response, NextFunction } from 'express'
import { AppError } from '../types'

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response has already been sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error)
  }

  // Log error for debugging
  console.error(`Error ${new Date().toISOString()}:`, {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  })

  // Handle custom application errors
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    })
    return
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: error.message,
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    })
    return
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    })
    return
  }

  // Handle syntax errors
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
      timestamp: new Date().toISOString()
    })
    return
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  })
}

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  })
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now()
  
  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO'
    console.log(`${logLevel} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`)
  })
  
  next()
}
