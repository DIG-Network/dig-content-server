export const renderStoreSyncingView = (
  storeId: string,
  state: any
) => {
  return `
    <html>
      <head>
        <meta http-equiv="refresh" content="10">
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f0f0;">
          <div style="width: 90%; max-width: 500px; border: 1px solid #ddd; border-radius: 10px; padding: 20px; background-color: #ffffff; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center;">
              <h2 style="margin: 0; font-size: 1.5em; color: #333;">${
                state.metadata.label || "No Label"
              }</h2>
              <p style="margin: 10px 0; color: #777;">${
                state.metadata.description || "No Description Available"
              }</p>
              <p style="margin: 0; font-size: 0.9em; color: #555;">Store ID: <a href="/${storeId}" style="color: #007BFF; text-decoration: none;">${storeId}</a></p>
            </div>
            <div style="margin-top: 20px; display: flex; align-items: center; justify-content: center; color: #555;">
              <div style="width: 24px; height: 24px; border: 4px solid #f3f3f3; border-top: 4px solid #007BFF; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <span style="margin-left: 10px;">Store is still syncing. This page will automatically refresh when the data has been synced.</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};
