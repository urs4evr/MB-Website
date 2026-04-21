/**
 * Welcome Page Script
 * Handles attribution data sync with the extension
 */

class WelcomePage {
  constructor() {
    // Get extension ID from URL params (passed by extension) or use default for production
    const params = new URLSearchParams(window.location.search);
    this.extensionId = params.get('ext_id') || 'ggccjkdgmlclpigflghjjkgeblgdgffe'; // Use dynamic ID if provided
    this.apiKey = 'ad0a670d36f60cd419802ccfb5252139';
    this.serverUrl = 'https://api.eu.amplitude.com';
    this.initAmplitude();
    this.initPage();
  }
  
  initAmplitude() {
    if (typeof amplitude !== 'undefined') {
      // Get fingerprint from URL if available for consistent device ID
      const params = new URLSearchParams(window.location.search);
      const fingerprint = params.get('fp') || this.generateSimpleFingerprint();
      
      // Consistent user ID generation
      const userId = localStorage.getItem('mb_user_id') || 
                     `user_welcome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (!localStorage.getItem('mb_user_id')) {
        localStorage.setItem('mb_user_id', userId);
      }
      
      amplitude.init(this.apiKey, userId, {
        serverUrl: this.serverUrl,
        deviceId: fingerprint,  // Use fingerprint as device ID for consistency
        includeReferrer: true,
        includeUtm: true,
        includeGclid: true,  // Google Click ID tracking
        includeFbclid: true,  // Facebook Click ID tracking
        saveParamsReferrerOncePerSession: false,
        trackingOptions: {
          ipAddress: true  // Enable IP tracking for geo-location
        }
      });
      
      // Set enhanced user properties
      amplitude.setUserProperties({
        platform: navigator.platform,
        language: navigator.language,
        source: 'welcome_page',
        has_extension: params.get('ext') === '1',
        browser_name: this.getBrowserName(),
        device_type: this.getDeviceType(),
        os_name: this.detectOS()
      });
      
      console.log('[Welcome] Amplitude initialized:', { userId, deviceId: fingerprint });
    } else {
      console.warn('[Welcome] Amplitude SDK not available');
    }
  }
  
  getExtensionId() {
    // Try to get extension ID from URL or use default
    const params = new URLSearchParams(window.location.search);
    return params.get('ext_id') || this.extensionId;
  }
  
  initPage() {
    const params = new URLSearchParams(window.location.search);
    const isFromExtension = params.get('ext') === '1';
    const fingerprint = params.get('fp');
    
    console.log('[Welcome] Page loaded', { isFromExtension, fingerprint });
    
    // Always update dashboard link with correct extension ID
    this.updateDashboardLink();
    
    if (isFromExtension && fingerprint) {
      // Page was opened by the extension for attribution
      this.sendAttributionData(fingerprint);
    }
    
    // Always show welcome content
    this.showWelcomeContent();
    this.trackPageView();
  }
  
  sendAttributionData(fingerprint) {
    try {
      // Get stored attribution data from website tracking
      const attribution = JSON.parse(localStorage.getItem('mb_attribution') || '{}');
      const userId = localStorage.getItem('mb_user_id');
      const installIntent = JSON.parse(localStorage.getItem('mb_install_intent') || '{}');
      
      // Check fingerprint mapping
      const fpData = JSON.parse(localStorage.getItem(`fp_${fingerprint}`) || '{}');
      
      // Check if install was recent (within 30 minutes)
      const isRecent = installIntent.timestamp && 
                       (Date.now() - installIntent.timestamp < 30 * 60 * 1000);
      
      console.log('[Welcome] Attribution data found:', {
        hasUserId: !!userId,
        hasAttribution: Object.keys(attribution).length > 0,
        isRecent,
        fingerprintMatch: fpData.user_id === userId
      });
      
      if (userId && (fpData.user_id === userId || isRecent)) {
        // Build attribution payload
        const payload = {
          type: 'attribution_data',
          userId: userId,
          deviceId: fingerprint,
          utm_source: attribution.utm_source,
          utm_medium: attribution.utm_medium,
          utm_campaign: attribution.utm_campaign,
          utm_content: attribution.utm_content,
          utm_term: attribution.utm_term,
          installIntentTime: installIntent.timestamp,
          referrer: attribution.referrer,
          landingPage: attribution.landing_page
        };
        
        // Send to extension via chrome.runtime.sendMessage
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage(this.extensionId, payload, (response) => {
            if (chrome.runtime.lastError) {
              console.error('[Welcome] Failed to send to extension:', chrome.runtime.lastError);
              // Try alternative method
              this.sendViaPostMessage(payload);
            } else {
              console.log('[Welcome] Attribution sent successfully:', response);
              this.showSyncSuccess();
            }
          });
        } else {
          // Fallback to postMessage
          this.sendViaPostMessage(payload);
        }
        
        // Track successful attribution sync in Amplitude
        if (typeof amplitude !== 'undefined') {
          amplitude.track('Attribution Synced', {
            method: 'welcome_page',
            fingerprint_match: fpData.user_id === userId,
            time_since_intent: isRecent ? Date.now() - installIntent.timestamp : null
          });
        }
      } else {
        console.log('[Welcome] No matching attribution data found');
        
        // Track when no attribution data is found
        if (typeof amplitude !== 'undefined') {
          amplitude.track('Attribution Not Found', {
            fingerprint: fingerprint,
            has_user_id: !!userId,
            has_attribution: Object.keys(attribution).length > 0,
            is_recent: isRecent,
            fingerprint_match: !!fpData.user_id
          });
        }
      }
      
    } catch (error) {
      console.error('[Welcome] Error sending attribution data:', error);
    }
  }
  
  sendViaPostMessage(payload) {
    // Alternative method using postMessage
    try {
      // Store data temporarily for the extension to retrieve
      sessionStorage.setItem('mb_extension_attribution', JSON.stringify(payload));
      
      // Notify via custom event
      window.dispatchEvent(new CustomEvent('mb_attribution_ready', {
        detail: payload
      }));
      
      console.log('[Welcome] Attribution data stored for retrieval');
    } catch (error) {
      console.error('[Welcome] Failed to store attribution:', error);
    }
  }
  
  showSyncSuccess() {
    // Show visual feedback that sync was successful
    const syncDiv = document.getElementById('attribution-sync');
    if (syncDiv) {
      syncDiv.style.display = 'block';
      syncDiv.innerHTML = '<div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); animation: slideIn 0.3s ease;">✓ Analytics synced successfully</div>';
      
      setTimeout(() => {
        syncDiv.style.display = 'none';
      }, 3000);
    }
  }
  
  updateDashboardLink() {
    // Update dashboard link behavior
    const dashboardLink = document.getElementById('open-dashboard');
    if (dashboardLink) {
      const params = new URLSearchParams(window.location.search);
      const isFromExtension = params.get('ext') === '1';
      
      if (isFromExtension) {
        // Dashboard was automatically opened in another tab
        dashboardLink.innerHTML = '📊 Switch to Dashboard Tab →';
        dashboardLink.classList.add('pulse-animation');
        
        // Remove href to prevent navigation issues
        dashboardLink.removeAttribute('href');
        dashboardLink.style.cursor = 'pointer';
        
        dashboardLink.addEventListener('click', (e) => {
          e.preventDefault();
          
          // Show helpful message
          const message = document.createElement('div');
          message.className = 'dashboard-hint';
          message.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: #7a9b8e; color: white; padding: 20px 30px; 
                        border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); 
                        z-index: 10000; text-align: center; animation: slideIn 0.3s ease;">
              <h3 style="margin: 0 0 10px 0;">Dashboard is already open! 🎉</h3>
              <p style="margin: 0 0 15px 0;">Look for the "Monkey Block" tab in your browser</p>
              <button onclick="this.parentElement.remove()" 
                      style="margin-top: 15px; padding: 8px 20px; background: white; 
                             color: #7a9b8e; border: none; border-radius: 6px; 
                             cursor: pointer; font-weight: bold;">Got it!</button>
            </div>
          `;
          document.body.appendChild(message);
          
          // Auto-remove after 5 seconds
          setTimeout(() => message.remove(), 5000);
        });
      } else {
        // If accessed directly without extension
        dashboardLink.innerHTML = '🚀 Install Extension First →';
        dashboardLink.href = 'https://chromewebstore.google.com/detail/monkey-block/YOUR_EXTENSION_ID';
        dashboardLink.target = '_blank';
      }
      
      console.log('[Welcome] Dashboard link updated');
    }
  }
  
  showWelcomeContent() {
    // Add any dynamic content or interactions here
    const features = document.querySelectorAll('.feature');
    features.forEach((feature, index) => {
      feature.style.animationDelay = (0.6 + index * 0.1) + 's';
    });
    
    // Add click tracking for dashboard button
    const dashboardBtn = document.getElementById('open-dashboard');
    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => {
        this.trackEvent('Dashboard Button Clicked', {
          source: 'welcome_page'
        });
      });
    }
  }
  
  // Fingerprint generation for consistent device ID
  generateSimpleFingerprint() {
    try {
      // Use SAME components as extension for consistency
      const components = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        languages: navigator.languages ? navigator.languages.join(',') : navigator.language,
        hardwareConcurrency: navigator.hardwareConcurrency || 4
      };
      
      // Convert to stable string
      const fingerprintString = JSON.stringify(components);
      
      // Generate two hashes for better distribution (same as extension)
      let hash1 = 0, hash2 = 5381;
      
      for (let i = 0; i < fingerprintString.length; i++) {
        const char = fingerprintString.charCodeAt(i);
        hash1 = ((hash1 << 5) - hash1) + char;
        hash2 = ((hash2 << 5) + hash2) + char;
        hash1 = hash1 & hash1; // Convert to 32-bit integer
        hash2 = hash2 & hash2;
      }
      
      // Format: fp_hash1_hash2 (same format as extension)
      return `fp_${Math.abs(hash1).toString(36)}_${Math.abs(hash2).toString(36)}`;
    } catch (error) {
      console.error('[Welcome] Fingerprint error:', error);
      return 'fp_' + Math.random().toString(36).substr(2, 9);
    }
  }

  // Helper methods for user properties
  getBrowserName() {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Chrome') !== -1) return 'Chrome';
    if (userAgent.indexOf('Firefox') !== -1) return 'Firefox';
    if (userAgent.indexOf('Safari') !== -1) return 'Safari';
    if (userAgent.indexOf('Edge') !== -1) return 'Edge';
    return 'Unknown';
  }

  getDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone/i.test(userAgent)) return 'Mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'Tablet';
    return 'Desktop';
  }

  detectOS() {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Win') !== -1) return 'Windows';
    if (userAgent.indexOf('Mac') !== -1) return 'macOS';
    if (userAgent.indexOf('Linux') !== -1) return 'Linux';
    if (userAgent.indexOf('Android') !== -1) return 'Android';
    if (userAgent.indexOf('like Mac') !== -1) return 'iOS';
    return 'Unknown';
  }
  
  trackPageView() {
    const params = new URLSearchParams(window.location.search);
    const isFromExtension = params.get('ext') === '1';
    
    // Main page view event
    this.trackEvent('Welcome Page Viewed', {
      from_extension: isFromExtension,
      has_fingerprint: !!params.get('fp'),
      has_version: !!params.get('v'),
      extension_id: params.get('ext_id'),
      page_load_time: window.performance?.timing ? 
        window.performance.timing.loadEventEnd - window.performance.timing.navigationStart : null
    });
    
    // Track installation source
    if (isFromExtension) {
      this.trackEvent('Extension Installed', {
        attribution_source: 'welcome_page',
        version: params.get('v'),
        fingerprint: params.get('fp'),
        extension_id: params.get('ext_id'),
        install_count: 1  // Welcome page is shown on first install
      });
      
    }
    
    // Track time on page and engagement
    this.startEngagementTracking();
  }

  startEngagementTracking() {
    const startTime = Date.now();
    let tracked30s = false;
    let tracked60s = false;
    let clickedDashboard = false;
    let maxScrollDepth = 0;
    let scrolledToBottom = false;
    
    // Track scroll depth
    const trackScrollDepth = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Calculate scroll percentage
      const scrollPercentage = Math.round((scrollTop + windowHeight) / documentHeight * 100);
      maxScrollDepth = Math.max(maxScrollDepth, scrollPercentage);
      
      // Check if user scrolled to bottom (within 5% of bottom)
      if (scrollPercentage >= 95 && !scrolledToBottom) {
        scrolledToBottom = true;
        this.trackEvent('Welcome Page - Scrolled to Bottom', {
          time_to_bottom: Math.floor((Date.now() - startTime) / 1000),
          scroll_depth: scrollPercentage
        });
      }
      
      // Track milestone scroll depths (25%, 50%, 75%)
      const milestones = [25, 50, 75];
      milestones.forEach(milestone => {
        if (scrollPercentage >= milestone && !this[`tracked${milestone}Scroll`]) {
          this[`tracked${milestone}Scroll`] = true;
          this.trackEvent(`Welcome Page - ${milestone}% Scroll`, {
            time_to_milestone: Math.floor((Date.now() - startTime) / 1000)
          });
        }
      });
    };
    
    // Debounced scroll tracking
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(trackScrollDepth, 100);
    });
    
    // Initial scroll check
    trackScrollDepth();
    
    // Track 30 second engagement
    setTimeout(() => {
      if (!tracked30s) {
        tracked30s = true;
        this.trackEvent('Welcome Page - 30s Engagement', {
          time_on_page: 30,
          max_scroll_depth: maxScrollDepth
        });
      }
    }, 30000);
    
    // Track 60 second engagement
    setTimeout(() => {
      if (!tracked60s) {
        tracked60s = true;
        this.trackEvent('Welcome Page - 60s Engagement', {
          time_on_page: 60,
          max_scroll_depth: maxScrollDepth
        });
      }
    }, 60000);

    // Track dashboard link clicks
    document.addEventListener('click', (e) => {
      if (e.target.href && e.target.href.includes('chrome-extension://')) {
        clickedDashboard = true;
        this.trackEvent('Welcome Page - Dashboard Clicked');
      }
    });
    
    // Track when leaving
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Math.floor((Date.now() - startTime) / 1000);
      this.trackEvent('Welcome Page - Left', {
        time_on_page: timeOnPage,
        clicked_dashboard: clickedDashboard,
        max_scroll_depth: maxScrollDepth,
        scrolled_to_bottom: scrolledToBottom
      });
    });
  }
  
  trackEvent(eventName, properties = {}) {
    // Track events if Amplitude is available
    if (typeof amplitude !== 'undefined') {
      amplitude.track(eventName, {
        ...properties,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('[Welcome] Event tracked:', eventName, properties);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.welcomePage = new WelcomePage();
  });
} else {
  window.welcomePage = new WelcomePage();
}
