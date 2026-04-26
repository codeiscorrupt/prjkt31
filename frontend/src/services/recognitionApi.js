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
