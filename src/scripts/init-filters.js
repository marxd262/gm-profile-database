/**
 * Client-side entry point for filter initialization
 * Imported by the homepage to initialize the filter engine
 */

import { initFilterEngine, clearAllFilters } from '../utils/filter.js';

// Load profiles from embedded JSON
const profilesDataEl = document.getElementById('profiles-data');
const profiles = profilesDataEl ? JSON.parse(profilesDataEl.textContent) : [];

// Initialize
initFilterEngine(profiles);

// Expose for debugging
window.clearAllFilters = clearAllFilters;
