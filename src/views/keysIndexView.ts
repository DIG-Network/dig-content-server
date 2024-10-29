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
          currentLevel[part] = {
            __children: {},
            __isFolder: index < parts.length - 1 || utf8Key.endsWith('/'),
            __link: index === parts.length - 1 ? link : null,
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
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
          }
          .navigation {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
          }
          #up-button {
            display: none;
            margin-right: 20px;
            color: #007bff;
            text-decoration: none;
          }
          #up-button:hover {
            text-decoration: underline;
          }
          h1 {
            font-size: 2em;
            color: #333;
            margin: 0;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            grid-gap: 20px;
          }
          .grid-item {
            text-align: center;
            background-color: #fff;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #ddd;
          }
          .grid-item svg {
            width: 64px;
            height: 64px;
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
        </style>
      </head>
      <body>
        <div class="navigation">
          <a id="up-button" href="#">Up</a>
          <h1>Index of ${storeId}</h1>
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

            // SVG icons
            const folderSvg = \`${folderSvg}\`;
            const fileSvg = \`${fileSvg}\`;

            function render() {
              const currentPath = decodeURIComponent(location.hash.slice(1)) || '';
              h1.textContent = 'Index of ${storeId}/' + currentPath;

              // Clear existing items
              gridContainer.innerHTML = '';

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

              // Generate HTML for items in the current level
              const itemsHtml = Object.keys(currentLevel)
                .map((name) => {
                  const item = currentLevel[name];
                  const isFolder = Object.keys(item.__children).length > 0 || item.__isFolder;
                  const itemPath = currentPath ? currentPath + '/' + name : name;
                  const link = isFolder ? '#' : item.__link;
                  const icon = isFolder ? folderSvg : fileSvg;

                  return \`
                    <div class="grid-item">
                      <a href="\${isFolder ? '#' : link}" \${isFolder ? \`onclick="navigateTo('\${encodeURIComponent(itemPath)}'); return false;"\` : 'target="_blank"'}>
                        \${icon}
                        <div class="item-name">\${name}</div>
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

            render();
            window.addEventListener('hashchange', render);
          })();
        </script>
      </body>
    </html>
  `;
};
