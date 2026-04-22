/**
 * Filter engine for profile grid
 * Handles all client-side filtering, sorting, pagination, and URL sync
 */

// Constants
const PROFILES_PER_PAGE = 24;

// State
let state = {
  search: '',
  tags: [],
  difficulty: 'all',
  machine: 'all',
  sort: 'newest',
  page: 1
};

let allProfiles = [];

// ===== INITIALIZATION =====
export function initFilterEngine(profiles) {
  allProfiles = profiles;
  initFromUrl();
  bindEvents();
  applyFilters();
}

function initFromUrl() {
  const params = new URLSearchParams(window.location.search);
  
  if (params.has('q')) state.search = params.get('q');
  if (params.has('tags')) state.tags = params.get('tags').split(',').filter(Boolean);
  if (params.has('difficulty')) state.difficulty = params.get('difficulty');
  if (params.has('machine')) state.machine = params.get('machine');
  if (params.has('sort')) state.sort = params.get('sort');
  if (params.has('page')) state.page = parseInt(params.get('page')) || 1;
  
  applyStateToUI();
}

function applyStateToUI() {
  // Search
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  if (searchInput) searchInput.value = state.search;
  if (searchClear) searchClear.classList.toggle('hidden', !state.search);
  
  // Tags
  const tagCheckboxes = document.querySelectorAll('.tag-checkbox');
  tagCheckboxes.forEach(cb => {
    cb.checked = state.tags.includes(cb.value);
  });
  updateTagCount();
  
  // Difficulty
  const difficultyBtns = document.querySelectorAll('.difficulty-btn');
  difficultyBtns.forEach(btn => {
    const isActive = btn.dataset.difficulty === state.difficulty;
    btn.classList.toggle('btn-active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });
  
  // Machine
  const machineSelect = document.getElementById('machine-filter');
  if (machineSelect) machineSelect.value = state.machine;
  
  // Sort
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = state.sort;
}

function updateTagCount() {
  const tagCount = document.getElementById('tag-count');
  if (tagCount) {
    if (state.tags.length > 0) {
      tagCount.textContent = state.tags.length;
      tagCount.classList.remove('hidden');
    } else {
      tagCount.classList.add('hidden');
    }
  }
}

// ===== FILTER LOGIC =====
function filterProfiles() {
  let results = [...allProfiles];
  
  // Search filter
  if (state.search) {
    const query = state.search.toLowerCase();
    results = results.filter(p => {
      const text = `${p.displayName || ''} ${p.name || ''} ${p.description || ''} ${p.author || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
      return text.includes(query);
    });
  }
  
  // Tag filter (OR logic)
  if (state.tags.length > 0) {
    results = results.filter(p => 
      state.tags.some(tag => (p.tags || []).includes(tag))
    );
  }
  
  // Difficulty filter
  if (state.difficulty !== 'all') {
    results = results.filter(p => p.difficulty === state.difficulty);
  }
  
  // Machine filter
  if (state.machine !== 'all') {
    results = results.filter(p => 
      (p.machineCompatibility || []).includes(state.machine)
    );
  }
  
  // Sort
  results = sortProfiles(results, state.sort);
  
  return results;
}

function sortProfiles(profiles, sortKey) {
  const sorted = [...profiles];
  
  switch (sortKey) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    case 'alpha':
      return sorted.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
    
    case 'difficulty': {
      const order = { beginner: 0, intermediate: 1, advanced: 2 };
      return sorted.sort((a, b) => (order[a.difficulty] || 0) - (order[b.difficulty] || 0));
    }
    
    default:
      return sorted;
  }
}

// ===== UI UPDATE =====
function updateUI(results) {
  const totalResults = results.length;
  const totalProfiles = allProfiles.length;
  const start = (state.page - 1) * PROFILES_PER_PAGE;
  const end = Math.min(start + PROFILES_PER_PAGE, totalResults);
  const paginatedResults = results.slice(start, end);
  
  // Update results count
  const resultsCount = document.getElementById('results-count');
  if (resultsCount) {
    if (totalResults === 0) {
      resultsCount.textContent = 'No profiles match your filters';
    } else if (totalResults === totalProfiles) {
      resultsCount.textContent = `Showing ${start + 1}-${end} of ${totalResults} profiles`;
    } else {
      resultsCount.textContent = `Showing ${start + 1}-${end} of ${totalResults} profiles (filtered from ${totalProfiles})`;
    }
  }
  
  // Show/hide profile cards
  const allCards = document.querySelectorAll('.profile-grid article');
  allCards.forEach(card => card.style.display = 'none');
  
  paginatedResults.forEach(profile => {
    const card = document.querySelector(`article[data-profile-name="${profile.name}"]`);
    if (card) card.style.display = '';
  });
  
  // Update empty state
  const emptyState = document.getElementById('empty-state');
  const profileGrid = document.getElementById('profile-grid');
  if (emptyState) emptyState.classList.toggle('hidden', totalResults > 0);
  if (profileGrid) profileGrid.classList.toggle('hidden', totalResults === 0);
  
  // Update pagination
  updatePagination(totalResults);
  
  // Update active chips
  updateActiveChips();
  
  // Sync URL
  syncUrl();
}

function updatePagination(totalResults) {
  const paginationContainer = document.getElementById('pagination-container');
  if (!paginationContainer) return;
  
  const totalPages = Math.ceil(totalResults / PROFILES_PER_PAGE);
  
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }
  
  let html = `<div class="flex justify-center items-center gap-2 mt-8"><div class="join">`;
  
  // Previous
  html += `<button class="join-item btn btn-sm ${state.page <= 1 ? 'btn-disabled' : ''}" data-page="prev" ${state.page <= 1 ? 'disabled' : ''}>← Prev</button>`;
  
  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, state.page - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  if (startPage > 1) {
    html += `<button class="join-item btn btn-sm" data-page="1">1</button>`;
    if (startPage > 2) html += `<span class="join-item btn btn-sm btn-disabled">...</span>`;
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="join-item btn btn-sm ${i === state.page ? 'btn-primary' : ''}" data-page="${i}">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span class="join-item btn btn-sm btn-disabled">...</span>`;
    html += `<button class="join-item btn btn-sm" data-page="${totalPages}">${totalPages}</button>`;
  }
  
  // Next
  html += `<button class="join-item btn btn-sm ${state.page >= totalPages ? 'btn-disabled' : ''}" data-page="next" ${state.page >= totalPages ? 'disabled' : ''}>Next →</button>`;
  
  html += `</div></div>`;
  
  paginationContainer.innerHTML = html;
  
  paginationContainer.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      let page = btn.dataset.page;
      if (page === 'prev') page = state.page - 1;
      else if (page === 'next') page = state.page + 1;
      else page = parseInt(page);
      
      if (page && page !== state.page && page >= 1) {
        state.page = page;
        applyFilters();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

function updateActiveChips() {
  const filterChips = document.getElementById('filter-chips');
  const activeFiltersLabel = document.getElementById('active-filters-label');
  const clearAllBtn = document.getElementById('clear-all-btn');
  
  if (!filterChips) return;
  
  filterChips.innerHTML = '';
  const chips = [];
  
  if (state.search) {
    chips.push({ type: 'search', label: `Search: "${state.search}"`, value: state.search });
  }
  
  state.tags.forEach(tag => {
    chips.push({ type: 'tag', label: tag, value: tag });
  });
  
  if (state.difficulty !== 'all') {
    chips.push({ type: 'difficulty', label: state.difficulty, value: state.difficulty });
  }
  
  if (state.machine !== 'all') {
    chips.push({ type: 'machine', label: state.machine, value: state.machine });
  }
  
  chips.forEach(chip => {
    const chipEl = document.createElement('div');
    chipEl.className = 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-base-200 border border-base-300 filter-chip';
    
    const colorClass = {
      search: 'text-primary',
      tag: 'text-secondary',
      difficulty: 'text-accent',
      machine: 'text-info'
    }[chip.type];
    
    chipEl.innerHTML = `
      <span class="${colorClass}">${chip.label}</span>
      <button 
        type="button"
        class="filter-chip-remove ml-1 p-0.5 rounded-full hover:bg-error hover:text-error-content transition-colors"
        aria-label="Remove filter"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    `;
    
    const removeBtn = chipEl.querySelector('.filter-chip-remove');
    removeBtn.addEventListener('click', () => removeFilter(chip.type, chip.value));
    
    filterChips.appendChild(chipEl);
  });
  
  const hasFilters = chips.length > 0;
  if (activeFiltersLabel) activeFiltersLabel.classList.toggle('hidden', !hasFilters);
  if (clearAllBtn) clearAllBtn.classList.toggle('hidden', !hasFilters);
}

function removeFilter(type, value) {
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  
  switch (type) {
    case 'search':
      state.search = '';
      if (searchInput) searchInput.value = '';
      if (searchClear) searchClear.classList.add('hidden');
      break;
    case 'tag':
      state.tags = state.tags.filter(t => t !== value);
      break;
    case 'difficulty':
      state.difficulty = 'all';
      break;
    case 'machine':
      state.machine = 'all';
      break;
  }
  state.page = 1;
  applyStateToUI();
  applyFilters();
}

export function clearAllFilters() {
  state.search = '';
  state.tags = [];
  state.difficulty = 'all';
  state.machine = 'all';
  state.sort = 'newest';
  state.page = 1;
  
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  if (searchInput) searchInput.value = '';
  if (searchClear) searchClear.classList.add('hidden');
  
  applyStateToUI();
  applyFilters();
}

function applyStateToUI() {
  const tagCheckboxes = document.querySelectorAll('.tag-checkbox');
  const difficultyBtns = document.querySelectorAll('.difficulty-btn');
  const machineSelect = document.getElementById('machine-filter');
  const sortSelect = document.getElementById('sort-select');
  
  tagCheckboxes.forEach(cb => {
    cb.checked = state.tags.includes(cb.value);
  });
  updateTagCount();
  
  difficultyBtns.forEach(btn => {
    const isActive = btn.dataset.difficulty === state.difficulty;
    btn.classList.toggle('btn-active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });
  
  if (machineSelect) machineSelect.value = state.machine;
  if (sortSelect) sortSelect.value = state.sort;
}

function updateTagCount() {
  const tagCount = document.getElementById('tag-count');
  if (tagCount) {
    if (state.tags.length > 0) {
      tagCount.textContent = state.tags.length;
      tagCount.classList.remove('hidden');
    } else {
      tagCount.classList.add('hidden');
    }
  }
}

// ===== FILTER LOGIC =====
function filterProfiles() {
  let results = [...allProfiles];
  
  if (state.search) {
    const query = state.search.toLowerCase();
    results = results.filter(p => {
      const text = `${p.displayName || ''} ${p.name || ''} ${p.description || ''} ${p.author || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
      return text.includes(query);
    });
  }
  
  if (state.tags.length > 0) {
    results = results.filter(p => 
      state.tags.some(tag => (p.tags || []).includes(tag))
    );
  }
  
  if (state.difficulty !== 'all') {
    results = results.filter(p => p.difficulty === state.difficulty);
  }
  
  if (state.machine !== 'all') {
    results = results.filter(p => 
      (p.machineCompatibility || []).includes(state.machine)
    );
  }
  
  results = sortProfiles(results, state.sort);
  
  return results;
}

function sortProfiles(profiles, sortKey) {
  const sorted = [...profiles];
  
  switch (sortKey) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    case 'alpha':
      return sorted.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
    
    case 'difficulty': {
      const order = { beginner: 0, intermediate: 1, advanced: 2 };
      return sorted.sort((a, b) => (order[a.difficulty] || 0) - (order[b.difficulty] || 0));
    }
    
    default:
      return sorted;
  }
}

// ===== UI UPDATE =====
function applyFilters() {
  const results = filterProfiles();
  updateUI(results);
}

function updateUI(results) {
  const totalResults = results.length;
  const totalProfiles = allProfiles.length;
  const start = (state.page - 1) * PROFILES_PER_PAGE;
  const end = Math.min(start + PROFILES_PER_PAGE, totalResults);
  const paginatedResults = results.slice(start, end);
  
  // Update results count
  const resultsCount = document.getElementById('results-count');
  if (resultsCount) {
    if (totalResults === 0) {
      resultsCount.textContent = 'No profiles match your filters';
    } else if (totalResults === totalProfiles) {
      resultsCount.textContent = `Showing ${start + 1}-${end} of ${totalResults} profiles`;
    } else {
      resultsCount.textContent = `Showing ${start + 1}-${end} of ${totalResults} profiles (filtered from ${totalProfiles})`;
    }
  }
  
  // Show/hide profile cards
  const allCards = document.querySelectorAll('.profile-grid article');
  allCards.forEach(card => card.style.display = 'none');
  
  paginatedResults.forEach(profile => {
    const card = document.querySelector(`article[data-profile-name="${profile.name}"]`);
    if (card) card.style.display = '';
  });
  
  // Update empty state
  const emptyState = document.getElementById('empty-state');
  const profileGrid = document.getElementById('profile-grid');
  if (emptyState) emptyState.classList.toggle('hidden', totalResults > 0);
  if (profileGrid) profileGrid.classList.toggle('hidden', totalResults === 0);
  
  // Update pagination
  updatePagination(totalResults);
  
  // Update active chips
  updateActiveChips();
  
  // Sync URL
  syncUrl();
}

function updatePagination(totalResults) {
  const paginationContainer = document.getElementById('pagination-container');
  if (!paginationContainer) return;
  
  const totalPages = Math.ceil(totalResults / PROFILES_PER_PAGE);
  
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }
  
  let html = `<div class="flex justify-center items-center gap-2 mt-8"><div class="join">`;
  
  // Previous
  html += `<button class="join-item btn btn-sm ${state.page <= 1 ? 'btn-disabled' : ''}" data-page="prev" ${state.page <= 1 ? 'disabled' : ''}>← Prev</button>`;
  
  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, state.page - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  if (startPage > 1) {
    html += `<button class="join-item btn btn-sm" data-page="1">1</button>`;
    if (startPage > 2) html += `<span class="join-item btn btn-sm btn-disabled">...</span>`;
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="join-item btn btn-sm ${i === state.page ? 'btn-primary' : ''}" data-page="${i}">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span class="join-item btn btn-sm btn-disabled">...</span>`;
    html += `<button class="join-item btn btn-sm" data-page="${totalPages}">${totalPages}</button>`;
  }
  
  // Next
  html += `<button class="join-item btn btn-sm ${state.page >= totalPages ? 'btn-disabled' : ''}" data-page="next" ${state.page >= totalPages ? 'disabled' : ''}>Next →</button>`;
  
  html += `</div></div>`;
  
  paginationContainer.innerHTML = html;
  
  paginationContainer.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      let page = btn.dataset.page;
      if (page === 'prev') page = state.page - 1;
      else if (page === 'next') page = state.page + 1;
      else page = parseInt(page);
      
      if (page && page !== state.page && page >= 1) {
        state.page = page;
        applyFilters();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

function updateActiveChips() {
  const filterChips = document.getElementById('filter-chips');
  const activeFiltersLabel = document.getElementById('active-filters-label');
  const clearAllBtn = document.getElementById('clear-all-btn');
  
  if (!filterChips) return;
  
  filterChips.innerHTML = '';
  const chips = [];
  
  if (state.search) {
    chips.push({ type: 'search', label: `Search: "${state.search}"`, value: state.search });
  }
  
  state.tags.forEach(tag => {
    chips.push({ type: 'tag', label: tag, value: tag });
  });
  
  if (state.difficulty !== 'all') {
    chips.push({ type: 'difficulty', label: state.difficulty, value: state.difficulty });
  }
  
  if (state.machine !== 'all') {
    chips.push({ type: 'machine', label: state.machine, value: state.machine });
  }
  
  chips.forEach(chip => {
    const chipEl = document.createElement('div');
    chipEl.className = 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-base-200 border border-base-300 filter-chip';
    
    const colorClass = {
      search: 'text-primary',
      tag: 'text-secondary',
      difficulty: 'text-accent',
      machine: 'text-info'
    }[chip.type];
    
    chipEl.innerHTML = `
      <span class="${colorClass}">${chip.label}</span>
      <button 
        type="button"
        class="filter-chip-remove ml-1 p-0.5 rounded-full hover:bg-error hover:text-error-content transition-colors"
        aria-label="Remove filter"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    `;
    
    const removeBtn = chipEl.querySelector('.filter-chip-remove');
    removeBtn.addEventListener('click', () => removeFilter(chip.type, chip.value));
    
    filterChips.appendChild(chipEl);
  });
  
  const hasFilters = chips.length > 0;
  if (activeFiltersLabel) activeFiltersLabel.classList.toggle('hidden', !hasFilters);
  if (clearAllBtn) clearAllBtn.classList.toggle('hidden', !hasFilters);
}

function removeFilter(type, value) {
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  
  switch (type) {
    case 'search':
      state.search = '';
      if (searchInput) searchInput.value = '';
      if (searchClear) searchClear.classList.add('hidden');
      break;
    case 'tag':
      state.tags = state.tags.filter(t => t !== value);
      break;
    case 'difficulty':
      state.difficulty = 'all';
      break;
    case 'machine':
      state.machine = 'all';
      break;
  }
  state.page = 1;
  applyStateToUI();
  applyFilters();
}

function applyStateToUI() {
  const tagCheckboxes = document.querySelectorAll('.tag-checkbox');
  const difficultyBtns = document.querySelectorAll('.difficulty-btn');
  const machineSelect = document.getElementById('machine-filter');
  const sortSelect = document.getElementById('sort-select');
  
  tagCheckboxes.forEach(cb => {
    cb.checked = state.tags.includes(cb.value);
  });
  updateTagCount();
  
  difficultyBtns.forEach(btn => {
    const isActive = btn.dataset.difficulty === state.difficulty;
    btn.classList.toggle('btn-active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });
  
  if (machineSelect) machineSelect.value = state.machine;
  if (sortSelect) sortSelect.value = state.sort;
}

function updateTagCount() {
  const tagCount = document.getElementById('tag-count');
  if (tagCount) {
    if (state.tags.length > 0) {
      tagCount.textContent = state.tags.length;
      tagCount.classList.remove('hidden');
    } else {
      tagCount.classList.add('hidden');
    }
  }
}

// ===== URL SYNC =====
function syncUrl() {
  const params = new URLSearchParams();
  
  if (state.search) params.set('q', state.search);
  if (state.tags.length > 0) params.set('tags', state.tags.join(','));
  if (state.difficulty !== 'all') params.set('difficulty', state.difficulty);
  if (state.machine !== 'all') params.set('machine', state.machine);
  if (state.sort !== 'newest') params.set('sort', state.sort);
  if (state.page > 1) params.set('page', state.page.toString());
  
  const queryString = params.toString();
  const newUrl = queryString 
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;
  
  window.history.replaceState({}, '', newUrl);
}

// ===== EVENT BINDING =====
function bindEvents() {
  const tagCheckboxes = document.querySelectorAll('.tag-checkbox');
  const difficultyBtns = document.querySelectorAll('.difficulty-btn');
  const machineSelect = document.getElementById('machine-filter');
  const sortSelect = document.getElementById('sort-select');
  const clearAllBtn = document.getElementById('clear-all-btn');
  const emptyClearAll = document.getElementById('empty-clear-all');
  const searchInput = document.getElementById('search-input');
  
  // Tag checkboxes
  tagCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      state.tags = Array.from(tagCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
      state.page = 1;
      updateTagCount();
      applyFilters();
    });
  });
  
  // Clear tags button
  document.querySelector('.clear-tags-btn')?.addEventListener('click', () => {
    state.tags = [];
    tagCheckboxes.forEach(cb => cb.checked = false);
    state.page = 1;
    updateTagCount();
    applyFilters();
  });
  
  // Difficulty buttons
  difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const difficulty = btn.dataset.difficulty;
      state.difficulty = difficulty;
      state.page = 1;
      
      difficultyBtns.forEach(b => {
        b.classList.remove('btn-active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('btn-active');
      btn.setAttribute('aria-pressed', 'true');
      
      applyFilters();
    });
  });
  
  // Machine select
  if (machineSelect) {
    machineSelect.addEventListener('change', () => {
      state.machine = machineSelect.value;
      state.page = 1;
      applyFilters();
    });
  }
  
  // Sort select
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      state.sort = sortSelect.value;
      applyFilters();
    });
  }
  
  // Clear all buttons
  if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllFilters);
  if (emptyClearAll) emptyClearAll.addEventListener('click', clearAllFilters);
  
  // Listen for search changes from SearchBar
  document.addEventListener('search-change', (e) => {
    state.search = e.detail.query;
    state.page = 1;
    applyFilters();
  });
}

// ===== INIT =====
export function initFilterEngine(profiles) {
  allProfiles = profiles;
  initFromUrl();
  bindEvents();
  applyFilters();
}
