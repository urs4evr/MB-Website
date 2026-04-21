// Monkey Block Landing Page JavaScript

// Set current year
document.getElementById('year').textContent = new Date().getFullYear();

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Track install button clicks
document.addEventListener('DOMContentLoaded', function() {
    // Find all install buttons
    const installButtons = document.querySelectorAll(
        '.install-btn, .cta-primary, .cta-button, a[href*="chromewebstore.google.com"]'
    );

    installButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Track in Amplitude if available
            if (window.mbAnalytics && window.mbAnalytics.track) {
                const location = this.dataset.location ||
                               this.dataset.track ||
                               'unknown';
                window.mbAnalytics.track('Install Button Clicked', {
                    button_location: location,
                    button_text: this.textContent.trim(),
                    timestamp: new Date().toISOString()
                });
            }
        });
    });
});
// Scroll-triggered animations
document.addEventListener('DOMContentLoaded', function() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: stop observing once animated
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe feature items
    document.querySelectorAll('.feature-item').forEach(item => {
        observer.observe(item);
    });

    // Observe summary cards
    document.querySelectorAll('.summary-card').forEach(card => {
        observer.observe(card);
    });

    // Observe review cards if they exist
    document.querySelectorAll('.review-card').forEach(card => {
        observer.observe(card);
    });

    // Smooth parallax effect for hero on scroll
    let ticking = false;
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const parallax = document.querySelector('.hero::before');
        if (parallax) {
            const speed = 0.5;
            const yPos = -(scrolled * speed);
            parallax.style.transform = `translateY(${yPos}px)`;
        }
        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    // Only add parallax on desktop
    if (window.innerWidth > 768) {
        window.addEventListener('scroll', requestTick);
    }

    // 3D hover effect removed for cleaner look
    
    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add loading class to images and remove when loaded
    document.querySelectorAll('.feature-screenshot img').forEach(img => {
        img.classList.add('loading');
        img.addEventListener('load', function() {
            this.classList.remove('loading');
            this.classList.add('loaded');
        });
    });
});

// Optional: Add gentle floating animation to badges
document.querySelectorAll('.feature-badge').forEach((badge, index) => {
    badge.style.animationDelay = `${index * 0.2}s`;
});
