export const renderKeysIndexView = (
  storeId: string,
  links: { utf8Key: string; link: string }[]
) => {
  // Define the FileNode interface
  interface FileNode {
    __children: { [key: string]: FileNode };
    __isFolder: boolean;
    __link: string | null;
  }

  // Function to build a hierarchical file tree
  const buildFileTree = (links: { utf8Key: string; link: string }[]) => {
    const tree: { [key: string]: FileNode } = {};

    links.forEach(({ utf8Key, link }) => {
      const parts = utf8Key.split('/').filter(Boolean);
      let currentLevel: { [key: string]: FileNode } = tree;

      parts.forEach((part, index) => {
        if (!currentLevel[part]) {
          const isFolder = index < parts.length - 1 || utf8Key.endsWith('/');
          currentLevel[part] = {
            __children: {},
            __isFolder: isFolder,
            __link: !isFolder ? link : null,
          };
        }
        currentLevel = currentLevel[part].__children;
      });
    });

    return tree;
  };

  const fileTree = buildFileTree(links);

  // SVG icons provided
  const folderSvg = `
    <svg width="64px" height="64px" viewBox="0 0 16 16" fill="#000000" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 1H6L9 4H16V14H0V1Z" />
    </svg>
  `;

  const fileSvg = `
    <svg fill="#000000" width="64px" height="64px" viewBox="0 -8 72 72" xmlns="http://www.w3.org/2000/svg">
      <title>file-text-o</title>
      <path d="M47.76,36.76H23.28a1.08,1.08,0,1,0,0,2.16H47.76a1.08,1.08,0,0,0,0-2.16Z"/>
      <path d="M47.76,22.6H23.28a1.08,1.08,0,1,0,0,2.16H47.76a1.08,1.08,0,1,0,0-2.16Z"/>
      <path d="M46.92,0H18.74A3.44,3.44,0,0,0,15.3,3.43V52.57A3.44,3.44,0,0,0,18.74,56H53.26a3.44,3.44,0,0,0,3.44-3.43V10.62Zm.81,5.14L52,9.79H47.73Zm6.08,47.43a.55.55,0,0,1-.55.55H18.74a.55.55,0,0,1-.55-.55V3.43a.54.54,0,0,1,.55-.54H44.85v8.35a1.45,1.45,0,0,0,1.44,1.44h7.52Z"/>
      <path d="M47.76,29.62H23.28a1.08,1.08,0,1,0,0,2.16H47.76a1.08,1.08,0,1,0,0-2.16Z"/>
    </svg>
  `;

  // Serialize the fileTree to JSON and encode it for inclusion in the script
  const fileTreeJson = JSON.stringify(fileTree);

  return `
    <html>
      <head>
        <title>Index of ${storeId}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
          }
          .navigation {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            margin-bottom: 20px;
          }
          #up-button {
            display: none;
            margin-right: 20px;
            color: #007bff;
            text-decoration: none;
            font-size: 1.2em;
          }
          #up-button:hover {
            text-decoration: underline;
          }
          h1 {
            font-size: 2em;
            color: #333;
            margin: 0;
            flex-grow: 1;
            min-width: 200px;
          }
          #search-input {
            margin-left: auto;
            padding: 8px 12px;
            font-size: 1em;
            border: 1px solid #ccc;
            border-radius: 4px;
            width: 100%;
            max-width: 300px;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            grid-gap: 20px;
          }
          .grid-item {
            text-align: center;
            background-color: #fff;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #ddd;
            transition: transform 0.2s;
          }
          .grid-item:hover {
            transform: scale(1.05);
          }
          .grid-item svg {
            width: 48px;
            height: 48px;
          }
          .item-name {
            margin-top: 10px;
            word-break: break-word;
            color: #333;
            font-size: 0.9em;
          }
          a {
            text-decoration: none;
            color: inherit;
          }
          a:hover .item-name {
            text-decoration: underline;
          }
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            .navigation {
              flex-direction: column;
              align-items: flex-start;
            }
            #up-button {
              margin-bottom: 10px;
            }
            h1 {
              font-size: 1.5em;
            }
            #search-input {
              margin-left: 0;
              margin-top: 10px;
              width: 100%;
            }
            .grid-item svg {
              width: 40px;
              height: 40px;
            }
          }
        </style>
      </head>
      <body>
        <div class="navigation">
          <a id="up-button" href="#">Up</a>
          <h1>Index of ${storeId}</h1>
          <input type="text" id="search-input" placeholder="Filter items..." />
        </div>
        <div class="grid-container" id="grid-container">
          <!-- Items will be dynamically generated here -->
        </div>
        <script>
          (function() {
            const fileTree = ${fileTreeJson};
            const gridContainer = document.getElementById('grid-container');
            const h1 = document.querySelector('h1');
            const upButton = document.getElementById('up-button');
            const searchInput = document.getElementById('search-input');

            // SVG icons
            const folderSvg = \`${folderSvg}\`;
            const fileSvg = \`${fileSvg}\`;

            // Debounce function
            function debounce(func, wait) {
              let timeout;
              return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
              };
            }

            function render() {
              const currentPath = decodeURIComponent(location.hash.slice(1)) || '';
              h1.textContent = 'Index of ${storeId}/' + currentPath;

              // Get the search query
              const query = searchInput.value.toLowerCase();

              // Get the current level in the file tree
              const parts = currentPath ? currentPath.split('/').filter(Boolean) : [];
              let currentLevel = fileTree;

              for (const part of parts) {
                if (currentLevel[part]) {
                  currentLevel = currentLevel[part].__children;
                } else {
                  // Invalid path
                  gridContainer.innerHTML = '<p>Directory not found.</p>';
                  upButton.style.display = 'inline';
                  return;
                }
              }

              // Get the items and sort folders first
              const items = Object.keys(currentLevel).map((name) => {
                const item = currentLevel[name];
                const isFolder = item.__isFolder || Object.keys(item.__children).length > 0;
                const itemPath = currentPath ? currentPath + '/' + name : name;
                const link = isFolder ? '#' : item.__link;
                const icon = isFolder ? folderSvg : fileSvg;
                return {
                  name,
                  isFolder,
                  itemPath,
                  link,
                  icon,
                };
              });

              // Filter items based on the search query
              const filteredItems = items.filter((item) => {
                return item.name.toLowerCase().includes(query);
              });

              // Sort items: folders first, then files
              filteredItems.sort((a, b) => {
                if (a.isFolder === b.isFolder) {
                  return a.name.localeCompare(b.name);
                }
                return a.isFolder ? -1 : 1;
              });

              // Generate HTML for items
              const itemsHtml = filteredItems
                .map((item) => {
                  return \`
                    <div class="grid-item">
                      <a href="\${item.isFolder ? '#' : item.link}" \${item.isFolder ? \`onclick="navigateTo('\${encodeURIComponent(item.itemPath)}'); return false;"\` : 'target="_blank"'}>
                        \${item.icon}
                        <div class="item-name">\${item.name}</div>
                      </a>
                    </div>
                  \`;
                })
                .join('');

              gridContainer.innerHTML = itemsHtml;

              // Handle "Up" navigation
              if (currentPath) {
                upButton.style.display = 'inline';
                const pathParts = currentPath.split('/').filter(Boolean);
                pathParts.pop(); // Remove the last part
                const parentPath = pathParts.join('/');
                upButton.href = '#' + encodeURIComponent(parentPath);
              } else {
                upButton.style.display = 'none';
              }
            }

            // Function to navigate to a new path
            window.navigateTo = function(path) {
              location.hash = path;
            };

            // Debounced render function for search input
            const debouncedRender = debounce(render, 300);

            // Event listeners
            window.addEventListener('hashchange', render);
            searchInput.addEventListener('input', debouncedRender);

            // Initial render
            render();
          })();
        </script>
      </body>
    </html>
  `;
};
