import { Udi } from "../utils/udi";

export const renderStoreNotFoundView = (
  udi: Udi,
  peerIp?: string | null
) => {
  // If no peers are available, show "Store not found on this network"
  if (!peerIp) {
    return `
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f0f0f0;
              }
              .container {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
              }
              .box {
                width: 90%;
                max-width: 500px;
                border: 1px solid #ddd;
                border-radius: 10px;
                padding: 20px;
                background-color: #ffffff;
                box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
                text-align: center;
              }
              .message {
                font-size: 1.2em;
                color: #333;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="box">
                <h2 class="message">Store Not Found on This Network</h2>
              </div>
            </div>
          </body>
        </html>
      `;
  }

  // If there are peers available, show the redirect option
  return `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f0f0f0;
            }
            .container {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
            }
            .box {
              width: 90%;
              max-width: 500px;
              border: 1px solid #ddd;
              border-radius: 10px;
              padding: 20px;
              background-color: #ffffff;
              box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
            .message {
              font-size: 1.2em;
              color: #333;
            }
            .button {
              background-color: #007BFF;
              color: white;
              padding: 10px 20px;
              border: none;
              border-radius: 5px;
              font-size: 1em;
              cursor: pointer;
              margin-top: 20px;
              text-decoration: none;
              display: inline-block;
            }
            .button:hover {
              background-color: #0056b3;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="box">
              <h2 class="message">Store Not Found on This Peer</h2>
              <p>Click the button below to redirect to another peer.</p>
              <a class="button" href="http://${peerIp}:4161/${udi.toUrn()}">
                Redirect
              </a>
            </div>
          </div>
        </body>
      </html>
    `;
};
