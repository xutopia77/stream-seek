import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Admin from '../components/Admin.vue'
import CreatePrj from '../components/CreatePrj.vue'
import VideoPreview from '../components/VideoPreview.vue'
import thumbMng from '@renderer/components/thumbMng/thumbMng.vue'

// 定义路由配置数组，使用 RouteRecordRaw 类型进行类型注解
const routes: RouteRecordRaw[] = [
    { path: '/', component: VideoPreview },
    // {
    //   path: '/board',
    //   component: FileBoard
    // },
    // {
    //   path: '/settings',
    //   component: Settings,
    //   beforeEnter: fetchFileDirData
    // },
    {
        path: '/admin',
        component: Admin,
        // // 如果 adminRouter 是作为子路由使用的，需要确保父路由配置正确，并且子路由能够正确继承父路由的路径。
        // children: adminRouter.options.routes // 嵌套子路由

        children: [
            {
                path: 'prj_set',
                component: () => import('../components/admin_setting/AdminSetting.vue')
            },
            {
                path: 'tag_mng',
                component: () => import('../components/admin_setting/AdminTagMng.vue')
            }
            // { path: 'DbInfo', component: () => import('@/components/AdminEntry/DbInfo.vue') },
            // { path: 'OtherMisc', component: () => import('@/components/AdminEntry/OtherMisc.vue') },
        ]
    },
    {
        path: '/create_prj',
        component: CreatePrj
        // // 如果 adminRouter 是作为子路由使用的，需要确保父路由配置正确，并且子路由能够正确继承父路由的路径。
        // children: adminRouter.options.routes // 嵌套子路由
    },
    {
        path: '/thumb_mng',
        component: thumbMng
        // // 如果 adminRouter 是作为子路由使用的，需要确保父路由配置正确，并且子路由能够正确继承父路由的路径。
        // children: adminRouter.options.routes // 嵌套子路由
    }
]

// 创建路由实例
const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
