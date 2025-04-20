function buildFilename(aiData, userConfig) {
    let filename = userConfig.pattern
      .replace('{mainTopic}', processText(aiData.mainTopic))
      .replace('{siteName}', processText(aiData.siteName))
      .replace('{date}', getFormattedDate())
      .replace('{timestamp}', Date.now());
  
    // 强制英文处理
    if(userConfig.forceEnglish) {
      filename = pinyin.convertToPinyin(filename);
      filename = filename.replace(/[^\w-]/g, '_');
    }
  
    // 添加后缀时间戳
    if(userConfig.useTimestamp) {
      filename += `_${getFormattedDate()}`;
    }
  
    return sanitizeFilename(filename);
  }
  
  function processText(text) {
    // 智能缩写处理
    return text.replace(/有限公司/g, 'Co.')
              .replace(/股份有限公司/g, 'Inc.');
  }

async function getAISummary(pageContent) {
  const config = await chrome.storage.local.get(['apiKey', 'apiEndpoint']);
  
  try {
    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        prompt: `请总结以下网页内容的核心主题（20字以内）：\n${pageContent}`,
        max_tokens: 50
      })
    });

    const data = await response.json();
    return data.choices[0].text.trim();
  } catch (error) {
    console.error('AI摘要生成失败:', error);
    return null;
  }
}

async function buildFilename(pageData, userConfig) {
  // 获取AI摘要
  const aiSummary = await getAISummary(pageData.content);
  
  let filename = userConfig.pattern
    .replace('{mainTopic}', aiSummary || processText(pageData.mainTopic))
    .replace('{siteName}', processText(pageData.siteName))
    .replace('{date}', getFormattedDate())
    .replace('{timestamp}', Date.now());

  // 强制英文处理
  if(userConfig.forceEnglish) {
    filename = pinyin.convertToPinyin(filename);
    filename = filename.replace(/[^\w-]/g, '_');
  }

  // 添加后缀时间戳
  if(userConfig.useTimestamp) {
    filename += `_${getFormattedDate()}`;
  }

  return sanitizeFilename(filename);
}