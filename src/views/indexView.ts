import { Udi } from "@dignetwork/dig-sdk";
import { Request } from "express";

export const renderIndexView = (
  udi: Udi,
  state: any,
  formattedBytes: string,
  host: string
) => {

  const urn = udi.toUrn();
  const isSyncing = !state; // Check if state is null
  const toastId = `toast-${urn}`; // Unique ID for the toast

  return `
    <div style="border: 1px solid #ddd; border-radius: 10px; margin-bottom: 20px; padding: 20px; background-color: #f9f9f9;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="max-width: 70%;">
          <h2 style="margin: 0; font-size: 1.5em; color: #333;">
            ${isSyncing ? "Syncing..." : (state.metadata.label || "No Label")}
            ${isSyncing ? '<span class="spinner" style="display: inline-block; width: 16px; height: 16px; border: 2px solid #007BFF; border-radius: 50%; border-top: 2px solid transparent; animation: spin 1s linear infinite;"></span>' : ""}
          </h2>
          <p style="margin: 5px 0 10px 0; color: #777;">
            ${isSyncing ? "Syncing data, please wait..." : (state.metadata.description || "No Description Available")}
          </p>
          <p style="margin: 0; font-size: 0.9em; color: #555;">
            Store: <a href="/${urn}" style="color: #007BFF; text-decoration: none;">${urn}</a>
            <span style="cursor: pointer;" onclick="copyToClipboard('${urn}', '${toastId}')">
              <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.9983 10C20.9862 7.82497 20.8897 6.64706 20.1213 5.87868C19.2426 5 17.8284 5 15 5H12C9.17157 5 7.75736 5 6.87868 5.87868C6 6.75736 6 8.17157 6 11V16C6 18.8284 6 20.2426 6.87868 21.1213C7.75736 22 9.17157 22 12 22H15C17.8284 22 19.2426 22 20.1213 21.1213C21 20.2426 21 18.8284 21 16V15" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M3 10V16C3 17.6569 4.34315 19 6 19M18 5C18 3.34315 16.6569 2 15 2H11C7.22876 2 5.34315 2 4.17157 3.17157C3.51839 3.82475 3.22937 4.69989 3.10149 6" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <a href="//${udi.chainName}.${udi.storeIdBase32}.${host}">View as Webapp</a>
            </span>
          </p>
        </div>
        <div style="text-align: right; min-width: 100px;">
          <p style="margin: 0; font-size: 1.2em; color: #333;">
            ${isSyncing ? "Syncing..." : formattedBytes}
            ${isSyncing ? '<span class="spinner" style="display: inline-block; width: 16px; height: 16px; border: 2px solid #007BFF; border-radius: 50%; border-top: 2px solid transparent; animation: spin 1s linear infinite;"></span>' : ""}
          </p>
        </div>
      </div>
    </div>

    <div id="${toastId}" style="visibility: hidden; min-width: 250px; background-color: #333; color: #fff; text-align: center; border-radius: 5px; padding: 16px; position: fixed; z-index: 1; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 17px;">
      Store URN copied to clipboard
    </div>

    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      #${toastId} {
        opacity: 0;
        transition: opacity 0.5s ease-in-out, visibility 0.5s ease-in-out;
      }

      #${toastId}.show {
        visibility: visible !important;
        opacity: 1;
      }
    </style>

    <script>
      function copyToClipboard(text, toastId) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          // Use the clipboard API if available
          navigator.clipboard.writeText(text).then(function() {
            showToast(toastId);
          }, function(err) {
            console.error('Async: Could not copy text: ', err);
          });
        } else {
          // Fallback for older browsers
          const textArea = document.createElement("textarea");
          textArea.value = text;
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
            showToast(toastId);
          } catch (err) {
            console.error('Fallback: Could not copy text: ', err);
          }
          document.body.removeChild(textArea);
        }
      }

      function showToast(toastId) {
        var toast = document.getElementById(toastId);
        toast.classList.add("show");

        setTimeout(function() {
          toast.classList.remove("show");
        }, 3000);
      }
    </script>
  `;
};
