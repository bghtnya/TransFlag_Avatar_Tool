# 头像鱼板跨旗添加工具 🍥🏳️‍⚧️

一个轻量级网页小工具，用于为头像快速叠加「Narutomaki Trans Flag」效果。  
支持拖放上传、即时预览、原始分辨率下载，并在桌面与移动端良好显示。

![预览图](</res/头像处理.png>)

---

## 🌐 在线体验

- 直接访问：<https://bghtnya.github.io/TransFlag_Avatar_Tool/>

---

## 🔄 更新内容

- 集成了 <https://transflag.luoxue.cc/> 的推特圆形头像跨旗生成功能  
- 原仓库：<https://github.com/luoxue3943/trans-avatar-flag-adder/tree/v0.1.0>

---

## ✨ 功能特点

- 保持原始分辨率下载（预览为 300×300，仅用于展示）
- 拖放图片或点击按钮上传
- 实时预览原图与叠加效果
- 旗帜贴合右下角，按比例缩放，无多余留白
- 界面简洁、支持响应式布局

---

## 🧭 使用方法

### 在线使用（推荐）
1. 打开网站：<https://bghtnya.github.io/TransFlag_Avatar_Tool/>
2. 点击「选择文件」或将图片拖入上传区域  
3. 右侧显示叠加效果预览  
4. 点击「下载处理后的头像」，即可获得与原图同分辨率的成品（如 2408×2408）

### 本地使用
1. 下载或克隆本仓库  
2. 双击打开 `index.html`  
3. 上传头像、预览、下载即可

---

## 📂 项目结构

- `index.html`：页面结构与按钮
- `style.css`：样式与布局
- `script.js`：上传、预览、叠加与下载逻辑
- `鱼板跨旗模板.png`：旗帜模板

---

## ⚙️ 使用提示

- 支持 JPEG、PNG、WebP 等常见格式  
- 预览画布为 300×300，仅用于展示；下载将使用原始尺寸绘制  
- 可在 `script.js` 中修改以下参数：
  - `FLAG_SIZE_RATIO` — 旗帜相对宽度比例（默认 `0.9`）  
  - `FLAG_IMAGE_PATH` — 模板路径  

---

## 👤 作者信息

- 作者：**@bghtnya**  
- 推特：<https://twitter.com/bghtnya>  
- GitHub：<https://github.com/bghtnya>  
- 仓库：<https://github.com/bghtnya/TransFlag_Avatar_Tool/>  
- 贡献者：<https://github.com/bghtnya/TransFlag_Avatar_Tool/graphs/contributors>  
- 网站：<https://bghtnya.github.io/TransFlag_Avatar_Tool/>

---

## ⭐ 仓库 Star 曲线

[![Stargazers over time](https://starchart.cc/bghtnya/TransFlag_Avatar_Tool.svg)](https://starchart.cc/bghtnya/TransFlag_Avatar_Tool)

---

## ☕ 赞赏支持

如果你喜欢这个项目，欢迎扫码支持开发维护 ❤️  

![alt text](./res/123.png)

---

💬 欢迎提出反馈与改进建议！