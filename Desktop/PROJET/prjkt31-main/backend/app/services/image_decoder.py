import numpy as np
import cv2


def decode_uploaded_image(file_bytes: bytes):
    np_buffer = np.frombuffer(file_bytes, dtype=np.uint8)
    frame = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError('Could not decode the uploaded image.')
    return frame
