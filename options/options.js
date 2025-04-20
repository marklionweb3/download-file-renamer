// 默认配置
const DEFAULT_CONFIG = {
    useTimestamp: true,
    forceEnglish: false,
    namePattern: '{mainTopic}_{siteName}_{date}',
    enableAI: false,
    defaultAIService: 'custom-default',
    apiConfigs: [
        {
            id: 'custom-default',
            name: '自定义API',
            endpoint: 'https://api.example.com/v1/chat/completions',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            isDefault: true
        }
    ],
    proxy: {
        enabled: false,
        type: 'http',
        host: '',
        port: 80,
        username: '',
        password: ''
    },
    defaultSavePath: '',
    aiTimeout: 3
};

// 保存选项设置
async function saveOptions() {
    const options = {
        useTimestamp: document.getElementById('useTimestamp').checked,
        forceEnglish: document.getElementById('forceEnglish').checked,
        namePattern: document.getElementById('namePattern').value,
        enableAI: document.getElementById('enableAI').checked,
        defaultAIService: document.getElementById('defaultAIService').value,
        apiConfigs: await getApiConfigs(),
        proxy: {
            enabled: document.getElementById('enableProxy').checked,
            type: document.getElementById('proxyType').value,
            host: document.getElementById('proxyHost').value,
            port: document.getElementById('proxyPort').value,
            username: document.getElementById('proxyUsername').value,
            password: document.getElementById('proxyPassword').value
        },
        aiTimeout: parseInt(document.getElementById('aiTimeout').value) || 3
    };

    chrome.storage.local.set(options, showSaveSuccess);
}

// 获取API配置列表
async function getApiConfigs() {
    const apiList = document.getElementById('apiList');
    const configs = [];
    
    for (const item of apiList.children) {
        configs.push({
            id: item.dataset.id,
            name: item.querySelector('.api-name').value,
            endpoint: item.querySelector('.api-endpoint').value,
            apiKey: item.querySelector('.api-key').value,
            secretKey: item.querySelector('.secret-key')?.value || '',
            model: item.querySelector('.api-model')?.value || '',
            isDefault: item.dataset.isDefault === 'true'
        });
    }
    
    return configs;
}

