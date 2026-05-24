/**
 * NBE Jobsite Journal — Reusable Preview Widgets
 * Version 3.0.0 — 10x Futuristic Dark Theme
 * Modular components to render previews on Homepage, Services, and Portfolio pages.
 * Injects its own scoped CSS for widget cards, grid, dialog, and timeline.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Dynamically resolve dataPath relative to this script's location so embeds work from any page
  const scriptUrl = document.currentScript ? document.currentScript.src : '';
  const baseUrl = scriptUrl.substring(0, scriptUrl.lastIndexOf('/'));
  const CONFIG = {
    dataPath: baseUrl ? `${baseUrl}/jobsite_journal.json` : './jobsite_journal.json',
    dialogId: 'nbe-journal-widget-dialog'
  };

  let journalData = [];

  initWidgets();

  async function initWidgets() {
    const homeWidgets = document.querySelectorAll('.nbe-journal-home-widget, #nbe-journal-home-widget');
    const serviceWidgets = document.querySelectorAll('.nbe-journal-service-widget');
    const portfolioWidgets = document.querySelectorAll('.nbe-journal-portfolio-widget');

    if (!homeWidgets.length && !serviceWidgets.length && !portfolioWidgets.length) {
      return;
    }

    // Inject widget CSS once
    injectWidgetStyles();

    try {
      const response = await fetch(CONFIG.dataPath);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      journalData = data.entries || [];

      ensureDialogTemplate();

      if (homeWidgets.length) {
        homeWidgets.forEach(container => renderHomeWidget(container));
      }
      if (serviceWidgets.length) {
        serviceWidgets.forEach(container => renderServiceWidget(container));
      }
      if (portfolioWidgets.length) {
        portfolioWidgets.forEach(container => renderPortfolioWidget(container));
      }

      setupWidgetDialogListeners();

    } catch (error) {
      console.error('Failed to initialize NBE Jobsite Journal widgets:', error);
    }
  }


  // ══════════════════════════════════════════════════════════════
  //  1. HOMEPAGE WIDGET
  // ══════════════════════════════════════════════════════════════
  function renderHomeWidget(container) {
    if (!container) return;

    let items = journalData.filter(e => e.featured_homepage);
    if (items.length === 0) {
      items = journalData.slice(0, 3);
    } else {
      items = items.slice(0, 3);
    }

    if (items.length === 0) {
      container.innerHTML = renderEmptyState('No featured updates available.');
      return;
    }

    container.innerHTML = `
      <div class="nbe-w-grid">
        ${items.map(item => renderWidgetCard(item)).join('')}
      </div>
    `;

    hookCardTriggers(container);
  }


  // ══════════════════════════════════════════════════════════════
  //  2. SERVICE PAGE WIDGET
  // ══════════════════════════════════════════════════════════════
  function renderServiceWidget(container) {
    if (!container) return;

    const serviceCat = container.getAttribute('data-service');
    if (!serviceCat) {
      console.warn('NBE Service Widget missing data-service attribute');
      return;
    }

    const items = journalData
      .filter(e => e.project_type.toLowerCase() === serviceCat.toLowerCase())
      .slice(0, 3);

    if (items.length === 0) {
      container.innerHTML = renderEmptyState(`No recent updates for ${serviceCat} projects.`);
      return;
    }

    container.innerHTML = `
      <div class="nbe-w-grid">
        ${items.map(item => renderWidgetCard(item)).join('')}
      </div>
    `;

    hookCardTriggers(container);
  }


  // ══════════════════════════════════════════════════════════════
  //  3. PORTFOLIO TIMELINE WIDGET
  // ══════════════════════════════════════════════════════════════
  function renderPortfolioWidget(container) {
    if (!container) return;

    const portfolioSlug = container.getAttribute('data-portfolio-slug');
    if (!portfolioSlug) {
      console.warn('NBE Portfolio Widget missing data-portfolio-slug attribute');
      return;
    }

    const items = journalData
      .filter(e => e.portfolio_slug === portfolioSlug)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (items.length === 0) {
      container.innerHTML = renderEmptyState('No timeline updates for this project.');
      return;
    }

    container.innerHTML = `
      <div class="nbe-w-timeline-wrap">
        <h3 class="nbe-w-timeline-heading">Build Progress Timeline</h3>
        <div class="nbe-w-timeline">
          ${items.map((item, idx) => {
            const dateStr = formatDate(item.date);
            const relTime = getRelativeTime(item.date);
            const isCompleted = item.status === 'Completed';
            return `
              <div class="nbe-w-tl-item">
                <div class="nbe-w-tl-node ${isCompleted ? 'nbe-w-tl-node--done' : ''}">
                  <span class="nbe-w-tl-num">${idx + 1}</span>
                </div>
                <div class="nbe-w-tl-card">
                  <div class="nbe-w-tl-meta">
                    <span class="nbe-w-tl-phase">${item.project_phase}</span>
                    <span class="nbe-w-tl-date" title="${dateStr}">${relTime}</span>
                  </div>
                  <h4 class="nbe-w-tl-title">${item.title}</h4>
                  <p class="nbe-w-tl-caption">${item.caption}</p>
                  <button class="nbe-w-link-btn view-update-btn" data-slug="${item.slug}">
                    Read Update
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    hookCardTriggers(container);
  }


  // ══════════════════════════════════════════════════════════════
  //  SHARED MARKUP GENERATORS
  // ══════════════════════════════════════════════════════════════
  function renderWidgetCard(entry) {
    const relTime = getRelativeTime(entry.date);
    const fullDate = formatDate(entry.date);
    const isCompleted = entry.status === 'Completed';
    return `
      <article class="nbe-w-card" data-slug="${entry.slug}">
        <div class="nbe-w-card-media">
          <img class="nbe-w-card-img" src="${entry.image}" alt="${entry.alt || entry.title}" loading="lazy">
          <span class="nbe-w-card-badge ${isCompleted ? 'nbe-w-card-badge--done' : ''}">${entry.status}</span>
        </div>
        <div class="nbe-w-card-body">
          <span class="nbe-w-card-type">${entry.project_type}</span>
          <h3 class="nbe-w-card-title">${entry.title}</h3>
          <div class="nbe-w-card-meta">
            <span>${entry.city}, WA</span>
            <span>•</span>
            <span title="${fullDate}">${relTime}</span>
          </div>
          <p class="nbe-w-card-caption">${entry.caption}</p>
          <button class="nbe-w-link-btn view-update-btn" data-slug="${entry.slug}">
            View Story
            <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
          </button>
        </div>
      </article>
    `;
  }

  function renderEmptyState(message) {
    return `
      <div class="nbe-w-empty">
        <span class="nbe-w-empty-icon">📋</span>
        <p>${message}</p>
      </div>
    `;
  }

  function hookCardTriggers(container) {
    container.querySelectorAll('.view-update-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slug = e.currentTarget.getAttribute('data-slug');
        openWidgetDialog(slug);
      });
    });
  }


  // ══════════════════════════════════════════════════════════════
  //  WIDGET DETAIL DIALOG
  // ══════════════════════════════════════════════════════════════
  function ensureDialogTemplate() {
    if (document.getElementById(CONFIG.dialogId)) return;

    const dialogMarkup = `
      <dialog class="nbe-w-dialog" id="${CONFIG.dialogId}">
        <div class="nbe-w-dialog-panel">
          <button class="nbe-w-dialog-close" aria-label="Close modal">&times;</button>
          <div class="nbe-w-dialog-media"></div>
          <div class="nbe-w-dialog-content">
            <span class="nbe-w-dialog-type"></span>
            <h2 class="nbe-w-dialog-title"></h2>
            <div class="nbe-w-dialog-meta"></div>
            <div class="nbe-w-dialog-desc"></div>
            <div class="nbe-w-dialog-footer"></div>
          </div>
        </div>
      </dialog>
    `;

    document.body.insertAdjacentHTML('beforeend', dialogMarkup);
  }

  function setupWidgetDialogListeners() {
    const dialog = document.getElementById(CONFIG.dialogId);
    if (!dialog) return;

    const closeBtn = dialog.querySelector('.nbe-w-dialog-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => dialog.close());
    }

    // Light dismiss — click on backdrop
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });

    dialog.addEventListener('close', () => {
      const media = dialog.querySelector('.nbe-w-dialog-media');
      if (media) media.innerHTML = '';
      document.body.style.overflow = '';
    });
  }

  function openWidgetDialog(slug) {
    const dialog = document.getElementById(CONFIG.dialogId);
    if (!dialog) return;

    const entry = journalData.find(e => e.slug === slug);
    if (!entry) return;

    const mediaContainer = dialog.querySelector('.nbe-w-dialog-media');
    const typeLabel = dialog.querySelector('.nbe-w-dialog-type');
    const titleHeader = dialog.querySelector('.nbe-w-dialog-title');
    const metaContainer = dialog.querySelector('.nbe-w-dialog-meta');
    const descriptionBox = dialog.querySelector('.nbe-w-dialog-desc');
    const footerContainer = dialog.querySelector('.nbe-w-dialog-footer');

    // Render media
    if (entry.video) {
      const videoEmbed = getYouTubeOrVimeoEmbed(entry.video);
      if (videoEmbed) {
        mediaContainer.innerHTML = `<div class="nbe-w-dialog-video">${videoEmbed}</div>`;
      } else {
        mediaContainer.innerHTML = `
          <div class="nbe-w-dialog-video">
            <video src="${entry.video}" controls poster="${entry.image}"></video>
          </div>
        `;
      }
    } else {
      mediaContainer.innerHTML = `<img class="nbe-w-dialog-img" src="${entry.image}" alt="${entry.alt || entry.title}">`;
    }

    typeLabel.textContent = entry.project_type;
    titleHeader.textContent = entry.title;
    metaContainer.innerHTML = `
      <span>📍 ${entry.city}, WA</span>
      <span>•</span>
      <span>${entry.project_phase} Phase</span>
      <span>•</span>
      <span>${formatDate(entry.date)}</span>
    `;
    descriptionBox.innerHTML = entry.desc || `<p>${entry.caption}</p>`;

    if (entry.show_portfolio_btn && entry.portfolio_slug) {
      footerContainer.innerHTML = `
        <a href="/portfolio/${entry.portfolio_slug}" class="nbe-w-dialog-cta">
          View Full Case Study →
        </a>
      `;
      footerContainer.style.display = 'block';
    } else {
      footerContainer.innerHTML = '';
      footerContainer.style.display = 'none';
    }

    dialog.showModal();
    document.body.style.overflow = 'hidden';
  }


  // ══════════════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════════════
  function getRelativeTime(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const target = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const now = new Date();
    const diffDays = Math.floor((now - target) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Upcoming';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  }

  function getYouTubeOrVimeoEmbed(url) {
    if (!url) return null;
    const ytReg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(ytReg);
    if (ytMatch && ytMatch[1]) {
      return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
    const vimeoReg = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/i;
    const vimeoMatch = url.match(vimeoReg);
    if (vimeoMatch && vimeoMatch[3]) {
      return `<iframe src="https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }
    return null;
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }


  // ══════════════════════════════════════════════════════════════
  //  SCOPED CSS INJECTION (Dark Futuristic Theme)
  // ══════════════════════════════════════════════════════════════
  function injectWidgetStyles() {
    if (document.getElementById('nbe-widget-styles')) return;

    const css = `
      /* ── Widget Grid ──────────────────────────────────── */
      .nbe-w-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }

      @media (max-width: 900px) {
        .nbe-w-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 540px) {
        .nbe-w-grid { grid-template-columns: 1fr; gap: 12px; }
      }

      /* ── Widget Cards ─────────────────────────────────── */
      .nbe-w-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
        display: flex;
        flex-direction: column;
      }

      .nbe-w-card:hover {
        background: rgba(255,255,255,0.06);
        border-color: rgba(255,255,255,0.1);
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.25), 0 0 16px rgba(31,78,121,0.15);
      }

      .nbe-w-card-media {
        position: relative;
        height: 160px;
        overflow: hidden;
        background: #0a1628;
      }

      .nbe-w-card-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.5s cubic-bezier(0.16,1,0.3,1);
        filter: brightness(0.9) saturate(1.1);
      }

      .nbe-w-card:hover .nbe-w-card-img {
        transform: scale(1.06);
        filter: brightness(1) saturate(1.2);
      }

      .nbe-w-card-badge {
        position: absolute;
        top: 8px;
        left: 8px;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        background: rgba(31,78,121,0.85);
        color: #fff;
        z-index: 2;
      }

      .nbe-w-card-badge--done {
        background: rgba(5,150,105,0.85);
      }

      .nbe-w-card-body {
        padding: 14px 16px 16px;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
      }

      .nbe-w-card-type {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #F59E0B;
        margin-bottom: 4px;
        font-family: 'Outfit', sans-serif;
      }

      .nbe-w-card-title {
        font-family: 'Outfit', sans-serif;
        font-weight: 800;
        font-size: 15px;
        line-height: 1.25;
        color: #fff;
        margin: 0 0 6px;
        letter-spacing: -0.2px;
      }

      .nbe-w-card-meta {
        display: flex;
        gap: 6px;
        font-size: 11px;
        color: rgba(255,255,255,0.35);
        margin-bottom: 8px;
      }

      .nbe-w-card-caption {
        font-size: 12px;
        color: rgba(255,255,255,0.5);
        line-height: 1.5;
        margin: 0 0 12px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        flex-grow: 1;
      }

      /* ── Shared Link Button ────────────────────────────── */
      .nbe-w-link-btn {
        background: none;
        border: none;
        color: #F59E0B;
        font-family: 'Lato', sans-serif;
        font-weight: 700;
        font-size: 11px;
        cursor: pointer;
        padding: 0;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: all 0.3s ease;
      }

      .nbe-w-link-btn:hover {
        color: #fff;
        transform: translateX(3px);
      }

      /* ── Empty State ───────────────────────────────────── */
      .nbe-w-empty {
        text-align: center;
        padding: 28px 20px;
        border: 1px dashed rgba(255,255,255,0.08);
        border-radius: 10px;
        background: rgba(255,255,255,0.02);
      }

      .nbe-w-empty-icon {
        font-size: 24px;
        display: block;
        margin-bottom: 8px;
      }

      .nbe-w-empty p {
        color: rgba(255,255,255,0.35);
        margin: 0;
        font-size: 13px;
      }

      /* ── Portfolio Timeline ────────────────────────────── */
      .nbe-w-timeline-wrap {
        max-width: 700px;
        margin: 0 auto;
      }

      .nbe-w-timeline-heading {
        font-family: 'Outfit', sans-serif;
        font-size: 20px;
        font-weight: 800;
        color: #fff;
        text-align: center;
        margin: 0 0 28px;
      }

      .nbe-w-timeline {
        position: relative;
        padding-left: 48px;
      }

      .nbe-w-timeline::before {
        content: '';
        position: absolute;
        left: 18px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: linear-gradient(to bottom, rgba(31,78,121,0.5), rgba(245,158,11,0.3), rgba(31,78,121,0.3));
        border-radius: 1px;
      }

      .nbe-w-tl-item {
        position: relative;
        margin-bottom: 16px;
      }

      .nbe-w-tl-item:last-child {
        margin-bottom: 0;
      }

      .nbe-w-tl-node {
        position: absolute;
        left: -48px;
        top: 4px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255,255,255,0.04);
        border: 2px solid rgba(31,78,121,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
        transition: all 0.3s ease;
      }

      .nbe-w-tl-node--done {
        border-color: #059669;
        background: rgba(5,150,105,0.15);
      }

      .nbe-w-tl-num {
        font-size: 12px;
        font-weight: 900;
        color: rgba(255,255,255,0.5);
        font-family: 'Outfit', sans-serif;
      }

      .nbe-w-tl-node--done .nbe-w-tl-num {
        color: #22c55e;
      }

      .nbe-w-tl-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px;
        padding: 16px 18px;
        transition: all 0.3s ease;
      }

      .nbe-w-tl-card:hover {
        background: rgba(255,255,255,0.05);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
      }

      .nbe-w-tl-meta {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }

      .nbe-w-tl-phase {
        color: #F59E0B;
        font-family: 'Outfit', sans-serif;
      }

      .nbe-w-tl-date {
        color: rgba(255,255,255,0.3);
      }

      .nbe-w-tl-title {
        font-family: 'Outfit', sans-serif;
        font-weight: 800;
        font-size: 14px;
        color: #fff;
        margin: 0 0 6px;
        line-height: 1.3;
      }

      .nbe-w-tl-caption {
        font-size: 12px;
        color: rgba(255,255,255,0.45);
        margin: 0 0 10px;
        line-height: 1.5;
      }

      @media (max-width: 540px) {
        .nbe-w-timeline { padding-left: 36px; }
        .nbe-w-timeline::before { left: 14px; }
        .nbe-w-tl-node {
          left: -36px;
          width: 28px;
          height: 28px;
        }
        .nbe-w-tl-num { font-size: 10px; }
        .nbe-w-tl-card { padding: 12px 14px; }
      }

      /* ── Widget Detail Dialog ──────────────────────────── */
      dialog.nbe-w-dialog {
        border: none;
        background: transparent;
        padding: 0;
        max-width: 680px;
        width: 92vw;
        max-height: 90vh;
        border-radius: 14px;
        overflow: hidden;
      }

      dialog.nbe-w-dialog::backdrop {
        background: rgba(5,15,24,0.92);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }

      .nbe-w-dialog-panel {
        background: rgba(15,25,40,0.98);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        overflow: hidden;
        max-height: 88vh;
        overflow-y: auto;
        position: relative;
      }

      .nbe-w-dialog-close {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255,255,255,0.1);
        border: none;
        color: #fff;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        transition: all 0.2s ease;
      }

      .nbe-w-dialog-close:hover {
        background: rgba(255,255,255,0.2);
        transform: scale(1.1);
      }

      .nbe-w-dialog-media {
        width: 100%;
        max-height: 320px;
        overflow: hidden;
        background: #0a1628;
      }

      .nbe-w-dialog-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        max-height: 320px;
      }

      .nbe-w-dialog-video {
        width: 100%;
        aspect-ratio: 16/9;
      }

      .nbe-w-dialog-video iframe,
      .nbe-w-dialog-video video {
        width: 100%;
        height: 100%;
        border: none;
      }

      .nbe-w-dialog-content {
        padding: 24px 28px 28px;
      }

      .nbe-w-dialog-type {
        display: inline-block;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #F59E0B;
        font-family: 'Outfit', sans-serif;
        margin-bottom: 6px;
      }

      .nbe-w-dialog-title {
        font-family: 'Outfit', sans-serif;
        font-weight: 800;
        font-size: 22px;
        color: #fff;
        margin: 0 0 10px;
        line-height: 1.2;
        letter-spacing: -0.3px;
      }

      .nbe-w-dialog-meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 12px;
        color: rgba(255,255,255,0.4);
        margin-bottom: 18px;
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }

      .nbe-w-dialog-desc {
        font-size: 14px;
        color: rgba(255,255,255,0.7);
        line-height: 1.65;
      }

      .nbe-w-dialog-desc p {
        margin: 0 0 12px;
      }

      .nbe-w-dialog-desc p:last-child {
        margin-bottom: 0;
      }

      .nbe-w-dialog-footer {
        margin-top: 20px;
      }

      .nbe-w-dialog-cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 12px 24px;
        border-radius: 8px;
        background: linear-gradient(135deg, #F59E0B, #e08a00);
        color: #052038;
        font-weight: 700;
        font-size: 13px;
        text-decoration: none;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: all 0.3s ease;
        box-shadow: 0 0 14px rgba(245,158,11,0.25);
      }

      .nbe-w-dialog-cta:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 28px rgba(245,158,11,0.4);
      }

      @media (max-width: 540px) {
        .nbe-w-dialog-content { padding: 18px 20px 22px; }
        .nbe-w-dialog-title { font-size: 18px; }
        .nbe-w-dialog-media { max-height: 220px; }
        .nbe-w-dialog-img { max-height: 220px; }
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'nbe-widget-styles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }
});
