import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Admin from '../components/Admin.vue'
import HomeEditor from '../components/HomeEditor.vue'
import WelcomePage from '../components/WelcomePage.vue'
import FileManagement from '../components/FileManagement.vue'
import thumbMng from '@renderer/components/thumbMng/thumbMng.vue'
import TinyFileDb from '@renderer/components/tinyFileDb/tinyFileDb.vue'
import AppSetting from '@renderer/components/appSetting.vue'
import MediaInfoPage from '@renderer/components/MediaInfoPage.vue'

const routes: RouteRecordRaw[] = [
    { path: '/', component: HomeEditor },
    { path: '/welcome', component: WelcomePage },
    { path: '/file_management', component: FileManagement },
    {
        path: '/admin',
        component: Admin,
        children: [
            {
                path: 'prj_set',
                component: () => import('../components/admin_setting/AdminSetting.vue')
            },
            {
                path: 'tag_mng',
                component: () => import('../components/admin_setting/AdminTagMng.vue')
            }
        ]
    },
    {
        path: '/file_list',
        component: () => import('../components/admin_setting/AdminFileList.vue')
    },
    {
        path: '/thumb_mng',
        component: thumbMng
    },
    {
        path: '/tiny_file_db',
        component: TinyFileDb
    },
    {
        path: '/app_setting',
        component: AppSetting
    },
    {
        path: '/media_info',
        component: MediaInfoPage
    }
]

// 创建路由实例
const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
