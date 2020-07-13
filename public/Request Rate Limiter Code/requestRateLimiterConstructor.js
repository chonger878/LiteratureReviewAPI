
import ReqRateLimiter from 'request-rate-limiter';

const rLimiter = new ReqRateLimiter({
    backOffTime: 30,
    requestRate: 90,
    interval:10,
    timeout:600
})