document.addEventListener('DOMContentLoaded', () => {
  const bookmarkTreeContainer = document.getElementById('bookmark-tree');
  const defaultParentId = "2"; 

  // =================【A. 字体大小控制逻辑】=================
  const btnDec = document.getElementById('font-dec');
  const btnInc = document.getElementById('font-inc');
  
  let currentFontSize = parseInt(localStorage.getItem('bookmark-font-size')) || 14;
  document.body.style.fontSize = currentFontSize + 'px';

  btnInc.addEventListener('click', () => {
    if (currentFontSize < 24) {
      currentFontSize += 2;
      document.body.style.fontSize = currentFontSize + 'px';
      localStorage.setItem('bookmark-font-size', currentFontSize);
    }
  });

  btnDec.addEventListener('click', () => {
    if (currentFontSize > 12) {
      currentFontSize -= 2;
      document.body.style.fontSize = currentFontSize + 'px';
      localStorage.setItem('bookmark-font-size', currentFontSize);
    }
  });

  // =================【B. 一键智能切换展开/折叠】=================
  const btnToggleAll = document.getElementById('toggle-all-btn');

  btnToggleAll.addEventListener('click', () => {
    const currentStatus = btnToggleAll.getAttribute('data-status');
    const folders = bookmarkTreeContainer.querySelectorAll('.folder');
    const subUls = bookmarkTreeContainer.querySelectorAll('ul');

    if (currentStatus === 'collapsed') {
      folders.forEach(f => f.classList.remove('collapsed'));
      subUls.forEach(ul => ul.style.display = 'block');
      btnToggleAll.textContent = '📁⁻';
      btnToggleAll.setAttribute('data-status', 'expanded');
    } else {
      folders.forEach(f => f.classList.add('collapsed'));
      subUls.forEach(ul => ul.style.display = 'none');
      btnToggleAll.textContent = '📂⁺';
      btnToggleAll.setAttribute('data-status', 'collapsed');
    }
  });

  // =================【C. 8款高颜值主题切换】=================
  const btnTheme = document.getElementById('theme-btn');
  const themes = ['', 'theme-dark', 'theme-green', 'theme-pink', 'theme-blue', 'theme-purple', 'theme-orange', 'theme-brown'];
  let currentThemeIdx = parseInt(localStorage.getItem('bookmark-theme-idx')) || 0;
  
  applyTheme(themes[currentThemeIdx]);

  btnTheme.addEventListener('click', () => {
    currentThemeIdx = (currentThemeIdx + 1) % themes.length;
    applyTheme(themes[currentThemeIdx]);
    localStorage.setItem('bookmark-theme-idx', currentThemeIdx);
  });

  function applyTheme(themeClass) {
    document.body.className = ''; 
    if (themeClass) document.body.classList.add(themeClass);
  }

  // =================【D. 关键词实时搜索过滤】=================
  const searchBox = document.getElementById('search-box');
  
  searchBox.addEventListener('input', () => {
    const query = searchBox.value.trim().toLowerCase();
    const allItems = bookmarkTreeContainer.querySelectorAll('li');

    if (!query) {
      allItems.forEach(li => li.classList.remove('filtered-out'));
      const folders = bookmarkTreeContainer.querySelectorAll('.folder');
      const subUls = bookmarkTreeContainer.querySelectorAll('ul');
      folders.forEach(f => f.classList.add('collapsed'));
      subUls.forEach(ul => ul.style.display = 'none');
      btnToggleAll.textContent = '📂⁺';
      btnToggleAll.setAttribute('data-status', 'collapsed');
      return;
    }

    allItems.forEach(li => li.add('filtered-out')); 
    allItems.forEach(li => li.classList.add('filtered-out')); 
    const matchTargets = bookmarkTreeContainer.querySelectorAll('.bookmark, .folder');
    
    matchTargets.forEach(target => {
      if (target.textContent.toLowerCase().includes(query)) {
        const matchedLi = target.closest('li');
        if (matchedLi) matchedLi.classList.remove('filtered-out');

        let parent = matchedLi.parentElement;
        while (parent && parent !== bookmarkTreeContainer) {
          if (parent.tagName === 'UL') parent.style.display = 'block'; 
          if (parent.tagName === 'LI') {
            parent.classList.remove('filtered-out'); 
            const parentFolder = parent.querySelector('.folder');
            if (parentFolder) parentFolder.classList.remove('collapsed'); 
          }
          parent = parent.parentElement;
        }
      }
    });
  });

  // =================【E. 书签备份：导出与导入】=================
  const btnExport = document.getElementById('export-btn');
  const btnImport = document.getElementById('import-btn');
  const importFileInput = document.getElementById('import-file-file');

  btnExport.addEventListener('click', () => {
    chrome.bookmarks.getTree((treeNodes) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(treeNodes));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Edge书签备份_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  });

  btnImport.addEventListener('click', () => {
    if(confirm("⚠️ 导入书签可能会产生重复项，确定要导入备份吗？")) {
      importFileInput.click();
    }
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const importedTree = JSON.parse(event.target.result);
        if (importedTree && importedTree[0] && importedTree[0].children) {
          alert("正在后台恢复书签，请稍候...");
          importNodesRecursive(importedTree[0].children, "2", () => {
            alert("🎉 书签恢复成功！");
            refreshBookmarkTree();
          });
        }
      } catch (err) {
        alert("导入失败：文件损坏或格式不正确！");
      }
    };
    reader.readAsText(file);
  });

  function importNodesRecursive(nodes, targetParentId, callback) {
    let completedCount = 0;
    if (nodes.length === 0) { callback(); return; }
    nodes.forEach(node => {
      if (node.children) {
        chrome.bookmarks.create({ parentId: targetParentId, title: node.title }, (newFolder) => {
          importNodesRecursive(node.children, newFolder.id, () => {
            completedCount++;
            if (completedCount === nodes.length) callback();
          });
        });
      } else if (node.url) {
        chrome.bookmarks.create({ parentId: targetParentId, title: node.title, url: node.url }, () => {
          completedCount++;
          if (completedCount === nodes.length) callback();
        });
      } else {
        completedCount++;
        if (completedCount === nodes.length) callback();
      }
    });
  }

  // =================【F. 核心文件夹分类维护逻辑】=================
  const btnCreateFolder = document.getElementById('create-folder-btn');
  btnCreateFolder.addEventListener('click', () => {
    const folderName = prompt('请输入新顶级分类的名称：');
    if (folderName !== null && folderName.trim() !== '') {
      chrome.bookmarks.create({ parentId: defaultParentId, title: folderName.trim() }, () => {
        refreshBookmarkTree();
      });
    }
  });

  // 纯净启动
  refreshBookmarkTree();

  function refreshBookmarkTree() {
    bookmarkTreeContainer.innerHTML = ''; 
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      if (bookmarkTreeNodes[0] && bookmarkTreeNodes[0].children) {
        bookmarkTreeNodes[0].children.forEach(rootChild => {
          if (rootChild.id === "1") {
            renderNode(rootChild, bookmarkTreeContainer);
          } else if (rootChild.id === "2") {
            if (rootChild.children) {
              rootChild.children.forEach(subNode => {
                renderNode(subNode, bookmarkTreeContainer);
              });
            }
          }
        });
      }
    });
  }

  // 深度递归获取某个节点下所有网址
  function getAllUrlsInNode(node, urlsArray = []) {
    if (node.url) {
      urlsArray.push(node.url);
    } else if (node.children) {
      node.children.forEach(child => getAllUrlsInNode(child, urlsArray));
    }
    return urlsArray;
  }

  /**
   * 递归生成 DOM 节点树
   */
  function renderNode(node, parentElement) {
    const li = document.createElement('li');

    // 情况 A：如果是文件夹分类
    if (node.children) {
      const folderItemDiv = document.createElement('div');
      folderItemDiv.className = 'folder-item';

      const folderSpan = document.createElement('span');
      folderSpan.className = 'folder collapsed'; 
      folderSpan.textContent = node.title || "未命名分类";
      folderItemDiv.appendChild(folderSpan);

      const actionContainer = document.createElement('span');
      actionContainer.className = 'action-btns';

      // 1. 🚀【核心功能】一键分组打开所有书签（工作流聚合）
      const openAllBtn = document.createElement('span');
      openAllBtn.className = 'btn edit-btn';
      openAllBtn.textContent = '🚀';
      openAllBtn.title = '一键在后台打开此分类下的所有网页';
      openAllBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const allUrls = getAllUrlsInNode(node);
        if (allUrls.length === 0) {
          alert("这个文件夹里空空如也，先存点网址吧！");
          return;
        }
        if (confirm(`准备在后台一键并开 [${node.title}] 分类下的 ${allUrls.length} 个网页吗？`)) {
          allUrls.forEach(url => {
            chrome.tabs.create({ url: url, active: false }); 
          });
        }
      });
      actionContainer.appendChild(openAllBtn);

      // 2. 无限级联子分类 ➕ 按钮
      const createSubFolderBtn = document.createElement('span');
      createSubFolderBtn.className = 'btn edit-btn'; 
      createSubFolderBtn.textContent = '➕';
      createSubFolderBtn.title = '在此分类下新建子文件夹';
      createSubFolderBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const subFolderName = prompt(`在 [${node.title}] 下创建子分类，请输入名称：`);
        if (subFolderName !== null && subFolderName.trim() !== '') {
          chrome.bookmarks.create({ parentId: node.id, title: subFolderName.trim() }, () => {
            refreshBookmarkTree();
          });
        }
      });
      actionContainer.appendChild(createSubFolderBtn);

      // 3. 分类级联删除 🗑️ 按钮
      const deleteFolderBtn = document.createElement('span');
      deleteFolderBtn.className = 'btn delete-btn';
      deleteFolderBtn.textContent = '🗑️';
      deleteFolderBtn.title = '删除此分类及其内容';
      deleteFolderBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        if (node.id === "1" || node.id === "2" || node.id === "3") {
          alert("系统核心大分类无法删除！");
          return;
        }
        const confirmDelete = confirm(`确定要删除分类 [${node.title}] 吗？\n内部的所有内容将被清空！`);
        if (confirmDelete) {
          chrome.bookmarks.removeTree(node.id, () => { li.remove(); });
        }
      });
      actionContainer.appendChild(deleteFolderBtn);
      folderItemDiv.appendChild(actionContainer);
      li.appendChild(folderItemDiv);

      const subUl = document.createElement('ul');
      subUl.style.display = 'none'; 
      li.appendChild(subUl);

      folderSpan.addEventListener('click', () => {
        if (subUl.style.display === 'none') {
          subUl.style.display = 'block';        
          folderSpan.classList.remove('collapsed'); 
        } else {
          subUl.style.display = 'none';
          folderSpan.classList.add('collapsed');    
        }
      });

      node.children.forEach(child => renderNode(child, subUl));
      parentElement.appendChild(li);
    } 
    // 情况 B：如果是书签网址
    else if (node.url) {
      li.className = 'bookmark-item'; 

      const a = document.createElement('a');
      a.className = 'bookmark';
      a.href = node.url;
      a.textContent = node.title || node.url;
      a.title = node.url; 

      a.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: node.url });
      });
      li.appendChild(a);

      const actionContainer = document.createElement('span');
      actionContainer.className = 'action-btns';

      // 1. 一键复制网页链接 📋 按钮
      const copyBtn = document.createElement('span');
      copyBtn.className = 'btn copy-btn';
      copyBtn.textContent = '📋';
      copyBtn.title = '一键复制网页链接';
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(node.url).then(() => {
          const oriText = copyBtn.textContent;
          copyBtn.textContent = '✅';
          setTimeout(() => copyBtn.textContent = oriText, 1000);
        }).catch(() => {
          alert('复制失败，请重试');
        });
      });
      actionContainer.appendChild(copyBtn);

      // 2. 铅笔 ✏️ 改名按钮
      const editBtn = document.createElement('span');
      editBtn.className = 'btn edit-btn';
      editBtn.textContent = '✏️';
      editBtn.title = '修改名称';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const newTitle = prompt('请输入新的书签名称：', a.textContent);
        if (newTitle !== null && newTitle.trim() !== '') {
          chrome.bookmarks.update(node.id, { title: newTitle.trim() }, (updatedNode) => {
            a.textContent = updatedNode.title;
          });
        }
      });
      actionContainer.appendChild(editBtn);

      // 3. 垃圾桶 🗑️ 删除按钮
      const deleteBtn = document.createElement('span');
      deleteBtn.className = 'btn delete-btn';
      deleteBtn.textContent = '🗑️';
      deleteBtn.title = '删除书签';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const confirmDelete = confirm(`确定要删除书签 [${a.textContent}] 吗？`);
        if (confirmDelete) {
          chrome.bookmarks.remove(node.id, () => { li.remove(); });
        }
      });
      actionContainer.appendChild(deleteBtn);

      li.appendChild(actionContainer);
      parentElement.appendChild(li);
    }
  }
});