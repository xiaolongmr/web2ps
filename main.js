// main.js

(function() {

    const { app, core } = require("photoshop");
    const { storage } = require("uxp");
    
    const i18nMain = require("./locales/index.js");

    let lastUrl = ""; 
    let isAutoRunning = false; // 状态标记
    let lastCreatedFileEntry = null;
    
    // ==========================================
    // 下载队列管理系统
    // ==========================================
    let downloadQueue = [];
    let isProcessingQueue = false;

    // 添加任务到队列
    function addToQueue(url, layerName, forceNewDoc = false) {
        const taskId = Date.now() + Math.random().toString(36).substr(2, 9);
        const task = {
            id: taskId,
            url: url,
            layerName: layerName,
            forceNewDoc: forceNewDoc,
            status: 'pending', // pending, processing, completed, failed
            addedTime: new Date()
        };
        
        downloadQueue.push(task);
        console.log(`任务已添加到队列: ${layerName} (队列长度: ${downloadQueue.length})`);
        
        // 更新UI显示队列状态
        updateQueueUI();
        
        // 如果队列未在处理中，开始处理
        if (!isProcessingQueue) {
            processQueue();
        }
        
        return taskId;
    }

    // 处理队列
    async function processQueue() {
        if (isProcessingQueue || downloadQueue.length === 0) {
            return;
        }
        
        isProcessingQueue = true;
        
        while (downloadQueue.length > 0) {
            const currentTask = downloadQueue[0];
            
            // 跳过已处理的任务
            if (currentTask.status === 'completed' || currentTask.status === 'failed') {
                downloadQueue.shift();
                continue;
            }
            
            // 更新任务状态为处理中
            currentTask.status = 'processing';
            updateQueueUI();
            
            try {
                // 更新UI显示当前处理任务
                const st = document.getElementById("st");
                if (st) st.innerText = `${i18nMain.queueProcessing}${truncateText(currentTask.layerName)}`;
                
                // 添加重试机制
                let retryCount = 0;
                const maxRetries = 2;
                let success = false;
                
                while (retryCount <= maxRetries && !success) {
                    try {
                        await autoImportTask(currentTask.url, currentTask.layerName, currentTask.forceNewDoc);
                        success = true;
                    } catch (error) {
                        retryCount++;
                        if (retryCount > maxRetries) {
                            throw error; // 达到最大重试次数，抛出错误
                        }
                        console.log(`任务重试 ${retryCount}/${maxRetries}: ${currentTask.layerName}`);
                        
                        // 等待一段时间后重试
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                    }
                }
                
                // 标记任务完成
                currentTask.status = 'completed';
                currentTask.completedTime = new Date();
                
                console.log(`队列任务完成: ${currentTask.layerName}`);
                
                // 从队列中移除已完成的任务
                downloadQueue.shift();
                
                // 更新UI
                updateQueueUI();
                
            } catch (error) {
                console.error(`队列任务失败: ${currentTask.layerName}`, error);
                currentTask.status = 'failed';
                currentTask.error = error.message;
                
                // 失败的任务也移除
                downloadQueue.shift();
                
                updateQueueUI();
            }
            
            // 处理完一个任务后等待一下，避免过快处理
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        isProcessingQueue = false;
        
        // 队列处理完成后，恢复监听状态
        const st = document.getElementById("st");
        if (st && isAutoRunning) st.innerText = i18nMain.listening;
    }

    // 更新队列UI显示
    function updateQueueUI() {
        const queueInfo = document.getElementById('queue-info');
        
        if (queueInfo) {
            const totalCount = downloadQueue.length;
            
            if (totalCount > 0) {
                queueInfo.innerText = `队列: 剩余${totalCount}个`;
                queueInfo.style.display = 'block';
            } else {
                queueInfo.style.display = 'none';
            }
        }
    }

    // 处理长文本，添加省略号
    function truncateText(text, maxLength = 20) {
        if (!text || text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }

    // ==========================================
    // 1. 核心功能 (导入任务 - 保持不变)
    // ==========================================
    async function autoImportTask(url, layerName, forceNewDoc = false) {
        try {
            let fileExt = ".jpg"; // 默认使用jpg格式
            const isSVG = url.toLowerCase().includes(".svg") || url.startsWith("data:image/svg+xml");
            
            if (isSVG) {
                fileExt = ".svg";
            } else if (!url.startsWith("data:") && url.toLowerCase().includes("webp")) {
                fileExt = ".webp";
            } else if (!url.startsWith("data:") && url.toLowerCase().includes(".png")) {
                fileExt = ".png";
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

        // 2. 开始循环（智能节流：有队列任务时降低频率）
            let consecutiveEmptyChecks = 0;
            
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
                            
                            // 使用队列系统而不是直接处理
                            addToQueue(currentUrl, currentName, isForceNew);
                            
                            // 显示队列状态
                            if (st) st.innerText = `${i18nMain.queueAdded}${truncateText(currentName)}`; 
                            
                            // 重置连续空检查计数
                            consecutiveEmptyChecks = 0;
                        }
                    } else {
                        // 没有检测到有效内容，增加空检查计数
                        consecutiveEmptyChecks++;
                    }
                } catch (err) {
                    // ignore
                }
                
                // 智能延时：有队列任务时降低频率，无任务时提高频率
                let delayTime = 800; // 默认延时
                
                if (downloadQueue.length > 0) {
                    // 有队列任务时，降低监听频率（减少CPU占用）
                    delayTime = 1500;
                } else if (consecutiveEmptyChecks > 5) {
                    // 连续多次空检查后，降低频率（节能模式）
                    delayTime = 2000;
                }
                
                await new Promise(resolve => setTimeout(resolve, delayTime));
            }
    }

    // 绑定按钮事件
    const goBtn = document.getElementById("go");
    if (goBtn) {
        // 以前是 startMonitoring, 现在改名为 toggleMonitoring
        goBtn.onclick = toggleMonitoring;
    }

})();