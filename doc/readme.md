
# 设计概要

主要用来快速管理查看摄像头的录像视频，可以快速裁剪，删除无用的录像片段。



## 创建工程


# 打包

## 打包命令

```bash
npm run build:win
```



# 代码

函数模型如下
```ts

interface Req<T = string> {
  cmd: string
  data?: T
}

interface Resp<T = string> {
  code: number
  status: string
  bOver?: boolean
  data?: T
}

async function trigger_event<T = string, R = string>(req: DataTypes.Req<T>): Promise<DataTypes.Resp<R>>
```

发送时，入参是一个对象Req，返回值是一个Promise对象，Promise对象的resolve值是一个对象Resp

至于Req和Resp中的Data，是一个泛型，具体的类型由调用方决定。
