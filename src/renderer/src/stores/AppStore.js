import { defineStore } from 'pinia'

// 定义状态类型
interface AppState {
  prj: null | any; // 这里 any 可根据实际情况替换为具体类型
  serverUrlPrefix: string;
  curOpenedFolder: string;
  videoPlayCtrl: {
    curSrc: null | string;
    curTime: number;
    videoStartTime: number;
    isPlay: boolean;
    playbackRate: number;
  };
  curViewModel: 'video' | 'thumbnail';
  func_nextFrame: null | (() => void);
  func_prevFrame: null | (() => void);
  rightPanel: 'list' | 'workPanel';
  videoList: any[]; // 这里 any 可根据实际情况替换为具体类型
  curSltVideo: null | any; // 这里 any 可根据实际情况替换为具体类型
  curVideoInfo: null | any; // 这里 any 可根据实际情况替换为具体类型
  barColorCfg: {
    startTime: number;
    endTime: number;
    color: string;
  }[];
  videoSplitInfo: any[]; // 这里 any 可根据实际情况替换为具体类型
  bShowKeyFrameInfo: boolean;
  barSeekTime: number;
  documentTitle: string;
  thumbnailImages: any[]; // 这里 any 可根据实际情况替换为具体类型
  thumbSeekTime: number;
  queryInfo: null | any; // 这里 any 可根据实际情况替换为具体类型
  queryCtrl: {
    displayOption: 'single' | 'daily';
  };
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    prj: null,
    // utils
    // serverUrlPrefix: "http://localhost:38080",
    serverUrlPrefix: '',
    curOpenedFolder: '',
    // video play
    videoPlayCtrl: {
      curSrc: null, // 当前播放视频地址
      curTime: 0, // 当前播放时间
      videoStartTime: 0, // 播放开始的时间
      isPlay: false, // 播放状态
      playbackRate: 1 // 播放速率
    },
    curViewModel: 'video', //当前视图模式 video, thumbnail
    func_nextFrame: null,
    func_prevFrame: null,
    // ------
    rightPanel: 'list', //list, workPanel
    videoList: [],
    curSltVideo: null, // 当前选中的视频
    curVideoInfo: null, // 当前选中的视频信息
    // progress bar
    barColorCfg: [
      { startTime: 0, endTime: 10, color: 'green' },
      { startTime: 10, endTime: 20, color: '#555' },
      { startTime: 20, endTime: 30, color: 'orange' },
      { startTime: 30, endTime: Infinity, color: 'red' }
    ],
    // ------ 视频切分信息
    videoSplitInfo: [],
    bShowKeyFrameInfo: false, // 是否显示关键帧信息
    barSeekTime: 0, // 进度条拖动时间
    // document
    documentTitle: '',
    // thumbnail
    thumbnailImages: [], // 缩略图列表
    thumbSeekTime: 0, // 缩略图拖动时间
    // admin
    queryInfo: null,
    queryCtrl: {
      displayOption: 'daily' //single, daily
    }
  }),
  actions: {
    setData(key: string, value: any): void {
      // console.log("set=====", key, value);
      this[key] = value;
    }
  }
})
