
import ReqRateLimiter, { RequestsRequestHandler } from 'request-rate-limiter';

const rLimiter = new ReqRateLimiter();

rLimiter.setRequestHandler(new RequestsRequestHandler({
    backOffHTTPCode: 429,
}));