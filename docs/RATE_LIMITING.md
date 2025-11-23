# Rate Limiting Configuration

This project implements comprehensive rate limiting to protect against abuse and ensure fair usage.

## Rate Limiting Rules

### General API Rate Limiting
- **Limit**: 100 requests per 15 minutes per IP
- **Applies to**: All API endpoints
- **Reset**: Every 15 minutes
- **Headers**: Includes `RateLimit-*` headers with current usage

### Authentication Endpoints
- **Limit**: 5 attempts per 15 minutes per IP
- **Applies to**: Login, Google OAuth initiation
- **Reset**: Every 15 minutes
- **Note**: Successful requests don't count against the limit

### Registration
- **Limit**: 3 attempts per hour per IP
- **Applies to**: User registration endpoint
- **Reset**: Every hour
- **Purpose**: Prevent automated account creation

### Email Verification
- **Limit**: 3 attempts per 5 minutes per IP
- **Applies to**: Email verification endpoint
- **Reset**: Every 5 minutes
- **Purpose**: Prevent verification token abuse

### Password Reset (Future)
- **Limit**: 3 attempts per hour per IP
- **Applies to**: Password reset requests
- **Reset**: Every hour
- **Purpose**: Prevent password reset spam

## Error Responses

When rate limit is exceeded, the API returns:

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later.",
  "retryAfter": "15 minutes"
}
```

## Headers

Rate limiting information is included in response headers:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Time when the rate limit resets

## Configuration

Rate limits can be adjusted in `middleware/rateLimiter.js`:
- Modify `windowMs` for time windows
- Modify `max` for request limits
- Customize error messages

## Security Benefits

1. **Prevents brute force attacks** on authentication
2. **Protects against DDoS** attempts
3. **Prevents automated abuse** of registration
4. **Ensures fair resource usage** across all users
5. **Reduces server load** from excessive requests

## Development vs Production

- Development: More lenient limits for testing
- Production: Stricter limits for security
- Can be configured via environment variables if needed