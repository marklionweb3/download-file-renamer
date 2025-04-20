// 下载管理状态
const downloadManager = {
    batchDownloads: new Map(),
    history: [],
    maxHistoryItems: 100
};

// 默认AI服务配置
const DEFAULT_AI_SERVICES = [
    {
        id: 'custom-default',
        name: '自定义API',
        endpoint: 'https://api.example.com/v1/chat/completions',
        model: 'gpt-3.5-turbo',
        apiKey: '',
        isDefault: true
    }
];

// 监听下载创建事件
chrome.downloads.onCreated.addListener((downloadItem) => {
    // 处理批量下载
    const timestamp = Date.now();
    if (downloadManager.batchDownloads.size > 0 && 
        timestamp - Array.from(downloadManager.batchDownloads.values())[0].timestamp < 1000) {
        // 认为是批量下载
        downloadManager.batchDownloads.set(downloadItem.id, {
            timestamp,
            item: downloadItem
        });
    } else {
        downloadManager.batchDownloads.clear();
        downloadManager.batchDownloads.set(downloadItem.id, {
            timestamp,
            item: downloadItem
        });
    }

    // 显示开始下载通知
    chrome.notifications.create(`download-${downloadItem.id}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: '开始下载',
        message: `文件: ${downloadItem.filename}`,
        priority: 0
    });
});

// 监听下载状态变化
chrome.downloads.onChanged.addListener((delta) => {
    if (delta.state && delta.state.current === 'complete') {
        // 获取下载项信息
        chrome.downloads.search({id: delta.id}, (items) => {
            if (items && items.length > 0) {
                const downloadItem = items[0];
                
                // 添加到历史记录
                addToHistory({
                    id: downloadItem.id,
                    originalName: downloadItem.filename.split('/').pop(),
                    newName: downloadItem.filename,
                    url: downloadItem.url,
                    date: new Date().toISOString(),
                    fileSize: downloadItem.fileSize,
                    mimeType: downloadItem.mime,
                    timestamp: Date.now() // 添加时间戳
                });

                // 显示完成通知
                chrome.notifications.create(`download-complete-${delta.id}`, {
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                    title: '下载完成',
                    message: downloadItem.filename,
                    buttons: [
                        { title: '打开文件' },
                        { title: '打开所在文件夹' }
                    ],
                    priority: 1
                });
            }
        });
    } else if (delta.state && delta.state.current === 'canceled') {
        // 用户取消下载时不显示通知
        console.log(`下载已取消: ${delta.id}`);
    } else if (delta.error) {
        // 显示错误通知
        chrome.notifications.create(`download-error-${delta.id}`, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon48.png'),
            title: '下载失败',
            message: `错误: ${delta.error.current}`,
            priority: 2
        });
    }
});

// 监听通知按钮点击
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId.startsWith('download-complete-')) {
        const downloadId = parseInt(notificationId.replace('download-complete-', ''));
        if (buttonIndex === 0) {
            chrome.downloads.open(downloadId);
        } else {
            chrome.downloads.show(downloadId);
        }
    }
});

// 添加到历史记录
async function addToHistory(downloadInfo) {
    try {
        const data = await chrome.storage.local.get('downloadHistory');
        let history = data.downloadHistory || [];
        
        // 添加新记录到开头
        history.unshift(downloadInfo);
        
        // 限制历史记录数量
        if (history.length > downloadManager.maxHistoryItems) {
            history = history.slice(0, downloadManager.maxHistoryItems);
        }
        
        await chrome.storage.local.set({ downloadHistory: history });
    } catch (error) {
        console.error('保存下载历史失败:', error);
    }
}

// 清理历史记录中的过时通知
async function cleanupHistoryNotifications() {
    try {
        const data = await chrome.storage.local.get('downloadHistory');
        let history = data.downloadHistory || [];
        
        // 如果没有历史记录，则不需要清理
        if (history.length === 0) {
            return;
        }
        
        // 获取当前时间，并设置一个合理的时间阈值（如1天）
        const currentTime = Date.now();
        const validThreshold = currentTime - (24 * 60 * 60 * 1000); // 1天前
        
        // 过滤出有效的历史记录
        const validHistory = history.filter(item => {
            // 如果记录没有时间戳，或者时间戳在有效期内，则保留
            return !item.timestamp || item.timestamp > validThreshold;
        });
        
        // 如果经过过滤后的记录数量与原数量不同，则更新存储
        if (validHistory.length !== history.length) {
            await chrome.storage.local.set({ downloadHistory: validHistory });
            console.log(`已清理 ${history.length - validHistory.length} 条过时的下载记录`);
        }
    } catch (error) {
        console.error('清理历史记录通知失败:', error);
    }
}

// 在扩展启动时清理历史记录
chrome.runtime.onStartup.addListener(() => {
    cleanupHistoryNotifications();
});

// 在安装或更新扩展时也清理历史记录
chrome.runtime.onInstalled.addListener(() => {
    cleanupHistoryNotifications();
});

// 监听下载事件
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    // 使用Promise包装异步操作
    (async () => {
        try {
            // 获取保存的配置，设置默认值
            const config = await chrome.storage.local.get({
                useTimestamp: true,
                forceEnglish: false,
                namePattern: '{mainTopic}_{siteName}_{date}',
                enableAI: false,
                defaultAIService: 'openai',
                apiConfigs: DEFAULT_AI_SERVICES,
                aiTimeout: 3, // 默认3秒
                proxy: {
                    type: 'http',
                    host: '',
                    port: 80,
                    username: '',
                    password: '',
                    enabled: false
                }
            });

            // 获取当前标签页信息
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error('无法获取当前标签页信息');
            }

            // 构建文件名所需的基础数据
            const pageData = {
                url: tab.url || downloadItem.url,
                title: tab.title || downloadItem.filename,
                originalFilename: downloadItem.filename,
                timestamp: new Date().toISOString()
            };

            // 生成临时文件名（不使用AI）
            const tempFilename = generateFilename({
                mainTopic: pageData.title,
                siteName: new URL(pageData.url).hostname.replace('www.', ''),
                date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                timestamp: Date.now()
            }, {
                pattern: config.namePattern,
                useTimestamp: config.useTimestamp,
                forceEnglish: config.forceEnglish
            });

            // 获取文件扩展名
            const extension = downloadItem.filename.split('.').pop();
            const tempFinalFilename = `${tempFilename}.${extension}`;

            // 如果设置了默认下载路径
            let savePath = '';
            if (config.defaultSavePath) {
                savePath = `${config.defaultSavePath}/`;
            }

            // 如果启用了AI，等待AI生成文件名
            if (config.enableAI) {
                // 获取当前选择的API配置
                const selectedApi = config.apiConfigs.find(api => api.id === config.defaultAIService);
                console.log('选择的API服务:', config.defaultAIService);
                console.log('API配置:', selectedApi ? JSON.stringify({
                    id: selectedApi.id,
                    name: selectedApi.name,
                    hasApiKey: !!selectedApi.apiKey,
                    endpoint: selectedApi.endpoint
                }) : '未找到');
                
                if (selectedApi && selectedApi.apiKey && selectedApi.endpoint) {
                    try {
                        console.log('正在使用AI生成文件名...');
                        
                        // 创建一个Promise，包含超时控制
                        const aiPromise = new Promise(async (resolve, reject) => {
                            try {
                                const mainTopic = await getAISummary(pageData.title, config);
                                console.log('AI生成的主题:', mainTopic);

                                // 生成最终文件名
                                const newFilename = generateFilename({
                                    mainTopic,
                                    siteName: new URL(pageData.url).hostname.replace('www.', ''),
                                    date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                                    timestamp: Date.now()
                                }, {
                                    pattern: config.namePattern,
                                    useTimestamp: config.useTimestamp,
                                    forceEnglish: config.forceEnglish
                                });

                                // 在扩展名前添加_ai标记
                                resolve(`${newFilename}_ai.${extension}`);
                            } catch (error) {
                                console.error('AI主题生成失败:', error.message);
                                reject(error);
                            }
                        });

                        // 设置超时
                        const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => {
                                console.log(`AI响应超时 (${config.aiTimeout}秒)`);
                                reject(new Error('AI响应超时'));
                            }, config.aiTimeout * 1000);
                        });

                        try {
                            // 等待AI响应或超时
                            console.log(`等待AI响应，超时时间: ${config.aiTimeout}秒`);
                            const finalFilename = await Promise.race([aiPromise, timeoutPromise]);
                            console.log('AI响应成功，最终文件名:', finalFilename);

                            // 使用AI生成的文件名
                            suggest({
                                filename: savePath + finalFilename,
                                conflict_action: 'uniquify',
                                conflictAction: 'uniquify'
                            });
                        } catch (error) {
                            console.error('AI处理失败:', error.message);
                            // 超时或失败时使用临时文件名
                            console.log('使用本地命名策略:', tempFinalFilename);
                            suggest({
                                filename: savePath + tempFinalFilename,
                                conflict_action: 'uniquify',
                                conflictAction: 'uniquify'
                            });
                        }
                    } catch (error) {
                        console.error('AI处理过程出错:', error.message);
                        // 处理失败时使用临时文件名
                        console.log('使用本地命名策略:', tempFinalFilename);
                        suggest({
                            filename: savePath + tempFinalFilename,
                            conflict_action: 'uniquify',
                            conflictAction: 'uniquify'
                        });
                    }
                } else {
                    if (!selectedApi) {
                        console.warn(`未找到ID为"${config.defaultAIService}"的API配置`);
                    } else if (!selectedApi.apiKey) {
                        console.warn(`API "${selectedApi.name}" 未配置API密钥`);
                    } else if (!selectedApi.endpoint) {
                        console.warn(`API "${selectedApi.name}" 未配置端点URL`);
                    }
                    
                    // API未配置时使用临时文件名
                    console.log('使用本地命名策略:', tempFinalFilename);
                    suggest({
                        filename: savePath + tempFinalFilename,
                        conflict_action: 'uniquify',
                        conflictAction: 'uniquify'
                    });
                }
            } else {
                // 如果AI未启用，使用临时文件名
                console.log('AI未启用，使用本地命名策略:', tempFinalFilename);
                suggest({
                    filename: savePath + tempFinalFilename,
                    conflict_action: 'uniquify',
                    conflictAction: 'uniquify'
                });
            }
        } catch (error) {
            console.error('处理下载时出错:', error);
            // 发生错误时使用原始文件名
            suggest({
                filename: downloadItem.filename,
                conflict_action: 'uniquify',
                conflictAction: 'uniquify'
            });
        }
    })().catch(error => {
        console.error('未处理的错误:', error);
        // 确保在发生未处理的错误时也能提供默认文件名
        suggest({
            filename: downloadItem.filename,
            conflict_action: 'uniquify',
            conflictAction: 'uniquify'
        });
    });

    // 返回true表示我们会异步调用suggest
    return true;
});

// 生成文件名
function generateFilename(data, config) {
    // 清理变量中可能包含的文件扩展名
    let cleanMainTopic = sanitizeFilename(data.mainTopic).replace(/\.(zip|rar|tar|gz|7z|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|html|htm|xml|json|csv|jpg|jpeg|png|gif|bmp|svg|mp3|mp4|avi|mov|wmv|flv|mkv|webm)$/i, '');
    let cleanSiteName = sanitizeFilename(data.siteName).replace(/\.(zip|rar|tar|gz|7z|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|html|htm|xml|json|csv|jpg|jpeg|png|gif|bmp|svg|mp3|mp4|avi|mov|wmv|flv|mkv|webm)$/i, '');
    
    let filename = config.pattern
        .replace('{mainTopic}', cleanMainTopic)
        .replace('{siteName}', cleanSiteName)
        .replace('{date}', data.date)
        .replace('{timestamp}', data.timestamp);

    // 强制英文处理
    if (config.forceEnglish) {
        filename = filename
            .replace(/[\u4e00-\u9fa5]/g, '') // 移除中文字符
            .replace(/[^\w\-]/g, '_') // 将非字母数字字符替换为下划线
            .replace(/_+/g, '_') // 将多个下划线合并为一个
            .replace(/^_|_$/g, ''); // 移除首尾下划线
    }

    // 添加时间戳
    if (config.useTimestamp && !filename.includes(data.date)) {
        filename += `_${data.date}`;
    }

    return sanitizeFilename(filename);
}

// 清理文件名
function sanitizeFilename(filename) {
    return filename
        .replace(/[\\/:*?"<>|]/g, '_') // 替换Windows不允许的字符
        .replace(/\s+/g, '_') // 替换空白字符为下划线
        .replace(/_+/g, '_') // 合并多个下划线
        .trim();
}

// 调用AI API获取主题摘要
async function getAISummary(content, config) {
    try {
        // 获取当前选择的API配置
        const apiConfig = config.apiConfigs.find(api => api.id === config.defaultAIService);
        if (!apiConfig) {
            throw new Error('未找到API配置');
        }

        console.log(`使用API服务: ${apiConfig.name} (${apiConfig.id})`);
        
        // 构建请求选项
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // 根据不同的API服务设置不同的请求参数
        let endpoint = apiConfig.endpoint;
        let body = {};
        
        // 统一的简短提示词
        const prompt = content;
        
        // 根据是否强制英文设置不同的系统消息
        let systemMessage = '';
        if (config.forceEnglish) {
            systemMessage = 'You are a file naming assistant. Summarize the topic in up to 8 English words. Translate any non-English content to English. Provide only the result without explanation.';
        } else {
            systemMessage = 'You are a file naming assistant. Summarize the topic in 8 Chinese characters or 8 English words. Provide only the result without explanation.';
        }

        console.log('发送请求到:', endpoint);
        
        switch (apiConfig.id) {
            case 'openai':
                requestOptions.headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
                body = {
                    model: apiConfig.model || 'gpt-3.5-turbo',
                    messages: [{
                        role: 'system',
                        content: systemMessage
                    }, {
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 30,
                    temperature: 0.1
                };
                break;
                
            case 'azure':
                requestOptions.headers['api-key'] = apiConfig.apiKey;
                body = {
                    messages: [{
                        role: 'system',
                        content: systemMessage
                    }, {
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 30,
                    temperature: 0.1
                };
                break;
                
            case 'baidu':
                // 获取百度API访问令牌
                const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiConfig.apiKey}&client_secret=${apiConfig.secretKey}`;
                const tokenResponse = await fetch(tokenUrl);
                
                if (!tokenResponse.ok) {
                    throw new Error(`获取访问令牌失败: ${tokenResponse.status}`);
                }
                
                const tokenData = await tokenResponse.json();
                if (!tokenData.access_token) {
                    throw new Error('响应中没有访问令牌');
                }
                
                endpoint = `${apiConfig.endpoint}?access_token=${tokenData.access_token}`;
                body = {
                    messages: [{
                        role: 'system',
                        content: systemMessage
                    }, {
                        role: 'user',
                        content: prompt
                    }],
                    temperature: 0.1,
                    top_p: 0.1
                };
                break;
                
            case 'deepseek':
                requestOptions.headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
                body = {
                    model: apiConfig.model || 'deepseek-chat',
                    messages: [{
                        role: 'system',
                        content: systemMessage
                    }, {
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 30,
                    temperature: 0.1
                };
                break;
                
            case 'guiji':
                requestOptions.headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
                body = {
                    model: apiConfig.model || 'glm-4',
                    messages: [{
                        role: 'system',
                        content: systemMessage
                    }, {
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 30,
                    temperature: 0.1,
                    stream: false
                };
                break;
                
            default:
                // 自定义API
                requestOptions.headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
                body = {
                    model: apiConfig.model || 'gpt-3.5-turbo', // 确保model字段存在
                    messages: [{
                        role: 'system',
                        content: systemMessage
                    }, {
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 30,
                    temperature: 0.1
                };
        }

        requestOptions.body = JSON.stringify(body);

        // 不在这里设置超时，而是由外层控制
        console.log('发送API请求...');
        const response = await fetch(endpoint, requestOptions);

        if (!response.ok) {
            const errorText = await response.text().catch(() => '无法获取错误详情');
            console.error(`API请求失败: 状态码 ${response.status}, 错误: ${errorText}`);
            throw new Error(`API请求失败: ${response.status}`);
        }

        console.log('API响应成功，解析数据...');
        const data = await response.json();
        console.log('API响应数据:', JSON.stringify(data).substring(0, 200) + '...');
        
        // 处理不同API的响应格式
        let summary = '';
        try {
            // 自定义API - 处理多种可能的响应格式
            if (data.choices && data.choices[0]) {
                if (data.choices[0].message && data.choices[0].message.content) {
                    // OpenAI格式响应
                    summary = data.choices[0].message.content.trim();
                } else if (data.choices[0].text) {
                    // 旧版OpenAI格式
                    summary = data.choices[0].text.trim();
                } else if (typeof data.choices[0] === 'string') {
                    // 纯文本响应
                    summary = data.choices[0].trim();
                }
            } else if (data.result) {
                // 百度格式响应
                summary = data.result.trim();
            } else if (data.response) {
                // 某些API可能使用response字段
                summary = data.response.trim();
            } else if (data.content) {
                // 直接包含content字段
                summary = data.content.trim();
            } else if (data.text) {
                // 直接包含text字段
                summary = data.text.trim();
            } else {
                console.error('无法从自定义API响应中提取内容:', JSON.stringify(data));
                throw new Error('无法从自定义API响应中提取内容');
            }
        } catch (error) {
            console.error('解析API响应失败:', error.message);
            throw new Error('解析API响应失败: ' + error.message);
        }

        console.log('提取的摘要:', summary);

        // 确保结果长度符合要求
        if (summary.match(/[\u4e00-\u9fa5]/g)) {
            // 如果包含中文，限制在8个字以内
            summary = summary.slice(0, 8);
        } else {
            // 如果是英文，限制在8个单词以内
            summary = summary.split(' ').slice(0, 8).join(' ');
        }

        console.log('最终摘要:', summary);
        return summary;
    } catch (error) {
        console.error('AI API调用失败:', error.message);
        throw error; // 向上传递错误，由外层处理超时逻辑
    }
}

// 构建代理URL
function buildProxyUrl(proxyConfig) {
    let proxyUrl = proxyConfig.type + '://';
    
    if (proxyConfig.username && proxyConfig.password) {
        proxyUrl += `${encodeURIComponent(proxyConfig.username)}:${encodeURIComponent(proxyConfig.password)}@`;
    }
    
    proxyUrl += `${proxyConfig.host}:${proxyConfig.port}`;
    return proxyUrl;
}
