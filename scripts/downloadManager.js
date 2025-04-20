class DownloadManager {
    constructor() {
      this.downloadQueue = new Map();
      chrome.downloads.onCreated.addListener(this.handleDownload.bind(this));
    }
  
    async handleDownload(downloadItem) {
      const config = await chrome.storage.local.get(['namingRules', 'savePath']);
      
      // 暂停默认下载
      await chrome.downloads.pause(downloadItem.id);
      
      // 获取智能文件名
      const smartName = await this.generateFilename(
        downloadItem.url,
        config.namingRules
      );
  
      // 用户路径选择
      const finalPath = await this.selectSavePath(
        smartName,
        config.savePath || 'default'
      );
  
      // 重启下载任务
      chrome.downloads.resume(downloadItem.id, {
        filename: finalPath + '/' + smartName
      });
    }
  
    async selectSavePath(filename, defaultPath) {
      return new Promise((resolve) => {
        chrome.fileSystem.chooseEntry({
          type: 'saveFile',
          suggestedName: filename,
          accepts: [{ extensions: [filename.split('.').pop()]}]
        }, (entry) => {
          resolve(entry.fullPath);
        });
      });
    }
  }