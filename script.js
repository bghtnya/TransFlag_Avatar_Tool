import init, { AvatarProcessor, FlagConfig, canvas_data_to_png } from './pkg/transflag_avatar_tool.js';

document.addEventListener('DOMContentLoaded', async () => {
    await init();
    
    const avatarUpload = document.getElementById('avatarUpload');
    const imageCanvas = document.getElementById('imageCanvas');
    const originalCanvas = document.getElementById('originalCanvas');
    const downloadBtn = document.getElementById('downloadBtn');
    const dropArea = document.getElementById('dropArea');
    const fileName = document.getElementById('fileName');
    const ctx = imageCanvas.getContext('2d');
    const originalCtx = originalCanvas.getContext('2d');

    const FLAG_IMAGE_PATH = './res/鱼板跨旗模板.png';
    const FLAG_SIZE_RATIO = 0.9;
    const CANVAS_SIZE = 300;
    imageCanvas.width = originalCanvas.width = CANVAS_SIZE;
    imageCanvas.height = originalCanvas.height = CANVAS_SIZE;

    let originalImage = null;
    let originalFileName = '';
    let flagOffset = { x: 0, y: 0 };
    let flagScale = 1.0;
    let flagRotation = 0;
    let flagStretch = { x: 1.0, y: 1.0 };

    const processor = new AvatarProcessor(CANVAS_SIZE, CANVAS_SIZE);
    let flagConfig = new FlagConfig();

    let isDragging = false;
    let isTransforming = false;
    let activeControlPoint = null;
    let lastMouse = { x: 0, y: 0 };
    let dragStart = { x: 0, y: 0 };
    let startScale = 1.0;
    let startRotation = 0;
    let startStretch = { x: 1.0, y: 1.0 };

    const CONTROL_POINT_RADIUS = 8;
    const ROTATION_HANDLE_LENGTH = 30;
    let controlPoints = {};
    let flagRect = {};

    const controls = document.createElement('div');
    controls.className = 'flag-controls';
    controls.innerHTML = `
        <div class="control-group">
            <label>缩放：</label>
            <input type="range" id="flagScaleSlider" min="0.5" max="2" step="0.1" value="1">
            <input type="number" id="flagScaleInput" min="0.5" max="2" step="0.1" value="1.0" style="width:60px;margin-left:5px;">
        </div>
        <div class="control-group">
            <label>旋转：</label>
            <input type="range" id="flagRotationSlider" min="0" max="360" step="1" value="0">
            <input type="number" id="flagRotationInput" min="0" max="360" step="1" value="0" style="width:60px;margin-left:5px;">
        </div>
        <div class="control-group">
            <button id="resetFlagBtn">重置</button>
        </div>
    `;
    const previewArea = document.querySelector('.flag-preview');
    if (previewArea) previewArea.appendChild(controls);

    const flagScaleSlider = document.getElementById('flagScaleSlider');
    const flagRotationSlider = document.getElementById('flagRotationSlider');
    const flagScaleInput = document.getElementById('flagScaleInput');
    const flagRotationInput = document.getElementById('flagRotationInput');
    const resetFlagBtn = document.getElementById('resetFlagBtn');

    const flagImg = new Image();
    flagImg.crossOrigin = "Anonymous";
    flagImg.src = FLAG_IMAGE_PATH;

    function getPreviewTransform() {
        if (!originalImage) return { scale: 1, offsetX: 0, offsetY: 0 };
        const scale = Math.min(CANVAS_SIZE / originalImage.width, CANVAS_SIZE / originalImage.height);
        const offsetX = (CANVAS_SIZE - originalImage.width * scale) / 2;
        const offsetY = (CANVAS_SIZE - originalImage.height * scale) / 2;
        return { scale, offsetX, offsetY };
    }

    function processImageFile(file) {
        if (!file) return;
        fileName.textContent = file.name;
        originalFileName = file.name.replace(/\.[^/.]+$/, "");
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                drawOriginal();
                drawFlag();
                downloadBtn.disabled = false;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function drawOriginal() {
        if (!originalImage) return;
        const s = Math.min(CANVAS_SIZE / originalImage.width, CANVAS_SIZE / originalImage.height);
        const w = originalImage.width * s, h = originalImage.height * s;
        const x = (CANVAS_SIZE - w) / 2, y = (CANVAS_SIZE - h) / 2;
        originalCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        originalCtx.drawImage(originalImage, x, y, w, h);
    }

    async function drawFlag() {
        if (!originalImage) return;
        
        try {
            const canvas = document.createElement('canvas');
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(originalImage, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const flagCanvas = document.createElement('canvas');
            flagCanvas.width = flagImg.width;
            flagCanvas.height = flagImg.height;
            const flagCtx = flagCanvas.getContext('2d');
            flagCtx.drawImage(flagImg, 0, 0);
            const flagImageData = flagCtx.getImageData(0, 0, flagCanvas.width, flagCanvas.height);
            
            flagConfig.scale = flagScale;
            flagConfig.rotation = flagRotation;
            flagConfig.offset_x = flagOffset.x;
            flagConfig.offset_y = flagOffset.y;
            flagConfig.stretch_x = flagStretch.x;
            flagConfig.stretch_y = flagStretch.y;
            
            const previewData = processor.create_preview_data(
                new Uint8Array(imageData.data),
                new Uint8Array(flagImageData.data),
                CANVAS_SIZE,
                CANVAS_SIZE,
                flagConfig
            );
            
            const imageDataArray = new Uint8ClampedArray(previewData);
            const imgData = new ImageData(imageDataArray, CANVAS_SIZE, CANVAS_SIZE);
            ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            ctx.putImageData(imgData, 0, 0);
        } catch (error) {
            console.error('Error processing image:', error);
        }
    }

    function syncScale(val) {
        flagScale = Math.min(2, Math.max(0.5, parseFloat(val)));
        flagScaleSlider.value = flagScale;
        flagScaleInput.value = flagScale.toFixed(1);
        drawFlag();
    }
    
    function syncRotation(val) {
        flagRotation = (parseFloat(val) % 360 + 360) % 360;
        flagRotationSlider.value = flagRotation;
        flagRotationInput.value = flagRotation.toFixed(0);
        drawFlag();
    }
    
    flagScaleSlider.oninput = e => syncScale(e.target.value);
    flagScaleInput.onchange = e => syncScale(e.target.value);
    flagRotationSlider.oninput = e => syncRotation(e.target.value);
    flagRotationInput.onchange = e => syncRotation(e.target.value);
    resetFlagBtn.onclick = () => {
        flagOffset = { x: 0, y: 0 };
        flagScale = 1.0; flagRotation = 0; flagStretch = { x: 1, y: 1 };
        syncScale(1); syncRotation(0);
    };

    imageCanvas.addEventListener('mousedown', e => {
        if (!originalImage) return;
        const rect = imageCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        activeControlPoint = null;
        for (const k in controlPoints) {
            const dx = x - controlPoints[k].x, dy = y - controlPoints[k].y;
            if (Math.sqrt(dx * dx + dy * dy) < CONTROL_POINT_RADIUS * 2) {
                activeControlPoint = k;
                isTransforming = true;
                dragStart = { x, y };
                startScale = flagScale;
                startRotation = flagRotation;
                startStretch = { ...flagStretch };
                return;
            }
        }
        const p = previewToProcess(x, y);
        const cx = flagRect.x + flagRect.width / 2, cy = flagRect.y + flagRect.height / 2;
        const ang = -flagRotation * Math.PI / 180;
        const dx = p.x - cx, dy = p.y - cy;
        const rx = cx + dx * Math.cos(ang) - dy * Math.sin(ang);
        const ry = cy + dx * Math.sin(ang) + dy * Math.cos(ang);
        if (rx >= flagRect.x && rx <= flagRect.x + flagRect.width && ry >= flagRect.y && ry <= flagRect.y + flagRect.height) {
            isDragging = true;
            lastMouse = { x, y };
        }
    });

    imageCanvas.addEventListener('mousemove', e => {
        if (!originalImage) return;
        const rect = imageCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        if (isTransforming && activeControlPoint) {
            const c = previewToProcess(x, y);
            const s = previewToProcess(dragStart.x, dragStart.y);
            const cx = flagRect.x + flagRect.width / 2, cy = flagRect.y + flagRect.height / 2;
            const startDistX = s.x - cx, startDistY = s.y - cy;
            const nowDistX = c.x - cx, nowDistY = c.y - cy;
            const ratioX = nowDistX / startDistX || 1;
            const ratioY = nowDistY / startDistY || 1;
            if (activeControlPoint === 'rotation') {
                const startA = Math.atan2(s.y - cy, s.x - cx);
                const nowA = Math.atan2(c.y - cy, c.x - cx);
                syncRotation(startRotation + (nowA - startA) * 180 / Math.PI);
            } else {
                if (e.shiftKey) {
                    syncScale(startScale * Math.max(ratioX, ratioY));
                } else {
                    flagStretch.x = Math.min(2, Math.max(0.5, startStretch.x * ratioX));
                    flagStretch.y = Math.min(2, Math.max(0.5, startStretch.y * ratioY));
                    drawFlag();
                }
            }
        } else if (isDragging) {
            const deltaX = x - lastMouse.x;
            const deltaY = y - lastMouse.y;
            const t = getPreviewTransform();
            flagOffset.x += deltaX / t.scale;
            flagOffset.y += deltaY / t.scale;
            lastMouse = { x, y };
            drawFlag();
        }
    });
    
    window.addEventListener('mouseup', () => { isDragging = false; isTransforming = false; activeControlPoint = null; });
    imageCanvas.addEventListener('mouseleave', () => { isDragging = false; isTransforming = false; activeControlPoint = null; });

    avatarUpload.addEventListener('change', e => processImageFile(e.target.files[0]));
    if (dropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => dropArea.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }));
        ['dragenter', 'dragover'].forEach(ev => dropArea.addEventListener(ev, () => dropArea.classList.add('drag-over')));
        ['dragleave', 'drop'].forEach(ev => dropArea.addEventListener(ev, () => dropArea.classList.remove('drag-over')));
        dropArea.addEventListener('drop', e => processImageFile(e.dataTransfer.files[0]));
    }

    downloadBtn.addEventListener('click', async () => {
        if (!originalImage) return;
        
        try {
            const canvas = document.createElement('canvas');
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(originalImage, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const flagCanvas = document.createElement('canvas');
            flagCanvas.width = flagImg.width;
            flagCanvas.height = flagImg.height;
            const flagCtx = flagCanvas.getContext('2d');
            flagCtx.drawImage(flagImg, 0, 0);
            const flagImageData = flagCtx.getImageData(0, 0, flagCanvas.width, flagCanvas.height);
            
            flagConfig.scale = flagScale;
            flagConfig.rotation = flagRotation;
            flagConfig.offset_x = flagOffset.x;
            flagConfig.offset_y = flagOffset.y;
            flagConfig.stretch_x = flagStretch.x;
            flagConfig.stretch_y = flagStretch.y;
            
            const result = processor.process_avatar(
                new Uint8Array(imageData.data),
                new Uint8Array(flagImageData.data),
                flagConfig
            );
            
            const blob = new Blob([result], { type: 'image/png' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (originalFileName || 'avatar') + '_with_flag.png';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error processing image:', error);
        }
    });

    function fetchContributors() {
        const repo = 'bghtnya/TransFlag_Avatar_Tool';
        const url = `https://api.github.com/repos/${repo}/contributors`;
        const container = document.getElementById('contributorsContainer');

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`GitHub API error: ${response.statusText}`);
                }
                return response.json();
            })
            .then(contributors => {
                const humanContributors = contributors.filter(c => c.type === 'User');
                
                if (humanContributors.length === 0) {
                    container.innerHTML = '<p>暂无贡献者信息。</p>';
                    return;
                }

                const listItems = humanContributors.map(contributor => `
                    <li class="contributor-item">
                        <img src="${contributor.avatar_url}" alt="${contributor.login}'s avatar" class="contributor-avatar">
                        <a href="${contributor.html_url}" target="_blank" class="contributor-login">${contributor.login}</a>
                    </li>
                `).join('');

                container.innerHTML = `
                    <p>项目贡献者：</p>
                    <ul class="contributor-list">
                        ${listItems}
                    </ul>
                `;
            })
            .catch(error => {
                console.error("Failed to fetch contributors:", error);
                container.innerHTML = '<p>无法同步贡献者信息。请访问项目仓库查看。</p>';
            });
    }

    fetchContributors();
});