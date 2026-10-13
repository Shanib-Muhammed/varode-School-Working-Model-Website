# Varode Road Damage Reporting Website

A web dashboard for the Varode school working model. It is intended to display road-damage reports sent by the Raspberry Pi robot, including the report photo, coordinates, and timestamp when those fields are supplied by the backend.

## Project overview

- **Frontend repository:** https://github.com/Shanib-Muhammed/varoode-school-working-model-website
- **Robot / Raspberry Pi code repository:** https://github.com/Shanib-Muhammed/varoode-school-working-model
- **Live website:** https://varoode-school-working-model-website.vercel.app/
- **Backend platform:** Supabase
- **Edge Function used by the robot code:** `robot-upload`

## How it works

1. The Raspberry Pi runs the red-colour detection script.
2. When the script detects a qualifying red region, it captures a photo and prepares a report.
3. The script sends the photo/report to the Supabase `robot-upload` Edge Function using the configured robot upload key.
4. The website dashboard can display reports returned by the backend.

**Important:** The current detector identifies red-coloured markings used as crack stand-ins for the school model. It is not a trained road-crack AI model. The Raspberry Pi script currently uses fixed latitude and longitude values; live GPS reading has not yet been implemented.

## Raspberry Pi installation and run

Run these commands in the Raspberry Pi terminal or in an SSH session connected to the Pi—not in Windows PowerShell.

### 1. Install required packages

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-opencv python3-numpy python3-requests v4l-utils
```

These install Python, OpenCV and NumPy for image processing, Requests for HTTP uploads, and tools for checking the webcam.

### 2. Create a folder for saved photos

```bash
mkdir -p ~/roadbot/photos
```

### 3. Download the robot script

```bash
curl -L "https://raw.githubusercontent.com/Shanib-Muhammed/varoode-school-working-model/main/raspberry_pi/red_detect.py" -o ~/roadbot/red_detect.py
```

This downloads the latest script from the robot repository.

### 4. Check the webcam

```bash
ls -l /dev/video*
v4l2-ctl --list-devices
```

The script expects the webcam at `/dev/video0` by default. If no video device is listed, check the USB connection and try another USB port.

### 5. Configure the robot upload key

The script reads its private upload key from `~/.roadbot.env`. Open the file:

```bash
nano ~/.roadbot.env
```

Add the following line, replacing the placeholder with the actual robot upload key configured in the Supabase backend:

```text
ROBOT_UPLOAD_KEY=replace_with_your_real_robot_upload_key
```

Save using **Ctrl+O**, press **Enter**, then exit with **Ctrl+X**. Restrict file permissions:

```bash
chmod 600 ~/.roadbot.env
```

Never publish the real key in this README, source code, screenshots, or a public repository. If the key or backend configuration is missing or incorrect, uploads will fail.

### 6. Start the program

```bash
python3 ~/roadbot/red_detect.py
```

Read the terminal output for camera, detection, or upload errors. Press **Ctrl+C** in the same terminal to stop the program.

### 7. Check saved photos

```bash
ls -lh ~/roadbot/photos/
```

This lists files saved in the local photo folder.

## GPS status

Live GPS is **not yet implemented** in the current Raspberry Pi detection script. The script uses fixed coordinates in its code (`LATITUDE = 10.7735`, `LONGITUDE = 76.3775`). Connecting a NEO-6M module alone will not make the dashboard show live coordinates; serial reading and GPS parsing must also be added to the program.

## Troubleshooting

- **`curl: command not found`:** Install curl with `sudo apt install -y curl`.
- **No `/dev/video0`:** Check the webcam connection and run `v4l2-ctl --list-devices`.
- **Python module errors:** Re-run the package installation command above and read the exact missing-module name.
- **Reports do not appear online:** Check the upload key in `~/.roadbot.env`, internet connectivity, the Supabase `robot-upload` function deployment, and backend configuration.
- **No new photos:** Check whether the red marking meets the detector's colour and minimum-area thresholds.

## Security notes

- Keep `ROBOT_UPLOAD_KEY` private.
- Do not commit `~/.roadbot.env` or real secrets to GitHub.
- Do not assume online upload works until tested with the deployed backend.

## Related project

For the Raspberry Pi code, ESP8266 car-control code, wiring notes, and hardware documentation, see the [main Varode school working model repository](https://github.com/Shanib-Muhammed/varoode-school-working-model).
