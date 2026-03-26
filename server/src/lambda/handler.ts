import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { transformationService } from '../services/transformation.service';
import { s3Service } from '../services/s3.service';

/**
 * AWS Lambda Handler for on-the-go image transformation.
 * Typically triggered as a CloudFront Origin via Function URL or API Gateway.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Parse Path for Original Key (e.g. /cdn/uploads/my-image.jpg)
    // Extract everything after /cdn/
    const path = event.path || '';
    const key = path.startsWith('/cdn/') ? path.replace('/cdn/', '') : path;
    
    if (!key) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing image key' }) };
    }

    // 2. Parse Transformation Params
    const query = event.queryStringParameters || {};
    const params = {
      key,
      w: query.w ? parseInt(query.w) : undefined,
      h: query.h ? parseInt(query.h) : undefined,
      f: query.f || undefined,
    };

    // 3. Transform & Get Cached Key
    const cacheKey = await transformationService.transformImage(params);

    // 4. Generate Pre-signed GET URL for the transformed image (from transformed bucket)
    const url = await s3Service.getDownloadUrl(cacheKey, true);

    // 5. Redirect to the pre-signed S3 URL (or return the image body if needed)
    // For simplicity and proxy compatibility, we redirect.
    return {
      statusCode: 302,
      headers: {
        Location: url,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour at CDN level
      },
      body: '',
    };
  } catch (error: any) {
    console.error('Lambda Transformation Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error during transformation' }),
    };
  }
};