// 渲染API配置
function renderApiConfigs(apiConfigs, container) {
    if (!container) {
        console.error('API配置容器不存在');
        return;
    }
    
    container.innerHTML = '';
    
    // 获取当前选择的默认API服务
    const defaultAIService = document.getElementById('defaultAIService').value;
    
    // 对API配置进行排序，使默认API排在前面
    const sortedApis = [...apiConfigs].sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
    });
    
    sortedApis.forEach(api => {
        const apiDiv = document.createElement('div');
        apiDiv.className = 'api-item';
        apiDiv.dataset.id = api.id;
        apiDiv.dataset.isDefault = api.isDefault.toString();
        
        // 默认隐藏非选中的API配置
        apiDiv.style.display = (api.id === defaultAIService) ? 'block' : 'none';
        
        const header = document.createElement('div');
        header.className = 'api-header';
        
        const title = document.createElement('h4');
        title.textContent = api.name;
        header.appendChild(title);
        
        const content = document.createElement('div');
        content.className = 'api-content';
        
        // 添加API名称字段
        const nameField = document.createElement('div');
        nameField.className = 'api-field';
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'API名称';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'api-name';
        nameInput.value = api.name;
        nameInput.readOnly = false; // 所有API名称都可以修改
        nameField.appendChild(nameLabel);
        nameField.appendChild(nameInput);
        content.appendChild(nameField);
        
        // 添加API端点字段
        const endpointField = document.createElement('div');
        endpointField.className = 'api-field';
        const endpointLabel = document.createElement('label');
        endpointLabel.textContent = 'API端点';
        const endpointInput = document.createElement('input');
        endpointInput.type = 'url';
        endpointInput.className = 'api-endpoint';
        endpointInput.value = api.endpoint;
        endpointField.appendChild(endpointLabel);
        endpointField.appendChild(endpointInput);
        content.appendChild(endpointField);
        
        // 添加API密钥字段
        const keyField = document.createElement('div');
        keyField.className = 'api-field';
        const keyLabel = document.createElement('label');
        keyLabel.textContent = 'API密钥';
        const keyInput = document.createElement('input');
        keyInput.type = 'password';
        keyInput.className = 'api-key';
        keyInput.value = api.apiKey;
        keyField.appendChild(keyLabel);
        keyField.appendChild(keyInput);
        content.appendChild(keyField);
        
        // 如果是百度API，添加密钥字段
        if (api.id === 'baidu') {
            const secretKeyField = document.createElement('div');
            secretKeyField.className = 'api-field';
            const secretKeyLabel = document.createElement('label');
            secretKeyLabel.textContent = '密钥';
            const secretKeyInput = document.createElement('input');
            secretKeyInput.type = 'password';
            secretKeyInput.className = 'secret-key';
            secretKeyInput.value = api.secretKey || '';
            secretKeyField.appendChild(secretKeyLabel);
            secretKeyField.appendChild(secretKeyInput);
            content.appendChild(secretKeyField);
        }
        
        // 添加模型字段
        if (api.model !== undefined) {
            const modelField = document.createElement('div');
            modelField.className = 'api-field';
            const modelLabel = document.createElement('label');
            modelLabel.textContent = '模型';
            const modelInput = document.createElement('input');
            modelInput.type = 'text';
            modelInput.className = 'api-model';
            modelInput.value = api.model;
            // 所有模型都可以编辑
            modelInput.readOnly = false;
            modelField.appendChild(modelLabel);
            modelField.appendChild(modelInput);
            content.appendChild(modelField);
        }
        
        // 添加按钮组
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'api-buttons';
        
        // 测试连接按钮
        const testButton = document.createElement('button');
        testButton.className = 'api-button test-button';
        testButton.textContent = '测试连接';
        testButton.addEventListener('click', () => testApiConnection(api.id));
        buttonsDiv.appendChild(testButton);
        
        // 设为默认按钮
        const defaultButton = document.createElement('button');
        defaultButton.className = 'api-button default-button';
        defaultButton.textContent = '设为默认';
        defaultButton.addEventListener('click', () => setDefaultApi(api.id));
        buttonsDiv.appendChild(defaultButton);
        
        // 删除按钮（默认API不显示删除按钮）
        if (!api.isDefault) {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'api-button delete-button';
            deleteButton.textContent = '删除';
            deleteButton.addEventListener('click', () => deleteApi(api.id));
            buttonsDiv.appendChild(deleteButton);
        }
        
        content.appendChild(buttonsDiv);
        apiDiv.appendChild(header);
        apiDiv.appendChild(content);
        container.appendChild(apiDiv);
    });
    
    // 更新默认AI服务选择框，优先选择默认API
    updateDefaultAIServiceSelect(sortedApis);
    
    // 设置默认选中的API
    const defaultApi = sortedApis.find(api => api.isDefault);
    if (defaultApi) {
        document.getElementById('defaultAIService').value = defaultApi.id;
    }
}

