/**
 * Vercel Web Analytics Integration
 * Automatically tracks page views and provides real-time traffic insights
 * @see https://vercel.com/docs/analytics/quickstart
 */

(function() {
  'use strict';
  
  // Initialize Vercel Analytics queue
  if (window.va) return;
  
  window.va = function va() {
    if (!window.vaq) window.vaq = [];
    window.vaq.push(arguments);
  };
  
  // Load the analytics script from Vercel's CDN
  // This will be automatically configured when Web Analytics is enabled in Vercel Dashboard
  var script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);
})();
