// 国际化加载
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
  });
});

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 创建下载项元素
function createDownloadItem(download) {
    const item = document.createElement('div');
    item.className = 'download-item';
    
    const filename = document.createElement('div');
    filename.className = 'filename';
    filename.textContent = download.newName.split('/').pop();
    
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `
        <span>${formatDate(download.date)}</span>
        <span>${formatFileSize(download.fileSize || 0)}</span>
    `;
    
    const actions = document.createElement('div');
    actions.className = 'actions';
    
    const openButton = document.createElement('button');
    openButton.textContent = '打开文件';
    openButton.onclick = () => chrome.downloads.open(download.id);
    
    const showButton = document.createElement('button');
    showButton.textContent = '所在文件夹';
    showButton.onclick = () => chrome.downloads.show(download.id);
    
    actions.appendChild(openButton);
    actions.appendChild(showButton);
    
    item.appendChild(filename);
    item.appendChild(meta);
    item.appendChild(actions);
    
    return item;
}

// 更新下载列表
async function updateDownloadList() {
    const downloadList = document.getElementById('downloadList');
    const emptyState = document.getElementById('emptyState');
    
    try {
        const data = await chrome.storage.local.get('downloadHistory');
        const history = data.downloadHistory || [];
        
        if (history.length === 0) {
            downloadList.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        downloadList.style.display = 'block';
        emptyState.style.display = 'none';
        downloadList.innerHTML = '';
        
        history.forEach(download => {
            downloadList.appendChild(createDownloadItem(download));
        });
    } catch (error) {
        console.error('加载下载历史失败:', error);
    }
}

// 检查批量下载状态
async function checkBatchDownloads() {
    const batchInfo = document.getElementById('batchInfo');
    const bg = chrome.extension.getBackgroundPage();
    
    if (bg && bg.downloadManager.batchDownloads.size > 0) {
        batchInfo.style.display = 'block';
        batchInfo.textContent = `正在进行批量下载 (${bg.downloadManager.batchDownloads.size} 个文件)...`;
    } else {
        batchInfo.style.display = 'none';
    }
}

// 打开设置页面
document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    updateDownloadList();
    checkBatchDownloads();
    
    // 每秒更新批量下载状态
    setInterval(checkBatchDownloads, 1000);
});

// 监听存储变化，更新下载列表
chrome.storage.onChanged.addListener((changes) => {
    if (changes.downloadHistory) {
        updateDownloadList();
    }
});
