# Demo Video Setup Instructions

## How to Update Your YouTube Video

1. **Upload your demo video to YouTube**

2. **Get your YouTube video ID:**
   - Go to your video on YouTube
   - Look at the URL: `https://www.youtube.com/watch?v=YOUR_VIDEO_ID`
   - Copy the `YOUR_VIDEO_ID` part (everything after `v=`)
   
   Example:
   - URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - Video ID: `dQw4w9WgXcQ`

3. **Update the video ID in the demo page:**
   - Open: `frontend/src/app/demo/page.tsx`
   - Find line 13: `const YOUTUBE_VIDEO_ID = 'dQw4w9WgXcQ'`
   - Replace `dQw4w9WgXcQ` with your actual video ID

4. **Test the demo page:**
   - Visit `http://localhost:3000/demo`
   - Your video should now be embedded and playable

## Current Setup

- **Demo Page**: `/demo`
- **Current Video ID**: `dQw4w9WgXcQ` (placeholder)
- **File Location**: `frontend/src/app/demo/page.tsx`

## Features Included

✅ Responsive YouTube embed
✅ Bilingual support (English/Thai)
✅ Chapter breakdown with timestamps
✅ "What you'll learn" section
✅ CTA to beta program
✅ Professional design matching landing page
