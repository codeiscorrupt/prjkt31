function buildFrameFormData({ blob, timestamp, cameraId, targetId }) {
  const formData = new FormData();
  formData.append('file', blob, 'frame.jpg');
  formData.append('timestamp', timestamp);
  formData.append('camera_id', cameraId);
  if (targetId) {
    formData.append('target_id', targetId);
  }
  return formData;
}

async function postMultipart(url, formData) {
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function sendDetectionFrame({ detectUrl, blob, timestamp, cameraId }) {
  return postMultipart(
    detectUrl,
    buildFrameFormData({ blob, timestamp, cameraId }),
  );
}

export async function sendAuthorizationFrame({ authorizeUrl, blob, timestamp, cameraId, targetId }) {
  return postMultipart(
    authorizeUrl,
    buildFrameFormData({ blob, timestamp, cameraId, targetId }),
  );
}

export async function fetchBackendHealth(healthUrl) {
  const response = await fetch(healthUrl);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json();
}


// Add this to the bottom of recognitionApi.js
export function createWSDetectionSession(wsUrl) {
  let socket = null;
  let pendingResolve = null;
  let pendingReject = null;
  let timeoutId = null;

  const cleanup = () => {
    if (timeoutId) clearTimeout(timeoutId);
    pendingResolve = null;
    pendingReject = null;
  };

  const connect = () => {
    socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer'; // Optimize for image bytes

    socket.onmessage = (event) => {
      if (pendingResolve) {
        cleanup();
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          pendingResolve(data);
        } catch (err) {
          pendingReject?.(err);
        }
      }
    };

    return new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = (e) => reject(new Error('WebSocket connection failed'));
    });
  };

  const sendFrame = async (blob) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    // Convert Blob → ArrayBuffer for efficient binary transfer
    const arrayBuffer = await blob.arrayBuffer();

    return new Promise((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Detection timeout'));
      }, 4000);

      socket.send(arrayBuffer);
    });
  };

  const close = () => {
    cleanup();
    socket?.close();
    socket = null;
  };

  return { connect, sendFrame, close };
}
