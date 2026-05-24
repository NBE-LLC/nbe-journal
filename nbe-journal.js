/**
 * NBE Jobsite Journal — Story Stream Logic
 * Version 3.0.0 — 10x Futuristic Redesign
 * 
 * Features:
 *  - IntersectionObserver scroll-reveal with staggered cascade
 *  - Skeleton shimmer loading state
 *  - Relative time display with full date tooltip
 *  - Smooth filter transitions
 *  - Mobile description expand/collapse
 *  - Vertical Journey Timeline + Instagram Stories Modal
 */

document.addEventListener('DOMContentLoaded', () => {
  // Dynamically resolve dataPath relative to this script's location so embeds work from Webflow
  const scriptUrl = document.currentScript ? document.currentScript.src : '';
  const baseUrl = scriptUrl.substring(0, scriptUrl.lastIndexOf('/'));
  const CONFIG = {
    dataPath: baseUrl ? `${baseUrl}/jobsite_journal.json` : './jobsite_journal.json',
    batchSizeMobile: 12,
    batchSizeDesktop: 18,
    scrollOffset: 100,
    storyDuration: 5000, // 5 seconds per story slide
    revealStagger: 80    // ms between each card reveal
  };

  // GPS Geolocation Coordinate Registry by City
  const GPS_REGISTRY = {
    'Seattle': '47.6062° N, 122.3321° W',
    'Bellevue': '47.6101° N, 122.2015° W',
    'Redmond': '47.6740° N, 122.1215° W',
    'Shoreline': '47.7560° N, 122.3418° W',
    'Kent': '47.3809° N, 122.2348° W',
    'Tacoma': '47.2529° N, 122.4443° W',
    'Mercer Island': '47.5707° N, 122.2221° W',
    'Issaquah': '47.5301° N, 122.0326° W',
    'Other': '47.6062° N, 122.3321° W'
  };

  // State
  let allEntries = [];
  let filteredEntries = [];
  let currentBatchLimit = getBatchSize();
  let activeFilter = 'All';
  let activeYear = null;
  let activeMonth = null;

  // Instagram Story Viewer State
  let activeEntry = null;
  let activeSlideIndex = 0;
  let storyTimer = null;
  let storyStartTime = 0;
  let storyElapsedTime = 0;

  // Scroll Reveal Observer
  let revealObserver = null;

  // DOM Elements
  const timelineStream = document.getElementById('nbe-timeline-stream');
  const filterContainer = document.getElementById('nbe-filter-container');
  const loadMoreBtn = document.getElementById('nbe-load-more');
  const loadMoreContainer = document.getElementById('nbe-load-container');
  const archiveContainer = document.getElementById('nbe-archive-container');
  const dialog = document.getElementById('nbe-journal-dialog');

  // Initialize
  init();

  async function init() {
    try {
      showSkeletonLoading();
      setupScrollRevealObserver();

      const response = await fetch(CONFIG.dataPath);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      allEntries = data.entries || [];
      
      // Update live count badge
      const countEl = document.getElementById('nbe-live-count');
      if (countEl) countEl.textContent = allEntries.length;
      
      filteredEntries = [...allEntries];

      renderFilters();
      renderTimelineFeed();
      renderArchive();
      setupDialogListeners();
      
      // Handle window resize for pagination batch resizing
      window.addEventListener('resize', debounce(() => {
        const newBatchSize = getBatchSize();
        if (currentBatchLimit < newBatchSize && filteredEntries.length > currentBatchLimit) {
          currentBatchLimit = newBatchSize;
          renderTimelineCards(false);
        }
      }, 250));

    } catch (error) {
      console.error('Error initializing NBE Jobsite Journal:', error);
      showErrorState();
    }
  }

  function getBatchSize() {
    return window.innerWidth < 768 ? CONFIG.batchSizeMobile : CONFIG.batchSizeDesktop;
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function getGPSCoordinates(city) {
    return GPS_REGISTRY[city] || GPS_REGISTRY['Other'];
  }


  // ══════════════════════════════════════════════════════════════
  //  SKELETON SHIMMER LOADING STATE
  // ══════════════════════════════════════════════════════════════
  function showSkeletonLoading() {
    if (!timelineStream) return;

    let skeletonHtml = '';
    const count = window.innerWidth < 768 ? 4 : 6;

    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? '' : 'style="flex-direction: row-reverse;"';
      skeletonHtml += `
        <div class="nbe-journey-block" ${side} style="opacity:1; transform:none;">
          <div class="nbe-journey-node" style="animation:none;"></div>
          <div class="nbe-skeleton nbe-skeleton-card"></div>
        </div>
      `;
    }

    timelineStream.innerHTML = skeletonHtml;
  }

  function showErrorState() {
    if (timelineStream) {
      timelineStream.innerHTML = `
        <div style="text-align: center; padding: 40px; border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-md); background: rgba(255,255,255,0.02);">
          <span style="font-size: 32px; display: block; margin-bottom: 12px;">⚠️</span>
          <h3 class="nbe-h3" style="margin-bottom: 8px; color: var(--color-white);">Failed to Load Feed</h3>
          <p style="color: rgba(255,255,255,0.5); margin-bottom: 16px;">We encountered an issue fetching the latest updates.</p>
          <button class="nbe-btn nbe-btn-primary" onclick="window.location.reload()">Reload Page</button>
        </div>
      `;
    }
  }


  // ══════════════════════════════════════════════════════════════
  //  INTERSECTION OBSERVER — SCROLL REVEAL
  // ══════════════════════════════════════════════════════════════
  function setupScrollRevealObserver() {
    // Check for reduced motion preference
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const block = entry.target;
          const delay = parseInt(block.dataset.revealDelay || '0', 10);
          setTimeout(() => {
            block.classList.add('revealed');
          }, delay);
          revealObserver.unobserve(block);
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: '60px 0px 0px 0px'
    });
  }

  function observeBlocks() {
    const blocks = document.querySelectorAll('.nbe-journey-block:not(.revealed)');

    if (!revealObserver) {
      // No observer (reduced motion) — reveal all immediately
      blocks.forEach(block => block.classList.add('revealed'));
      return;
    }

    // Use double-RAF to ensure layout is fully computed before observing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        blocks.forEach((block, index) => {
          block.dataset.revealDelay = String(index * CONFIG.revealStagger);
          revealObserver.observe(block);
        });
      });
    });

    // Safety fallback: if observer hasn't triggered after 1.5s, force-reveal all
    setTimeout(() => {
      document.querySelectorAll('.nbe-journey-block:not(.revealed)').forEach(block => {
        block.classList.add('revealed');
      });
    }, 1500);
  }


  // ══════════════════════════════════════════════════════════════
  //  RELATIVE TIME DISPLAY
  // ══════════════════════════════════════════════════════════════
  function getRelativeTime(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    
    const target = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const now = new Date();
    const diffMs = now - target;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Upcoming';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  }


  // ══════════════════════════════════════════════════════════════
  //  RENDER FILTERS
  // ══════════════════════════════════════════════════════════════
  function renderFilters() {
    if (!filterContainer) return;

    const categories = ['All'];
    allEntries.forEach(entry => {
      if (entry.project_type && !categories.includes(entry.project_type)) {
        categories.push(entry.project_type);
      }
    });

    filterContainer.innerHTML = categories.map(cat => `
      <button class="nbe-filter-chip ${cat === activeFilter ? 'active' : ''}" data-filter="${cat}">
        ${cat}
      </button>
    `).join('');

    filterContainer.querySelectorAll('.nbe-filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const selected = e.target.getAttribute('data-filter');
        setFilter(selected);
      });
    });
  }

  function setFilter(category) {
    if (activeFilter === category && activeYear === null) return;
    
    activeFilter = category;
    activeYear = null; 
    activeMonth = null;

    filterContainer.querySelectorAll('.nbe-filter-chip').forEach(chip => {
      if (chip.getAttribute('data-filter') === category) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    currentBatchLimit = getBatchSize();
    applyFilters();
  }

  function applyFilters() {
    if (!timelineStream) return;
    
    // Smooth crossfade transition
    timelineStream.style.opacity = '0';
    timelineStream.style.transform = 'translateY(8px)';
    
    setTimeout(() => {
      if (activeYear !== null && activeMonth !== null) {
        filteredEntries = allEntries.filter(entry => {
          if (!entry.date) return false;
          const dateObj = new Date(entry.date + 'T00:00:00');
          const year = dateObj.getFullYear();
          const month = dateObj.getMonth();
          return (year === activeYear && month === activeMonth) &&
                 (activeFilter === 'All' || entry.project_type === activeFilter);
        });
      } else {
        filteredEntries = allEntries.filter(entry => {
          return activeFilter === 'All' || entry.project_type === activeFilter;
        });
      }

      renderTimelineFeed();
      
      // Animate back in
      requestAnimationFrame(() => {
        timelineStream.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        timelineStream.style.opacity = '1';
        timelineStream.style.transform = 'translateY(0)';
      });
    }, 200);
  }


  // ══════════════════════════════════════════════════════════════
  //  RENDER TIMELINE FEED
  // ══════════════════════════════════════════════════════════════
  function renderTimelineFeed() {
    renderTimelineCards(true);
  }

  function renderTimelineCards(resetScroll = false) {
    if (!timelineStream) return;

    if (filteredEntries.length === 0) {
      timelineStream.innerHTML = `
        <div style="text-align: center; padding: 48px 20px; border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-lg); background: rgba(255,255,255,0.02);">
          <span style="font-size: 28px; display: block; margin-bottom: 8px;">🗺️</span>
          <h4 class="nbe-h4" style="margin-bottom: 4px; color: var(--color-white);">No Journey Log Found</h4>
          <p style="color: rgba(255,255,255,0.4); margin: 0; font-size: 13px;">Try adjusting your filters or year archive selection.</p>
        </div>
      `;
      if (loadMoreContainer) loadMoreContainer.style.display = 'none';
      return;
    }

    const visibleEntries = filteredEntries.slice(0, currentBatchLimit);
    const isMobile = window.innerWidth < 768;
    
    let html = '';
    visibleEntries.forEach((entry, index) => {
      const fullDate = formatDate(entry.date);
      const relTime = getRelativeTime(entry.date);
      const isCompleted = entry.status === 'Completed';
      const nodeClass = isCompleted ? 'nbe-journey-node-completed' : '';
      const gpsCoordinates = getGPSCoordinates(entry.city);
      
      html += `
        <div class="nbe-journey-block" data-slug="${entry.slug}">
          <!-- Interactive Center Node -->
          <div class="nbe-journey-node ${nodeClass}"></div>
          
          <!-- Alternating Stream Card -->
          <div class="nbe-journey-card">
            <!-- Media Visual Section -->
            <div class="nbe-journey-media open-story-trigger" data-slug="${entry.slug}">
              <img class="nbe-journey-img" src="${entry.image}" alt="${entry.alt || entry.title}" loading="lazy">
              <span class="nbe-badge nbe-journey-media-badge ${isCompleted ? 'nbe-badge-completed' : ''}">${entry.status}</span>
            </div>
            
            <!-- Narrative Description Section -->
            <div class="nbe-journey-content">
              <div class="nbe-journey-gps">
                <svg style="width:10px;height:10px;" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                ${entry.city}, WA
              </div>
              <div class="nbe-journey-meta">
                <span>${entry.project_phase}</span>
                <span>•</span>
                <span title="${fullDate}">${relTime}</span>
              </div>
              <h3 class="nbe-h3">${entry.title}</h3>
              <p class="nbe-journey-caption" ${isMobile ? 'data-expandable="true"' : ''}>${entry.caption}</p>
              <div class="nbe-journey-footer">
                <button class="nbe-btn-text open-story-trigger" data-slug="${entry.slug}">
                  View Story
                  <svg style="width:12px;height:12px;fill:currentColor" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    timelineStream.innerHTML = html;

    // Hook up triggers to launch the Instagram story modal
    timelineStream.querySelectorAll('.open-story-trigger').forEach(el => {
      el.addEventListener('click', (e) => {
        const slug = e.currentTarget.getAttribute('data-slug');
        openStoryModal(slug);
      });
    });

    // Mobile: expandable description toggle
    if (isMobile) {
      timelineStream.querySelectorAll('.nbe-journey-card .nbe-h3').forEach(h3 => {
        h3.style.cursor = 'pointer';
        h3.addEventListener('click', (e) => {
          e.stopPropagation();
          const card = h3.closest('.nbe-journey-content');
          const caption = card.querySelector('.nbe-journey-caption');
          if (caption) {
            caption.classList.toggle('expanded');
          }
        });
      });
    }

    // Observe blocks for scroll reveal
    observeBlocks();

    // Pagination visibility
    if (loadMoreContainer) {
      if (filteredEntries.length > currentBatchLimit) {
        loadMoreContainer.style.display = 'block';
        if (loadMoreBtn) {
          loadMoreBtn.onclick = () => {
            currentBatchLimit += getBatchSize();
            renderTimelineCards(false);
          };
        }
      } else {
        loadMoreContainer.style.display = 'none';
      }
    }
  }


  // ══════════════════════════════════════════════════════════════
  //  RENDER ARCHIVE ACCORDION
  // ══════════════════════════════════════════════════════════════
  function renderArchive() {
    if (!archiveContainer) return;

    const archiveTree = {};

    allEntries.forEach(entry => {
      if (!entry.date) return;
      
      const dateObj = new Date(entry.date + 'T00:00:00');
      const year = dateObj.getFullYear();
      const monthIdx = dateObj.getMonth();

      if (!archiveTree[year]) archiveTree[year] = {};
      if (!archiveTree[year][monthIdx]) archiveTree[year][monthIdx] = 0;
      archiveTree[year][monthIdx]++;
    });

    const sortedYears = Object.keys(archiveTree).sort((a, b) => b - a);

    if (sortedYears.length === 0) {
      archiveContainer.innerHTML = `<p style="text-align: center; color: rgba(255,255,255,0.4);">No archive data available.</p>`;
      return;
    }

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    archiveContainer.innerHTML = sortedYears.map((year, index) => {
      const yearNum = parseInt(year);
      const months = archiveTree[year];
      const sortedMonths = Object.keys(months).sort((a, b) => b - a);

      const monthButtonsHtml = sortedMonths.map(monthIdx => {
        const idx = parseInt(monthIdx);
        const name = monthNames[idx];
        const count = months[idx];
        const isSelected = (activeYear === yearNum && activeMonth === idx);
        const activeStyle = isSelected ? 'border-color: var(--color-accent); background: rgba(245,158,11,0.15); color: var(--color-accent);' : '';
        
        return `
          <button class="nbe-archive-month-btn" data-year="${yearNum}" data-month="${idx}" style="${activeStyle}">
            ${name} (${count})
          </button>
        `;
      }).join('');

      const isOpen = index === 0;
      const openClass = isOpen ? 'open' : '';
      const displayStyle = isOpen ? 'style="display: block;"' : '';

      return `
        <div class="nbe-accordion-item ${openClass}" data-year="${yearNum}">
          <div class="nbe-accordion-header">
            <span class="nbe-accordion-title">${year}</span>
            <svg class="nbe-accordion-icon" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </div>
          <div class="nbe-accordion-content" ${displayStyle}>
            <div class="nbe-archive-months-grid">
              ${monthButtonsHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

    archiveContainer.querySelectorAll('.nbe-accordion-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const item = e.currentTarget.closest('.nbe-accordion-item');
        const content = item.querySelector('.nbe-accordion-content');
        const isOpen = item.classList.contains('open');
        
        if (isOpen) {
          item.classList.remove('open');
          content.style.display = 'none';
        } else {
          item.classList.add('open');
          content.style.display = 'block';
        }
      });
    });

    archiveContainer.querySelectorAll('.nbe-archive-month-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const year = parseInt(e.currentTarget.getAttribute('data-year'));
        const month = parseInt(e.currentTarget.getAttribute('data-month'));
        
        if (activeYear === year && activeMonth === month) {
          activeYear = null;
          activeMonth = null;
        } else {
          activeYear = year;
          activeMonth = month;
        }

        renderArchive();
        
        if (filterContainer) {
          filterContainer.querySelectorAll('.nbe-filter-chip').forEach(chip => {
            chip.classList.toggle('active', chip.getAttribute('data-filter') === 'All');
          });
          activeFilter = 'All';
        }

        currentBatchLimit = getBatchSize();
        applyFilters();

        if (timelineStream) {
          const elementPosition = timelineStream.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: elementPosition - CONFIG.scrollOffset,
            behavior: 'smooth'
          });
        }
      });
    });
  }


  // ══════════════════════════════════════════════════════════════
  //  IMMERSIVE INSTAGRAM STORY MODAL
  // ══════════════════════════════════════════════════════════════
  function setupDialogListeners() {
    if (!dialog) return;

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        closeStoryModal();
      }
    });

    dialog.addEventListener('close', () => {
      pauseStoryTimer();
      const mediaTrack = dialog.querySelector('.nbe-story-media-container');
      if (mediaTrack) mediaTrack.innerHTML = '';
      document.body.style.overflow = '';
    });

    const tapLeft = dialog.querySelector('.nbe-story-tap-left');
    const tapRight = dialog.querySelector('.nbe-story-tap-right');
    const closeBtn = dialog.querySelector('.nbe-dialog-close');

    if (tapLeft) {
      tapLeft.addEventListener('click', (e) => {
        e.stopPropagation();
        previousSlide();
      });
    }

    if (tapRight) {
      tapRight.addEventListener('click', (e) => {
        e.stopPropagation();
        nextSlide();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeStoryModal();
      });
    }

    document.addEventListener('keydown', handleKeyboardShortcuts);
  }

  function handleKeyboardShortcuts(e) {
    if (!dialog || !dialog.open) return;

    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      previousSlide();
    }
  }

  function openStoryModal(slug) {
    if (!dialog) return;

    const entry = allEntries.find(e => e.slug === slug);
    if (!entry) return;

    activeEntry = entry;
    activeSlideIndex = 0;

    const viewer = dialog.querySelector('.nbe-story-viewer');
    if (!viewer) {
      dialog.innerHTML = `
        <div class="nbe-story-viewer">
          <div class="nbe-story-progress-bar">
            <div class="nbe-story-progress-segment"><div class="nbe-story-progress-fill"></div></div>
            <div class="nbe-story-progress-segment"><div class="nbe-story-progress-fill"></div></div>
          </div>
          <div class="nbe-story-header">
            <div class="nbe-story-profile">
              <div class="nbe-story-avatar">NBE</div>
              <div class="nbe-story-userinfo">
                <span class="nbe-story-username">NBE Jobsite</span>
                <span class="nbe-story-usergps"></span>
              </div>
            </div>
            <div class="nbe-story-controls">
              <button class="nbe-dialog-close" aria-label="Close stories">&times;</button>
            </div>
          </div>
          <div class="nbe-story-tap-left"></div>
          <div class="nbe-story-tap-right"></div>
          <div class="nbe-story-media-container"></div>
          <div class="nbe-story-glass-panel">
            <div class="nbe-story-phase-label"></div>
            <h3 class="nbe-story-title"></h3>
            <div class="nbe-story-caption"></div>
            <div class="nbe-story-footer"></div>
          </div>
        </div>
      `;
      setupDialogListeners();
    }

    const gpsCoordinates = getGPSCoordinates(entry.city);
    const userGpsEl = dialog.querySelector('.nbe-story-usergps');
    if (userGpsEl) userGpsEl.textContent = `📍 ${entry.city}, WA`;

    renderStorySlide();

    dialog.showModal();
    document.body.style.overflow = 'hidden';
  }

  function closeStoryModal() {
    if (dialog) dialog.close();
  }

  function renderStorySlide() {
    if (!activeEntry || !dialog) return;

    const mediaContainer = dialog.querySelector('.nbe-story-media-container');
    const phaseLabel = dialog.querySelector('.nbe-story-phase-label');
    const storyTitle = dialog.querySelector('.nbe-story-title');
    const storyCaption = dialog.querySelector('.nbe-story-caption');
    const storyFooter = dialog.querySelector('.nbe-story-footer');

    const fills = dialog.querySelectorAll('.nbe-story-progress-fill');
    fills.forEach((fill, idx) => {
      fill.className = 'nbe-story-progress-fill';
      fill.style.width = '';
      
      if (idx < activeSlideIndex) {
        fill.classList.add('completed');
      }
    });

    if (activeSlideIndex === 0) {
      phaseLabel.textContent = `${activeEntry.project_phase} Phase • ${getRelativeTime(activeEntry.date)}`;
      storyTitle.textContent = activeEntry.title;
      storyCaption.innerHTML = `<p>${activeEntry.caption}</p>`;
      storyFooter.style.display = 'none';

      if (activeEntry.video) {
        const videoEmbed = getYouTubeOrVimeoEmbed(activeEntry.video);
        if (videoEmbed) {
          mediaContainer.innerHTML = `<div class="nbe-story-video-wrapper">${videoEmbed}</div>`;
        } else {
          mediaContainer.innerHTML = `<video src="${activeEntry.video}" autoplay playsinline muted loop class="nbe-story-img"></video>`;
        }
      } else {
        mediaContainer.innerHTML = `<img src="${activeEntry.image}" alt="${activeEntry.alt || activeEntry.title}">`;
      }
    } else {
      phaseLabel.textContent = `${activeEntry.project_type} — Technical Specs`;
      storyTitle.textContent = `${activeEntry.title}`;
      storyCaption.innerHTML = activeEntry.desc || `<p>${activeEntry.caption}</p>`;
      
      if (activeEntry.show_portfolio_btn && activeEntry.portfolio_slug) {
        storyFooter.innerHTML = `
          <a href="/portfolio/${activeEntry.portfolio_slug}" class="nbe-btn nbe-btn-gold" style="text-align: center; font-size:11px; padding: 10px 20px; border-radius: var(--radius-sm);">
            View Case Study →
          </a>
        `;
        storyFooter.style.display = 'block';
      } else {
        storyFooter.style.display = 'none';
      }

      mediaContainer.innerHTML = `
        <div style="width:100%; height:100%; position:relative; background-color: var(--color-primary-dark);">
          <img src="${activeEntry.image}" style="filter: blur(12px) brightness(0.3); transform: scale(1.1); width:100%; height:100%; object-fit:cover;">
          <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center; color:white; width:80%;">
            <svg style="width:40px;height:40px;fill:var(--color-accent);margin-bottom:12px;" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            <h4 class="nbe-h4" style="color:white;margin-bottom:6px;font-size:14px;">Technical Details</h4>
            <p style="font-size:11px;color:rgba(255,255,255,0.6);margin:0;">Scroll the bottom panel for full specs.</p>
          </div>
        </div>
      `;
    }

    startStoryTimer();
  }

  function startStoryTimer() {
    pauseStoryTimer();

    const fills = dialog.querySelectorAll('.nbe-story-progress-fill');
    const activeFill = fills[activeSlideIndex];
    if (!activeFill) return;

    storyStartTime = Date.now();
    
    setTimeout(() => {
      activeFill.classList.add('active');
    }, 10);

    storyTimer = setTimeout(() => {
      nextSlide();
    }, CONFIG.storyDuration);
  }

  function pauseStoryTimer() {
    if (storyTimer) {
      clearTimeout(storyTimer);
      storyTimer = null;
    }
  }

  function nextSlide() {
    if (!activeEntry) return;

    if (activeSlideIndex === 0) {
      activeSlideIndex = 1;
      renderStorySlide();
    } else {
      const currentIndex = filteredEntries.findIndex(e => e.slug === activeEntry.slug);
      if (currentIndex !== -1 && currentIndex + 1 < filteredEntries.length) {
        const nextEntry = filteredEntries[currentIndex + 1];
        openStoryModal(nextEntry.slug);
      } else {
        closeStoryModal();
      }
    }
  }

  function previousSlide() {
    if (!activeEntry) return;

    if (activeSlideIndex === 1) {
      activeSlideIndex = 0;
      renderStorySlide();
    } else {
      const currentIndex = filteredEntries.findIndex(e => e.slug === activeEntry.slug);
      if (currentIndex !== -1 && currentIndex - 1 >= 0) {
        const prevEntry = filteredEntries[currentIndex - 1];
        openStoryModal(prevEntry.slug);
        activeSlideIndex = 1;
        renderStorySlide();
      } else {
        renderStorySlide();
      }
    }
  }

  function getYouTubeOrVimeoEmbed(url) {
    if (!url) return null;
    const ytReg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(ytReg);
    if (ytMatch && ytMatch[1]) {
      return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
    const vimeoReg = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/i;
    const vimeoMatch = url.match(vimeoReg);
    if (vimeoMatch && vimeoMatch[3]) {
      return `<iframe src="https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1&background=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }
    return null;
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }
});
