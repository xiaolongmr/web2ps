// main.js

(function() {

    const { app, core } = require("photoshop");
    const { storage } = require("uxp");
    
    const i18nMain = require("./locales/index.js");

    let lastUrl = ""; 
    let isAutoRunning = false; // 状态标记
    let lastCreatedFileEntry = null;

    // ==========================================
    // 1. 核心功能 (导入任务 - 保持不变)
    // ==========================================
    async function autoImportTask(url, layerName, forceNewDoc = false) {
        try {
            let fileExt = ".png";
            const isSVG = url.toLowerCase().includes(".svg") || url.startsWith("data:image/svg+xml");
            
            if (isSVG) {
                fileExt = ".svg";
            } else if (!url.startsWith("data:") && url.toLowerCase().includes("webp")) {
                fileExt = ".webp";
            }

            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            
            const tempFolder = await storage.localFileSystem.getTemporaryFolder();
            const randomId = Math.floor(1000 + Math.random() * 9000);
            const fileName = `${i18nMain.filePrefix}_${randomId}${fileExt}`;
            const tempFile = await tempFolder.createFile(fileName, { overwrite: true });
            await tempFile.write(buffer);

            lastCreatedFileEntry = tempFile;

            const psToken = await storage.localFileSystem.createSessionToken(tempFile);

            await core.executeAsModal(async () => {
                let targetLayer = null;
                const shouldOpenAsNew = (app.documents.length === 0) || (forceNewDoc && !isSVG);

                if (shouldOpenAsNew) {
                    const newDoc = await app.open(tempFile);
                    if (newDoc.activeLayers.length > 0) {
                        targetLayer = newDoc.activeLayers[0];
                    }
                } else {
                    const { batchPlay } = require("photoshop").action;
                    if (app.documents.length === 0) {
                        await app.documents.add({width: 2000, height: 2000, resolution: 72, mode: "RGBColorMode"});
                    }
                    await batchPlay([{
                        _obj: "placeEvent",
                        null: { _path: psToken, _kind: "local" },
                        linked: false, 
                        _options: { dialogOptions: "dontDisplay" } 
                    }], {});
                    targetLayer = app.activeDocument.activeLayers[0];
                }

                if (targetLayer && layerName) {
                    try { targetLayer.name = layerName; } catch (err) {}
                }

            }, {"commandName": "Auto Import Task"});
            
            console.log(`${i18nMain.success}${layerName} [ID:${randomId}]`);
        } catch (e) {
            console.error("Task Error:", e);
        }
    }

    // ==========================================
    // 2. 监听与开关逻辑 (重点修改)
    // ==========================================
    async function toggleMonitoring() {
        const st = document.getElementById("st");
        const btn = document.getElementById("go");

        // --- 情况 A: 正在运行，用户想停止 ---
        if (isAutoRunning) {
            isAutoRunning = false; // 1. 改变标志位，循环会在下一次检测时自动退出
            
            // 2. 更新 UI 为“停止状态”
            if (st) st.innerText = i18nMain.wait;  // "等待启动..."
            if (btn) btn.innerText = i18nMain.start; // "开启自动监控"
            
            if (window.updateUIState) window.updateUIState(false); // 关灯
            
            console.log("Monitoring Stopped");
            return; // 退出函数
        }

        // --- 情况 B: 未运行，用户想开启 ---
        isAutoRunning = true;
        console.log("Monitoring Started");

        // 1. 更新 UI 为“运行状态”
        // 这里的文案不再重复：上方显示“正在监听”，按钮显示“停止”
        if (st) st.innerText = i18nMain.listening; // "正在监听剪贴板..."
        if (btn) btn.innerText = i18nMain.stop;     // "停止自动监控"
        
        if (window.updateUIState) window.updateUIState(true); // 开灯

        // 2. 开始循环
        while (isAutoRunning) {
            // 每次循环开始前，再次检查标志位（防止延迟）
            if (!isAutoRunning) break;

            try {
                const clipboardData = await navigator.clipboard.readText();
                const rawString = typeof clipboardData === "string" ? clipboardData : JSON.stringify(clipboardData);

                if (rawString && rawString.includes("PS_IMPORTER:")) {
                    let contentRaw = rawString.split("PS_IMPORTER:")[1]
                                            .split('"}')[0]
                                            .replace(/\\/g, "")
                                            .trim();

                    let parts = contentRaw.split("|||");
                    let currentUrl = parts[0];
                    let currentName = (parts.length > 1 && parts[1].trim() !== "") ? parts[1] : i18nMain.layerName;
                    let isForceNew = (parts.length > 2 && parts[2] === "NEW_DOC");

                    if (currentUrl !== lastUrl) {
                        lastUrl = currentUrl; 
                        
                        // 临时显示处理状态
                        if (st) st.innerText = `${i18nMain.processing}${currentName}...`;
                        
                        await autoImportTask(currentUrl, currentName, isForceNew);
                        
                        // 恢复“监听中”状态 (如果还没停止的话)
                        if (isAutoRunning && st) st.innerText = i18nMain.listening; 
                    }
                }
            } catch (err) {
                // ignore
            }
            // 延时 800ms
            await new Promise(resolve => setTimeout(resolve, 800));
        }
    }

    // 绑定按钮事件
    const goBtn = document.getElementById("go");
    if (goBtn) {
        // 以前是 startMonitoring, 现在改名为 toggleMonitoring
        goBtn.onclick = toggleMonitoring;
    }

})();