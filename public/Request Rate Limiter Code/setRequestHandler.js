
import ReqRateLimiter, { RequestsRequestHandler } from 'request-rate-limiter';

const reqLimiter = new ReqRateLimiter();

reqLimiter.setRequestHandler(new RequestsRequestHandler({
    backOffHTTPCode: 429,
}));