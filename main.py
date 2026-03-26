import numpy as np
import cv2
from deepface import DeepFace
 

def cv2_deepface():
    # Open webcam
    cap = cv2.VideoCapture(1)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        try:
            # Analyze frame (detect faces, emotions, etc.)
            result = DeepFace.analyze(frame, actions=['emotion', 'age', 'gender', 'race'], enforce_detection=False)
            
            # Display results
            for face in result:
                print(face)
                x, y, w, h = face['region']['x'], face['region']['y'], face['region']['w'], face['region']['h']
                emotion = face['dominant_emotion']
                age = face['age']
                cv2.putText(frame, emotion+" "+str(age), (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
        except Exception as e:
            print(f"Error: {e}")

        cv2.imshow('DeepFace Live', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

def opncv():
    stream = cv2.VideoCapture(1)
    if not stream.isOpened():
        print("Cannot open camera")
        exit()
    while True:
        # Capture frame-by-frame
        ret, frame = stream.read()
    
        # if frame is read correctly ret is True
        if not ret:
            print("Can't receive frame (stream end?). Exiting ...")
            break
        # Our operations on the frame come here
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # Display the resulting frame
        cv2.imshow('frame', gray)
        if cv2.waitKey(1) == ord(' '):
            break
    
    # When everything done, release the capture
    stream.release()
    cv2.destroyAllWindows()

cv2_deepface()