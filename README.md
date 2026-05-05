[English](readme-en.md) | [中文](readme-zh.md)

# StreamSeek User Manual

# 1 Introduction

StreamSeek is a professional video stream analysis and recording management system, specifically designed for security surveillance video file management. It provides core functions such as video playback control, segment editing, file management, tag classification, and thumbnail generation.

![Video Playback Interface](https://imgbed.xutopia.top/image-assets/f14b1acd8f75a20df713a0fc41ea0603.jpg)

# 2 Design Goals

This system aims to solve core requirements in video processing:
- **Quick Video Clip Editing**: Precise positioning, splitting, deletion, and export
- **Key Content Extraction**: Automatic keyframe extraction for quick video preview
- **Batch Video Processing**: Support for multi-file management and batch operations
- **Storage Space Optimization**: Intelligent compression strategy while retaining core information

# 3 Core Functions

## 3.1 Video Playback Control

- **Standard Playback**
  Play/pause, progress jumping, volume control
- **Variable Speed Playback**:
  Support 0.5x ~ 6x speed playback for quick browsing
- **Frame-by-Frame Playback**:
  Precise single-frame forward/backward for accurate positioning
- **Progress Control**:
  Drag progress bar for quick positioning, display current time/total duration
- **Drag & Drop Open**:
  Directly drag video files to the interface to play

## 3.2 Video Segment Editing

- **Segment Splitting**:
  Precisely split video segments at playback position for easy editing
- **Segment Deletion**:
  Mark and delete unwanted video segments to avoid accidental deletion
- **Segment Recovery**:
  Recover accidentally deleted video segments to ensure data safety
- **Export Editing**:
  Export retained video segments as new video files for easy sharing or editing
- **Screenshot Export**:
  Export current playback frame as JPG/PNG image for recording keyframes

## 3.3 File Management

- **Project Management**
  Create projects to manage video files in batches
- **Automatic Scanning**
  Scan folders to import video files in batches
- **Rating Tags**
  Add rating tags to videos (1-5 stars) for easy classification and retrieval
- **Recycle Bin**
  Soft deletion mechanism to prevent accidental deletion
  Normal mode deletion: Files moved to recycle bin, preview resources retained
  Recycle bin mode deletion: Physical deletion, optionally clear preview resources
- **Search & Filter**
  Filter by time, rating, size and other conditions

## 3.4 Thumbnail Management

- **Automatic Generation**:
  Extract keyframes from videos as thumbnails for easy content browsing
- **Thumbnail View**:
  Click thumbnails to jump to corresponding playback position for quick positioning
- **Size Adjustment**:
  Support adjusting thumbnail card size (2-8 columns) for easy viewing
- **Quick Positioning**:
  Click thumbnails to jump to corresponding playback position for quick positioning

![Thumbnail View Interface](https://imgbed.xutopia.top/image-assets/79d207834f810d6096bab2b546c45064.jpg)

## 3.5 Video Analysis

### 3.5.1 Media Information View
View basic information of video files:
- File name, size, duration
- Video resolution, encoding format
- Frame rate, bitrate
- Creation time, modification time

![Media Information Page](https://imgbed.xutopia.top/image-assets/95414ab4abdf72d2341557c3af479640.jpg)

### 3.5.2 MP4 Box Analysis

Parse MP4 file structure to view file container information:
- File box (Box) structure tree display
- Detailed information of each box
- Metadata content

![MP4 Box Analysis Interface](https://imgbed.xutopia.top/image-assets/cc1650e2221183a432452728caf5de15.jpg)

### 3.5.3 Frame Analysis

Analyze video frame information:
- Total frames, frame rate
- Encoding format, resolution
- I-frame, P-frame, B-frame distribution
- Frame size, timestamp information

![Frame Analysis Interface](https://imgbed.xutopia.top/image-assets/e374587acf44fe39bd8fb5847b51fccb.jpg)

# 4 Applicable Scenarios

- **Video Editing**: Quickly trim videos, remove redundant content, retain highlights
- **Surveillance Recording Processing**: Filter valuable surveillance segments, delete useless recordings
- **Video Content Analysis**: Quickly understand video content through keyframes
- **Storage Space Optimization**: Delete redundant videos to free up storage space

# 5 Supported Formats

Support common video formats:
- `.mp4`, `.avi`, `.mkv`, `.mov`, `.wmv`, `.flv`, `.webm`

# 6 Installation and Usage

The system adopts green installation-free deployment mode, ready to run after decompression.

No additional configuration is required for the first startup. The system will automatically create a default project. Configuration files are stored in the project directory, supporting project reconstruction functionality.

# 7 Technical Support

## 7.1 Open Source Project
Project source code hosted on GitHub: `https://github.com/xutopia77/stream-seek.git`

## 7.2 Download Address
Latest version download: `https://github.com/xutopia77/stream-seek/releases/download/latest/stream-seek-latest-win.zip`

## 7.3 Community Support
If you encounter technical issues, please refer to project documentation or submit an Issue.

# 8 Version Information
Current version: 5.2.1
Release date: May 2026

---

*This document last updated: May 2026*
