import { mockAnalytics } from './dashboard/mockData.js';

// The dashboard is intentionally front-end only for now. Every screen calls this
// stable gateway instead of importing fixture data directly. When the Spring API is
// ready, replace the method bodies with the documented HTTP calls; components stay
// unchanged and must never make raw fetch calls.
export const api = mockAnalytics;