// 添加新的API配置
function addNewApi() {
    // 创建新API配置对话框
    const dialog = document.createElement('div');
    dialog.className = 'api-dialog';
    dialog.innerHTML = `
        <div class="api-dialog-content">
            <h3>添加新的API配置</h3>
            <div class="api-field">
                <label for="new-api-name">API名称</label>
                <input type="text" id="new-api-name" placeholder="例如: OpenAI">
            </div>
            <div class="api-field">
                <label for="new-api-endpoint">API端点</label>
                <input type="url" id="new-api-endpoint" placeholder="例如: https://api.example.com/v1/chat/completions">
            </div>
            <div class="api-field">
                <label for="new-api-key">API密钥</label>
                <input type="password" id="new-api-key">
            </div>
            <div class="api-field">
                <label for="new-api-model">模型</label>
                <input type="text" id="new-api-model" placeholder="例如: gpt-3.5-turbo">
            </div>
            <div class="api-dialog-buttons">
                <button id="new-api-cancel">取消</button>
                <button id="new-api-save">保存</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // 添加事件监听器
    document.getElementById('new-api-cancel').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });
    
    document.getElementById('new-api-save').addEventListener('click', async () => {
        const name = document.getElementById('new-api-name').value.trim();
        const endpoint = document.getElementById('new-api-endpoint').value.trim();
        const apiKey = document.getElementById('new-api-key').value.trim();
        const model = document.getElementById('new-api-model').value.trim();
        
        if (!name || !endpoint) {
            alert('请填写必要的字段');
            return;
        }
        
        try {
            // 获取当前API配置，确保有默认值
            const result = await chrome.storage.local.get({apiConfigs: DEFAULT_CONFIG.apiConfigs});
            const apiConfigs = result.apiConfigs || [];
            
            // 生成唯一ID
            const id = 'custom-' + Date.now();
            
            // 添加新API配置
            apiConfigs.push({
                id,
                name,
                endpoint,
                apiKey,
                model,
                isDefault: false
            });
            
            // 保存更新后的配置
            await chrome.storage.local.set({ apiConfigs });
            
            // 重新渲染API配置
            renderApiConfigs(apiConfigs, document.getElementById('apiList'));
            
            // 更新默认AI服务选择框
            updateDefaultAIServiceSelect(apiConfigs);
            
            // 关闭对话框
            document.body.removeChild(dialog);
            
            // 显示成功消息
            showToast('已添加新的API配置');
        } catch (error) {
            console.error('添加API配置失败:', error);
            alert('添加API配置失败: ' + error.message);
        }
    });
}

// 更新默认AI服务选择框
function updateDefaultAIServiceSelect(apiConfigs) {
    const defaultAIService = document.getElementById('defaultAIService');
    if (defaultAIService) {
        // 保存当前选中的值
        const currentValue = defaultAIService.value;
        
        defaultAIService.innerHTML = '';
        
        // 对API配置进行排序，使默认API排在前面
        const sortedApis = [...apiConfigs].sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return 0;
        });
        
        sortedApis.forEach(api => {
            const option = document.createElement('option');
            option.value = api.id;
            option.textContent = api.name;
            if (api.isDefault) {
                option.textContent += ' (默认)';
            }
            defaultAIService.appendChild(option);
        });
        
        // 尝试恢复之前选中的值，如果不存在则选择第一个
        if (currentValue && sortedApis.some(api => api.id === currentValue)) {
            defaultAIService.value = currentValue;
        } else if (sortedApis.length > 0) {
            defaultAIService.value = sortedApis[0].id;
        }
    }
}

// 显示选中的API配置
function showSelectedApiConfig() {
    const selectedId = document.getElementById('defaultAIService').value;
    const apiItems = document.querySelectorAll('.api-item');
    
    // 如果没有找到API项，可能是还没有渲染
    if (apiItems.length === 0) {
        return;
    }
    
    apiItems.forEach(item => {
        if (item.dataset.id === selectedId) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// 测试API连接
async function testApiConnection(apiId) {
    try {
        // 获取当前API配置
        // 首先尝试从DOM中获取当前修改的API配置
        const apiItem = document.querySelector(`.api-item[data-id="${apiId}"]`);
        if (!apiItem) {
            throw new Error('未找到API配置项');
        }
        
        // 从DOM元素中获取API配置
        const api = {
            id: apiId,
            name: apiItem.querySelector('.api-name').value,
            endpoint: apiItem.querySelector('.api-endpoint').value,
            apiKey: apiItem.querySelector('.api-key').value,
            model: apiItem.querySelector('.api-model')?.value || 'gpt-3.5-turbo',
            secretKey: apiItem.querySelector('.secret-key')?.value || ''
        };
        
        if (!api) {
            throw new Error('未找到API配置');
        }
        
        if (!api.apiKey) {
            throw new Error('API密钥未设置');
        }
        
        // 获取测试按钮
        const testButton = apiItem.querySelector('.test-button');
        
        // 移除旧的测试结果
        const oldResult = apiItem.querySelector('.test-result');
        if (oldResult) {
            oldResult.remove();
        }
        
        // 创建测试中提示
        const testingResult = document.createElement('span');
        testingResult.className = 'test-result testing';
        testingResult.textContent = '测试中...';
        testButton.parentNode.appendChild(testingResult);
        
        // 构建请求选项
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        // 根据不同的API服务设置不同的请求参数
        let endpoint = api.endpoint;
        let body = {};
        
        // 简单的测试提示词
        const prompt = 'Hello';
        const systemMessage = 'You are a helpful assistant.';
        
        switch (api.id) {
            case 'openai':
                requestOptions.headers['Authorization'] = `Bearer ${api.apiKey}`;
                body = {
                    model: api.model || 'gpt-3.5-turbo',
                    messages: [{
                        role: 'system',
                        content: systemMessage
                    }, {
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 5
                };
                break;
                
            case 'azure':
                requestOptions.headers['api-key'] = api.apiKey;
                body = {
                    messages: [{
                        role: 'system',
                        content: systemMessage
                    }, {
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 5
                };
                break;
                
            case 'baidu':
                // 获取百度API访问令牌
                const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${api.apiKey}&client_secret=${api.secretKey}`;
                const tokenResponse = await fetch(tokenUrl);
                
                if (!tokenResponse.ok) {
                    throw new Error(`获取访问令牌失败: ${tokenResponse.status}`);
                }
                
                const tokenData = await tokenResponse.json();
                if (!tokenData.access_token) {
                    throw new Error('响应中没有访问令牌');
                }
                
                endpoint = `${api.endpoint}?access_token=${tokenData.access_token}`;
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
                requestOptions.headers['Authorization'] = `Bearer ${api.apiKey}`;
                body = {
                    model: api.model || 'deepseek-chat',
                    messages: [{
                        role: 'system',
                        content: systemMessage
                    }, {
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 5
                };
                break;
                
            case 'guiji':
                requestOptions.headers['Authorization'] = `Bearer ${api.apiKey}`;
                body = {
                    model: api.model || 'glm-4',
                    messages: [{
                        role: 'system',
                        content: systemMessage
                    }, {
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 5,
                    stream: false
                };
                break;
                
            default:
                // 自定义API
                requestOptions.headers['Authorization'] = `Bearer ${api.apiKey}`;
                body = {
                    model: api.model || 'gpt-3.5-turbo',
                    messages: [{
                        role: 'system',
                        content: systemMessage
                    }, {
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 5
                };
        }
        
        requestOptions.body = JSON.stringify(body);
        
        // 设置超时
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10秒超时
        requestOptions.signal = controller.signal;
        
        // 发送请求
        const response = await fetch(endpoint, requestOptions);
        clearTimeout(timeout);
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        // 解析响应
        await response.json();
        
        // 更新为成功状态
        testingResult.className = 'test-result success';
        testingResult.textContent = '连接成功';
    } catch (error) {
        console.error('测试API连接失败:', error);
        
        // 获取API项
        const apiItem = document.querySelector(`.api-item[data-id="${apiId}"]`);
        if (apiItem) {
            // 移除测试中提示
            const testingResult = apiItem.querySelector('.test-result');
            if (testingResult) {
                testingResult.className = 'test-result error';
                testingResult.textContent = '连接失败: ' + error.message;
            } else {
                // 如果没有找到测试中提示，创建一个新的错误提示
                const errorResult = document.createElement('span');
                errorResult.className = 'test-result error';
                errorResult.textContent = '连接失败: ' + error.message;
                const testButton = apiItem.querySelector('.test-button');
                if (testButton) {
                    testButton.parentNode.appendChild(errorResult);
                }
            }
        }
    }
}

// 设置默认API
async function setDefaultApi(apiId) {
    try {
        // 获取当前API配置，确保有默认值
        const result = await chrome.storage.local.get({apiConfigs: DEFAULT_CONFIG.apiConfigs});
        const apiConfigs = result.apiConfigs || [];
        
        // 获取当前DOM中的API配置
        const apiItem = document.querySelector(`.api-item[data-id="${apiId}"]`);
        if (!apiItem) {
            throw new Error('未找到API配置项');
        }
        
        // 从DOM元素中获取API名称
        const apiName = apiItem.querySelector('.api-name').value;
        
        // 更新默认API
        const updatedConfigs = apiConfigs.map(api => ({
            ...api,
            isDefault: api.id === apiId
        }));
        
        // 保存更新后的配置
        await chrome.storage.local.set({
            apiConfigs: updatedConfigs,
            defaultAIService: apiId
        });
        
        // 更新默认AI服务选择框
        updateDefaultAIServiceSelect(updatedConfigs);
        
        // 重新渲染API配置
        renderApiConfigs(updatedConfigs, document.getElementById('apiList'));
        
        // 显示成功消息
        showToast(`已将 ${apiName} 设为默认API`);
    } catch (error) {
        console.error('设置默认API失败:', error);
        showToast('设置默认API失败: ' + error.message, true);
    }
}

// 删除API
async function deleteApi(apiId) {
    try {
        // 获取当前API配置，确保有默认值
        const result = await chrome.storage.local.get({
            apiConfigs: DEFAULT_CONFIG.apiConfigs,
            defaultAIService: DEFAULT_CONFIG.defaultAIService
        });
        const apiConfigs = result.apiConfigs || [];
        const defaultAIService = result.defaultAIService;
        
        // 检查是否是默认API
        if (apiId === defaultAIService) {
            alert('无法删除默认API，请先设置其他API为默认');
            return;
        }
        
        // 获取API名称
        const apiToDelete = apiConfigs.find(api => api.id === apiId);
        if (!apiToDelete) {
            throw new Error('未找到要删除的API配置');
        }
        
        // 确认删除
        if (!confirm(`确定要删除 ${apiToDelete.name} 吗？`)) {
            return;
        }
        
        // 删除API配置
        const updatedConfigs = apiConfigs.filter(api => api.id !== apiId);
        
        // 保存更新后的配置
        await chrome.storage.local.set({ apiConfigs: updatedConfigs });
        
        // 重新渲染API配置
        renderApiConfigs(updatedConfigs, document.getElementById('apiList'));
        
        // 显示成功消息
        showToast('已删除API配置');
    } catch (error) {
        console.error('删除API配置失败:', error);
        showToast('删除API配置失败: ' + error.message, true);
    }
}

// 保存API配置
async function saveApiConfigs() {
    try {
        // 获取当前API配置，确保有默认值
        const result = await chrome.storage.local.get({apiConfigs: DEFAULT_CONFIG.apiConfigs});
        const apiConfigs = result.apiConfigs || [];
        
        // 获取所有API配置项
        const apiItems = document.querySelectorAll('.api-item');
        
        // 更新API配置
        const updatedConfigs = Array.from(apiItems).map(item => {
            const id = item.dataset.id;
            const originalApi = apiConfigs.find(a => a.id === id);
            const isDefault = originalApi ? originalApi.isDefault : false;
            
            // 创建更新后的API配置
            const updatedApi = {
                id: id,
                name: item.querySelector('.api-name').value,
                endpoint: item.querySelector('.api-endpoint').value,
                apiKey: item.querySelector('.api-key').value,
                isDefault: isDefault
            };
            
            // 添加模型字段（如果存在）
            const modelInput = item.querySelector('.api-model');
            if (modelInput) {
                updatedApi.model = modelInput.value;
            }
            
            // 添加密钥字段（如果是百度API）
            const secretKeyInput = item.querySelector('.secret-key');
            if (secretKeyInput) {
                updatedApi.secretKey = secretKeyInput.value;
            }
            
            return updatedApi;
        });
        
        // 检查是否修改了默认的自定义API
        const defaultCustomApi = updatedConfigs.find(api => api.id === 'custom-default');
        if (defaultCustomApi) {
            // 创建一个新的自定义API，保留原始的默认API
            const newCustomApiName = getUniqueApiName(updatedConfigs, defaultCustomApi.name);
            const newCustomApi = {
                ...defaultCustomApi,
                id: 'custom-' + Date.now(),
                name: newCustomApiName,
                isDefault: false
            };
            
            // 添加新的自定义API
            updatedConfigs.push(newCustomApi);
        }
        
        // 保存更新后的配置
        await chrome.storage.local.set({ apiConfigs: updatedConfigs });
        
        // 显示成功消息
        showToast('已保存API配置');
        
        return updatedConfigs;
    } catch (error) {
        console.error('保存API配置失败:', error);
        showToast('保存API配置失败: ' + error.message, true);
        throw error;
    }
}

// 获取唯一的API名称
function getUniqueApiName(apiConfigs, baseName) {
    // 检查是否有同名API
    const sameNameApis = apiConfigs.filter(api => api.name.startsWith(baseName));
    
    if (sameNameApis.length === 0) {
        return baseName;
    }
    
    // 如果有同名API，添加序号
    return `${baseName}(${sameNameApis.length + 1})`;
}

// 显示/隐藏AI设置
function toggleAISettings() {
    const aiConfigOptions = document.getElementById('aiConfigOptions');
    
    if (document.getElementById('enableAI').checked) {
        aiConfigOptions.style.display = 'block';
    } else {
        aiConfigOptions.style.display = 'none';
    }
}

// 显示/隐藏代理设置
function toggleProxySettings() {
    const proxySettings = document.getElementById('proxySettings');
    proxySettings.style.display = document.getElementById('enableProxy').checked ? 'block' : 'none';
}

// 加载保存的选项
async function loadOptions() {
    const options = await chrome.storage.local.get(DEFAULT_CONFIG);
    
    document.getElementById('useTimestamp').checked = options.useTimestamp;
    document.getElementById('forceEnglish').checked = options.forceEnglish;
    document.getElementById('namePattern').value = options.namePattern;
    document.getElementById('enableAI').checked = options.enableAI;
    
    // 更新默认AI服务选择器
    updateDefaultAIServiceSelect(options.apiConfigs);
    document.getElementById('defaultAIService').value = options.defaultAIService;
    
    // 加载API配置
    renderApiConfigs(options.apiConfigs, document.getElementById('apiList'));
    
    // 加载代理设置
    document.getElementById('enableProxy').checked = options.proxy.enabled;
    document.getElementById('proxyType').value = options.proxy.type;
    document.getElementById('proxyHost').value = options.proxy.host;
    document.getElementById('proxyPort').value = options.proxy.port;
    document.getElementById('proxyUsername').value = options.proxy.username;
    document.getElementById('proxyPassword').value = options.proxy.password;
    
    // 设置AI响应容忍度
    document.getElementById('aiTimeout').value = options.aiTimeout.toString();
    
    toggleAISettings();
    toggleProxySettings();
}

// 显示保存成功提示
function showSaveSuccess() {
    const status = document.createElement('div');
    status.textContent = '设置已保存';
    status.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        transition: opacity 0.3s;
    `;
    document.body.appendChild(status);
    setTimeout(() => {
        status.style.opacity = '0';
        setTimeout(() => status.remove(), 300);
    }, 2000);
}

// 事件监听
document.addEventListener('DOMContentLoaded', async function() {
    // 获取设置元素
    const useTimestampCheckbox = document.getElementById('useTimestamp');
    const forceEnglishCheckbox = document.getElementById('forceEnglish');
    const namePatternInput = document.getElementById('namePattern');
    const enableAICheckbox = document.getElementById('enableAI');
    const defaultAIServiceSelect = document.getElementById('defaultAIService');
    const aiTimeoutInput = document.getElementById('aiTimeout');
    const saveButton = document.getElementById('saveButton');
    
    // 加载保存的设置
    await loadOptions();
    
    // 初始化时应用AI设置显示/隐藏逻辑
    toggleAISettings();
    toggleProxySettings();
    
    // 监听保存按钮点击事件
    saveButton.addEventListener('click', async () => {
        try {
            // 保存API配置
            const updatedApiConfigs = await saveApiConfigs();
            
            // 保存其他设置
            const newConfig = {
                useTimestamp: document.getElementById('useTimestamp').checked,
                forceEnglish: document.getElementById('forceEnglish').checked,
                namePattern: document.getElementById('namePattern').value,
                enableAI: document.getElementById('enableAI').checked,
                defaultAIService: document.getElementById('defaultAIService').value,
                aiTimeout: parseInt(document.getElementById('aiTimeout').value) || 3,
                proxy: {
                    enabled: document.getElementById('enableProxy').checked,
                    type: document.getElementById('proxyType').value,
                    host: document.getElementById('proxyHost').value,
                    port: document.getElementById('proxyPort').value,
                    username: document.getElementById('proxyUsername').value,
                    password: document.getElementById('proxyPassword').value
                }
            };
            
            await chrome.storage.local.set(newConfig);
            showToast('设置已保存');
        } catch (error) {
            console.error('保存设置失败:', error);
            showToast('保存设置失败: ' + error.message, true);
        }
    });
    
    // 添加自动保存功能
    aiTimeoutInput.addEventListener('change', async () => {
        const value = parseInt(aiTimeoutInput.value);
        if (value >= 1 && value <= 30) {
            try {
                await chrome.storage.local.set({ aiTimeout: value });
                showToast('已自动保存容忍度设置');
            } catch (error) {
                console.error('自动保存失败:', error);
                showToast('自动保存失败', true);
            }
        }
    });
    
    // 添加事件监听器
    document.getElementById('enableAI').addEventListener('change', toggleAISettings);
    document.getElementById('enableProxy').addEventListener('change', toggleProxySettings);
    document.getElementById('addApiBtn').addEventListener('click', addNewApi);
    document.getElementById('defaultAIService').addEventListener('change', showSelectedApiConfig);
});

// 选择下载目录
document.getElementById('chooseFolder').addEventListener('click', async () => {
    try {
        const handle = await window.showDirectoryPicker();
        await chrome.storage.local.set({ defaultSavePath: handle.name });
        updatePathDisplay();
    } catch (error) {
        console.error('选择目录失败:', error);
    }
});

// 显示当前选择的路径
async function updatePathDisplay() {
    const { defaultSavePath } = await chrome.storage.local.get('defaultSavePath');
    const pathDisplay = document.getElementById('currentPath');
    pathDisplay.textContent = defaultSavePath || '未设置下载目录';
    pathDisplay.style.marginTop = '10px';
    pathDisplay.style.color = '#666';
}

// 显示提示信息
function showToast(message, isError = false, duration = 2000) {
    // 移除现有的提示
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        document.body.removeChild(existingToast);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: ${isError ? '#f44336' : '#4CAF50'};
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 1000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    
    if (duration > 0) {
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, duration);
    }
    
    return toast;
}