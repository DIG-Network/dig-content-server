export const renderKeysIndexView = (
    storeId: string,
    links: { utf8Key: string; link: string }[]
  ) => {
    const linksHtml = links
      .map((link) => `<li><a href="${link.link}">${link.utf8Key}</a></li>`)
      .join("");
  
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
            h1 {
              font-size: 2em;
              color: #333;
              margin-bottom: 20px;
            }
            .key-list-container {
              max-height: 80vh;
              overflow-y: auto;
              border: 1px solid #ddd;
              border-radius: 8px;
              background-color: #fff;
              padding: 10px;
            }
            ul {
              list-style-type: none;
              padding-left: 0;
              margin: 0;
            }
            li {
              margin-bottom: 10px;
              font-size: 1em;
            }
            a {
              text-decoration: none;
              color: #007bff;
              word-break: break-all;
            }
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <h1>Index of ${storeId}</h1>
          <div class="key-list-container">
            <ul>
              ${linksHtml}
            </ul>
          </div>
        </body>
      </html>
    `;
  };
  