/**
 * SLO thresholds for VPS (2 vCPU / 2GB RAM, 100+ concurrent users)
 *
 * Why separate auth threshold: bcrypt login is CPU-bound, intentionally slower.
 */
export const thresholds = {
  http_req_failed: ["rate<0.01"],
  "http_req_duration{type:read}": ["p(95)<300"],
  "http_req_duration{type:auth}": ["p(95)<800"],
  "http_req_duration{type:write}": ["p(95)<800"],
};
