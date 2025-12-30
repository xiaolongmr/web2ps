// ==UserScript==
// @name         PS图片导导 UserScript助手 (修复版 v1.80)
// @namespace    http://tampermonkey.net/
// @version      1.80
// @description  修复微信文章/容器嵌套图片无法获取的问题。支持向下探测子元素。
// @author       爱吃馍 & 优化助手
// @match        *://*/*
// @grant        GM_setClipboard
// @grant        GM_notification
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 1. UI 反馈元素
    // ==========================================
    const fx = document.createElement('div');
    Object.assign(fx.style, {
        position: 'fixed', pointerEvents: 'none', border: '4px solid #0078d4',
        zIndex: '2147483647', display: 'none', transition: 'all 0.15s ease-out',
        borderRadius: '4px', boxShadow: '0 0 15px rgba(0,120,212,0.6)',
        boxSizing: 'border-box'
    });
    if (document.documentElement) {
        document.documentElement.appendChild(fx);
    } else {
        window.addEventListener('DOMContentLoaded', () => document.documentElement.appendChild(fx));
    }

    // ==========================================
    // 2. URL 处理 (增强正则)
    // ==========================================
    function processImageUrl(url) {
        if (!url) return null;
        // 移除首尾引号、空白、回车符 (微信图片有时会有换行)
        let cleanUrl = url.replace(/^['"\s]+|['"\s]+$/g, '').trim();
        
        try {
            cleanUrl = new URL(cleanUrl, window.location.href).href;
        } catch (e) { console.error(e); }
    
        if (cleanUrl.includes("gd-filems.dancf.com")) return cleanUrl.split('?')[0];
        // B站去除参数
        if (cleanUrl.includes(".hdslb.com")) return cleanUrl.split('@')[0];
        // 京东图片去除.avif后缀
        if (cleanUrl.includes("360buyimg.com") && cleanUrl.endsWith(".avif")) {
            return cleanUrl.slice(0, -5); // 移除最后5个字符 ".avif"
        }
        
        return cleanUrl;
    }

    // ==========================================
    // 3. 名称提取
    // ==========================================
    function findBestName(startNode) {
        const DEFAULT_NAME = "馍馍就是人间美味";
        if (!startNode) return DEFAULT_NAME;

        let current = startNode;
        let depth = 0;
        const maxSearchDepth = 4; 

        while (current && depth < maxSearchDepth) {
            let name = current.getAttribute('alt') || 
                       current.getAttribute('title') || 
                       current.getAttribute('aria-label');
            
            if (!name && current.tagName === 'SPAN' && current.innerText.length < 50) {
                 name = current.innerText;
            }

            if (name && name.trim()) return name.trim();
            current = current.parentElement;
            depth++;
        }
        return DEFAULT_NAME;
    }

    // ==========================================
    // 4. 核心探测 (全面升级：上/下/左/右)
    // ==========================================
    
    // 提取背景图 URL 的工具函数
    function extractBgUrl(node, pseudo=null) {
        try {
            const bg = window.getComputedStyle(node, pseudo).backgroundImage;
            if (bg && bg !== 'none') {
                // 升级版正则：支持换行符，支持空格
                const m = bg.match(/url\(\s*(?:['"]?)([\s\S]*?)(?:['"]?)\s*\)/);
                if (m && m[1]) return m[1];
            }
        } catch(e){}
        return null;
    }

    // 检查单个节点
    function checkNode(node) {
        if (!node || node.nodeType !== 1) return null;
        // 1. 检查 IMG 标签
        if (node.tagName === 'IMG' && node.src) return { url: node.src, element: node };
        // 2. 检查 背景图
        let url = extractBgUrl(node);
        if (url) return { url: url, element: node };
        // 3. 检查 伪类
        if (url = extractBgUrl(node, '::before')) return { url: url, element: node };
        if (url = extractBgUrl(node, '::after')) return { url: url, element: node };
        
        return null;
    }

    // 【新增】向下探测子元素 (解决微信嵌套问题)
    function checkChildren(node) {
        if (!node || node.nodeType !== 1) return null;
        
        // 尝试查找内部的 IMG
        const img = node.querySelector('img');
        if (img && img.src) return { url: img.src, element: img };

        // 尝试查找内部有 style="background-image..." 的元素 (针对你的截图场景)
        const bgEl = node.querySelector('[style*="background-image"]');
        if (bgEl) {
             let url = extractBgUrl(bgEl);
             if (url) return { url: url, element: bgEl };
        }
        
        // 如果是用 class 控制的背景图，尝试找 i 标签 (微信常用 i 做背景容器)
        const iTag = node.querySelector('i');
        if (iTag) {
             let url = extractBgUrl(iTag);
             if (url) return { url: url, element: iTag };
        }

        return null;
    }

    function findTargetImage(startNode) {
        let current = startNode;
        let depth = 0;
        const maxDepth = 5;

        while (current && current !== document.body && depth < maxDepth) {
            // 1. 查自己
            let res = checkNode(current);
            if (res) return res;

            // 2. 【新增】查内部子元素 (解决容器嵌套问题)
            // 只有当当前节点是 DIV/SPAN/SECTION 等容器时才查，避免性能浪费
            if (['DIV', 'SPAN', 'SECTION', 'A', 'LI'].includes(current.tagName)) {
                let childRes = checkChildren(current);
                if (childRes) return childRes;
            }

            // 3. 查前兄弟 (解决视频封面问题)
            if (current.previousElementSibling) {
                let prevRes = checkNode(current.previousElementSibling);
                if (prevRes) return prevRes;
            }

            // 4. 查后兄弟
            if (current.nextElementSibling) {
                let nextRes = checkNode(current.nextElementSibling);
                if (nextRes) return nextRes;
            }

            // 5. 向上爬
            current = current.parentElement;
            depth++;
        }
        return null;
    }

    // ==========================================
    // 5. 事件监听
    // ==========================================
    const eventsToBlock = ['click', 'mousedown', 'mouseup', 'pointerdown'];

    eventsToBlock.forEach(eventName => {
        document.addEventListener(eventName, function(e) {
            if (e.ctrlKey || e.metaKey) {
                // 优先从点击目标开始找
                const result = findTargetImage(e.target);

                if (result) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    if (eventName === 'click') {
                        const finalUrl = processImageUrl(result.url);
                        
                        if (finalUrl) {
                            let finalName = findBestName(result.element);
                            if(finalName === "馍馍就是人间美味") finalName = findBestName(e.target);

                            const isNewDocMode = e.altKey;

                            // UI 反馈
                            const borderColor = isNewDocMode ? '#d13438' : '#0078d4';
                            fx.style.border = `4px solid ${borderColor}`;
                            fx.style.boxShadow = `0 0 15px ${isNewDocMode ? 'rgba(209,52,56,0.6)' : 'rgba(0,120,212,0.6)'}`;
                            
                            const rect = result.element.getBoundingClientRect();
                            Object.assign(fx.style, {
                                left: rect.left + 'px', top: rect.top + 'px',
                                width: rect.width + 'px', height: rect.height + 'px',
                                display: 'block', opacity: '1', transform: 'scale(1)'
                            });
                            setTimeout(() => { fx.style.opacity = '0'; fx.style.transform = 'scale(1.05)'; }, 200);

                            // 写入剪贴板
                            let clipboardStr = `PS_IMPORTER:${finalUrl}|||${finalName}`;
                            if (isNewDocMode) clipboardStr += "|||NEW_DOC";
                            
                            GM_setClipboard(clipboardStr);

                            GM_notification({
                                text: finalUrl.length > 50 ? "..." + finalUrl.slice(-40) : finalUrl,
                                title: `[${isNewDocMode ? "新建" : "置入"}] ${finalName}`,
                                timeout: 1000
                            });
                        }
                    }
                }
            }
        }, { capture: true, passive: false });
    });
})();