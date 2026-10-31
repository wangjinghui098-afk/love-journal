# 王敬辉 · 我们的生活

一个无需登录、打开即用的双人生活记录网站。

## 使用方式

直接双击 `index.html`，或在当前文件夹运行一个本地静态服务器：

```powershell
python -m http.server 4173
```

然后访问 `http://127.0.0.1:4173`。

第一次打开后，点击左下角“记录设置”，填写你们的名字、在一起的第一天和首页想显示的一句话。示例内容也可以直接编辑或删除。

## 已包含的功能

- 首页倒计时、在一起天数与生活概览
- 婚纱照：电影感首页精选、完整线上画廊与全屏浏览
- 时光相册：上传照片、自动压缩、分类和灯箱查看
- 双人日记：心情、标题、正文、新增、编辑和删除
- 心愿清单：分类、截止日期、完成状态和共同进度
- 重要日子：每年纪念或一次性日期倒计时
- 今日心情与每日写作提示
- 完整数据备份导出与恢复
- 手机、平板和桌面端自适应

## 数据说明

记录保存在当前浏览器中：

- 日记、心愿、纪念日和设置保存在 `localStorage`
- 照片保存在 `IndexedDB`
- 浏览器隐私清理可能删除数据，请定期在“记录设置”中导出备份
- 备份文件包含全部照片，请妥善保存

当前版本不包含云端账号和跨设备同步。把整个文件夹上传到任意静态网站托管服务即可发布；若需要夫妻两台手机实时共享，下一步可接入 Supabase、Firebase 或自建后端。

## 婚纱照发布

婚纱照网页版本位于 `photos/wedding/`，缩略图位于
`photos/wedding/thumbs/`，画廊清单由 `wedding-photos.js` 提供。

重新处理一组原图：

```powershell
python scripts/prepare-wedding-photos.py `
  --source "D:\path\to\originals" `
  --output "photos\wedding" `
  --contact-dir "D:\path\to\contact-sheets"
python scripts/build-wedding-manifest.py
```
