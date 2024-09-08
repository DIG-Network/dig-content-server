export const renderStoreView = (rows: string) => {
    return `
      <html>
        <head>
          <title>Index Of Stores</title>
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
          </style>
        </head>
        <body>
          <h1>Index Of Stores</h1>
          ${rows}
        </body>
      </html>
    `;
  };
  