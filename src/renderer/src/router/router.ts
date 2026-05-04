import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import HomeEditor from '../components/HomeEditor.vue'
import WelcomePage from '../components/WelcomePage.vue'
import FileManagement from '../components/FileManagement.vue'
import thumbMng from '@renderer/components/thumbMng/thumbMng.vue'
import TinyFileDb from '@renderer/components/tinyFileDb/tinyFileDb.vue'
import AppSetting from '@renderer/components/appSetting.vue'
import MediaInfoPage from '@renderer/components/MediaInfoPage.vue'
import ProjectSettings from '@renderer/components/ProjectSettings.vue'

const routes: RouteRecordRaw[] = [
    { path: '/', component: HomeEditor },
    { path: '/welcome', component: WelcomePage },
    { path: '/file_management', component: FileManagement },
    {
        path: '/project_settings',
        component: ProjectSettings,
        meta: { requiresProject: true }
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

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
