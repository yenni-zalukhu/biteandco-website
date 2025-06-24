import { createSuccessResponse, createErrorResponse, generateRequestId } from '@/lib/auth';
import { withCORSHeaders, handleOptions } from '@/lib/cors';
import { db } from '@/firebase/configure';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request) {
  const requestId = generateRequestId('health');
  const startTime = Date.now();
  
  try {
    console.log(`[${requestId}] Health check request started`);
    
    const healthData = {
      service: 'BiteAndCo Google Auth API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      requestId,
      checks: {}
    };

    // Check database connectivity
    try {
      const testDoc = await db.collection('_health_check').limit(1).get();
      healthData.checks.database = {
        status: 'healthy',
        message: 'Database connection successful',
        latency: Date.now() - startTime
      };
    } catch (dbError) {
      console.error(`[${requestId}] Database health check failed:`, dbError);
      healthData.checks.database = {
        status: 'unhealthy',
        message: 'Database connection failed',
        error: dbError.message
      };
      healthData.status = 'degraded';
    }

    // Check JWT secret
    if (process.env.JWT_SECRET) {
      healthData.checks.jwt = {
        status: 'healthy',
        message: 'JWT secret configured'
      };
    } else {
      healthData.checks.jwt = {
        status: 'unhealthy',
        message: 'JWT secret not configured'
      };
      healthData.status = 'unhealthy';
    }

    // Check environment variables
    const requiredEnvVars = ['JWT_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length === 0) {
      healthData.checks.environment = {
        status: 'healthy',
        message: 'All required environment variables configured'
      };
    } else {
      healthData.checks.environment = {
        status: 'unhealthy',
        message: `Missing environment variables: ${missingEnvVars.join(', ')}`
      };
      healthData.status = 'unhealthy';
    }

    const processingTime = Date.now() - startTime;
    healthData.processingTime = processingTime;

    console.log(`[${requestId}] Health check completed. Status: ${healthData.status}. Processing time: ${processingTime}ms`);

    const statusCode = healthData.status === 'healthy' ? 200 : 
                      healthData.status === 'degraded' ? 207 : 503;

    return withCORSHeaders(createSuccessResponse(healthData, 'Health check completed'), { status: statusCode });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] Health check error (${processingTime}ms):`, error);

    return withCORSHeaders(createErrorResponse(
      'Health check failed',
      500,
      requestId,
      process.env.NODE_ENV === 'development' ? {
        error: error.message,
        stack: error.stack,
        processingTime
      } : undefined
    ));
  }
}

export async function POST(request) {
  const requestId = generateRequestId('detailed_health');
  const startTime = Date.now();
  
  try {
    console.log(`[${requestId}] Detailed health check request started`);
    
    const body = await request.json();
    const { includeStats = false, testDatabase = false } = body;

    const healthData = {
      service: 'BiteAndCo Google Auth API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      requestId,
      checks: {},
      request: {
        userAgent: request.headers.get('User-Agent'),
        origin: request.headers.get('Origin'),
        method: 'POST'
      }
    };

    // Database connectivity test
    try {
      if (testDatabase) {
        console.log(`[${requestId}] Testing database with detailed operations`);
        
        // Test read operation
        const readStart = Date.now();
        const testRead = await db.collection('buyers').limit(1).get();
        const readTime = Date.now() - readStart;
        
        healthData.checks.database = {
          status: 'healthy',
          message: 'Database operations successful',
          operations: {
            read: {
              status: 'success',
              latency: readTime,
              documentsFound: testRead.docs.length
            }
          }
        };
      } else {
        const testDoc = await db.collection('_health_check').limit(1).get();
        healthData.checks.database = {
          status: 'healthy',
          message: 'Basic database connection successful'
        };
      }
    } catch (dbError) {
      console.error(`[${requestId}] Database health check failed:`, dbError);
      healthData.checks.database = {
        status: 'unhealthy',
        message: 'Database connection failed',
        error: dbError.message
      };
      healthData.status = 'unhealthy';
    }

    // Include statistics if requested
    if (includeStats) {
      try {
        const buyersSnapshot = await db.collection('buyers').get();
        const googleUsers = buyersSnapshot.docs.filter(doc => doc.data().googleId).length;
        const emailUsers = buyersSnapshot.docs.filter(doc => doc.data().password).length;
        
        healthData.statistics = {
          totalBuyers: buyersSnapshot.docs.length,
          googleUsers,
          emailUsers,
          lastUpdated: new Date().toISOString()
        };
      } catch (statsError) {
        console.warn(`[${requestId}] Failed to gather statistics:`, statsError);
        healthData.statistics = {
          error: 'Failed to gather statistics',
          message: statsError.message
        };
      }
    }

    // API endpoints status
    healthData.checks.endpoints = {
      status: 'healthy',
      available: [
        'POST /api/v1/buyer/google-login',
        'POST /api/v1/buyer/google-register', 
        'POST /api/v1/buyer/check-google-user',
        'POST /api/v1/buyer/verify-google-token',
        'GET /api/v1/buyer/health'
      ]
    };

    const processingTime = Date.now() - startTime;
    healthData.processingTime = processingTime;

    console.log(`[${requestId}] Detailed health check completed. Processing time: ${processingTime}ms`);

    return withCORSHeaders(createSuccessResponse(healthData, 'Detailed health check completed'));

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] Detailed health check error (${processingTime}ms):`, error);

    return withCORSHeaders(createErrorResponse(
      'Detailed health check failed',
      500,
      requestId,
      process.env.NODE_ENV === 'development' ? {
        error: error.message,
        stack: error.stack,
        processingTime
      } : undefined
    ));
  }
}
