
// ==UserScript==
// @name         PS Importer Pro - Assistant
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Ctrl+Click images to send them to Photoshop.
// @author       Senior Engineer
// @match        *://*/*
// @grant        GM_setClipboard
// @grant        GM_notification
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const PREFIX = "PS_IMPORTER:";

    // Visual feedback overlay
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed', pointerEvents: 'none', border: '3px solid #0078d4',
        zIndex: '2147483647', display: 'none', transition: 'all 0.2s ease-out',
        borderRadius: '6px', boxShadow: '0 0 20px rgba(0,120,212,0.8)'
    });
    document.documentElement.appendChild(overlay);

    function showFeedback(rect) {
        Object.assign(overlay.style, {
            left: rect.left + 'px', top: rect.top + 'px',
            width: rect.width + 'px', height: rect.height + 'px',
            display: 'block', opacity: '1', transform: 'scale(1)'
        });
        setTimeout(() => {
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(1.1)';
        }, 300);
    }

    document.addEventListener('click', function(e) {
        if (e.ctrlKey || e.metaKey) {
            let target = e.target;
            let source = "";

            if (target.tagName === 'IMG') {
                source = target.src;
            } else {
                const bg = window.getComputedStyle(target).backgroundImage;
                const match = bg.match(/url\((['"]?)(.*?)\1\)/);
                if (match) source = match[2];
            }

            if (source) {
                e.preventDefault();
                e.stopPropagation();

                // Clean URL (remove canvas specific query params if needed)
                if (source.includes("gd-filems.dancf.com")) source = source.split('?')[0];

                GM_setClipboard(PREFIX + source);
                showFeedback(target.getBoundingClientRect());
                GM_notification({
                    text: "Image sent to Photoshop Importer",
                    title: "Importer Pro",
                    timeout: 1000
                });
            }
        }
    }, { capture: true });
})();
