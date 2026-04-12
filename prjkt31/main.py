import numpy as np
import cv2
from deepface import DeepFace
 

def cv2_deepface():
    # Open webcam
    cap = cv2.VideoCapture(1)
    process_every_n_frames = 10  # Only analyze 1 out of 5 frames
    frame_count = 0
    analysis_scale = 0.5
    cached_results = []


    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_count += 1

        if frame_count % process_every_n_frames == 0:
            try:
                # Resize frame for faster analysis
                small_frame = cv2.resize(frame, (0, 0), fx=analysis_scale, fy=analysis_scale)
                reps = DeepFace.represent(small_frame, model_name="GhostFaceNet", enforce_detection=False)
            
                
                objs = DeepFace.analyze(
                    small_frame, 
                    actions=["gender"], 
                    enforce_detection=False, 
                    silent=False,
                    detector_backend='opencv'
                )

                if reps and objs:
                    # Combine data
                    embedding = reps[0]["embedding"]
                    face_info = objs[0]
                    
                    # Check if detection was actually successful
                    if face_info.get('face_confidence', 0) > 0:
                        cached_results = {
                            'region': face_info['region'],
                            'gender': face_info['dominant_gender'],
                            'embedding': embedding # The Signature
                        }
                    else:
                        cached_results = None # Detection failed
                else:
                    cached_results = None
            except Exception as e:
                print(f"Error: {e}")
                cached_results = None

        if cached_results:
            face = cached_results
            # Get region coordinates
            x = face['region']['x']
            y = face['region']['y']
            w_face = face['region']['w']
            h_face = face['region']['h']

            # Scale coordinates back to original frame size
            # Because we analyzed a smaller image, we must multiply by 1/scale
            x = int(x / analysis_scale)
            y = int(y / analysis_scale)
            w_face = int(w_face / analysis_scale)
            h_face = int(h_face / analysis_scale)

            # Draw on the full-size frame
            gender = face['gender']
            cv2.rectangle(frame, (x, y), (x + w_face, y + h_face), (0, 255, 0), 2)
            cv2.putText(frame, gender, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        
            # Print Signature Length (Just to prove we have it)
            # In real app, you would compare this vector to a database
            cv2.putText(frame, f"Sig Len: {len(cached_results['embedding'])}", (x, y + h_face + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 1)



        # 3. Show the frame (This now runs smoothly without blocking)
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