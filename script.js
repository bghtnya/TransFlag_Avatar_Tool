document.addEventListener('DOMContentLoaded', () => {
    const avatarUpload = document.getElementById('avatarUpload');
    const imageCanvas = document.getElementById('imageCanvas');
    const originalCanvas = document.getElementById('originalCanvas');
    const downloadBtn = document.getElementById('downloadBtn');
    const dropArea = document.getElementById('dropArea');
    const fileName = document.getElementById('fileName');
    const ctx = imageCanvas.getContext('2d');
    const originalCtx = originalCanvas.getContext('2d');

    const FLAG_IMAGE_PATH = '/res/鱼板跨旗模板.png';
    const FLAG_SIZE_RATIO = 0.9;
    const CANVAS_SIZE = 300;
    imageCanvas.width = originalCanvas.width = CANVAS_SIZE;
    imageCanvas.height = originalCanvas.height = CANVAS_SIZE;

    const processCanvas = document.createElement('canvas');
    const processCtx = processCanvas.getContext('2d');

    let originalImage = null;
    let originalFileName = '';
    let flagOffset = { x: 0, y: 0 };
    let flagScale = 1.0;
    let flagRotation = 0;
    let flagStretch = { x: 1.0, y: 1.0 }; // 新：非等比拉伸比例

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

    // 控件 UI：动态创建并插入到 .flag-preview 容器中
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

    // 坐标换算
    function getPreviewTransform() {
        if (!originalImage) return { scale: 1, offsetX: 0, offsetY: 0 };
        const scale = Math.min(CANVAS_SIZE / originalImage.width, CANVAS_SIZE / originalImage.height);
        const offsetX = (CANVAS_SIZE - originalImage.width * scale) / 2;
        const offsetY = (CANVAS_SIZE - originalImage.height * scale) / 2;
        return { scale, offsetX, offsetY };
    }
    function previewToProcess(x, y) {
        const t = getPreviewTransform();
        return { x: (x - t.offsetX) / t.scale, y: (y - t.offsetY) / t.scale };
    }
    function processToPreview(x, y) {
        const t = getPreviewTransform();
        return { x: x * t.scale + t.offsetX, y: y * t.scale + t.offsetY };
    }

    // 载入头像
    function processImageFile(file) {
        if (!file) return;
        fileName.textContent = file.name;
        originalFileName = file.name.replace(/\.[^/.]+$/, "");
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                processCanvas.width = img.width;
                processCanvas.height = img.height;
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

    function drawFlag() {
        if (!originalImage) return;
        processCtx.clearRect(0, 0, processCanvas.width, processCanvas.height);
        processCtx.drawImage(originalImage, 0, 0);

        const base = Math.min(originalImage.width, originalImage.height);
        const flagBaseSize = base * FLAG_SIZE_RATIO;
        const flagWidth = flagBaseSize * flagScale * flagStretch.x;
        const flagHeight = (flagImg.height / flagImg.width) * flagBaseSize * flagScale * flagStretch.y;

        // 默认位置在右下角
        const defaultX = originalImage.width - flagWidth;
        const defaultY = originalImage.height - flagHeight;
        const x = defaultX + flagOffset.x;
        const y = defaultY + flagOffset.y;
        flagRect = { x, y, width: flagWidth, height: flagHeight };

        processCtx.save();
        // 移动到旗帜中心，旋转，再绘制
        processCtx.translate(x + flagWidth / 2, y + flagHeight / 2);
        processCtx.rotate(flagRotation * Math.PI / 180);
        processCtx.drawImage(flagImg, -flagWidth / 2, -flagHeight / 2, flagWidth, flagHeight);
        processCtx.restore();

        updatePreview();
        updateControlPoints();
    }

    function updatePreview() {
        const t = getPreviewTransform();
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.drawImage(processCanvas, 0, 0, processCanvas.width, processCanvas.height,
            t.offsetX, t.offsetY, processCanvas.width * t.scale, processCanvas.height * t.scale);
    }

    // 计算控制点位置（PS风格的关键）
    function updateControlPoints() {
        const cX = flagRect.x + flagRect.width / 2;
        const cY = flagRect.y + flagRect.height / 2;
        const angle = flagRotation * Math.PI / 180;
        const rotatePoint = (x, y) => {
            const dx = x - cX, dy = y - cY;
            return { x: cX + dx * Math.cos(angle) - dy * Math.sin(angle),
                     y: cY + dx * Math.sin(angle) + dy * Math.cos(angle) };
        };
        const tl = rotatePoint(flagRect.x, flagRect.y);
        const tr = rotatePoint(flagRect.x + flagRect.width, flagRect.y);
        const bl = rotatePoint(flagRect.x, flagRect.y + flagRect.height);
        const br = rotatePoint(flagRect.x + flagRect.width, flagRect.y + flagRect.height);
        const tMid = rotatePoint(flagRect.x + flagRect.width / 2, flagRect.y);
        const handleLen = ROTATION_HANDLE_LENGTH / getPreviewTransform().scale;
        // 旋转手柄位置
        const rot = { x: tMid.x + handleLen * Math.sin(-angle), y: tMid.y - handleLen * Math.cos(-angle) };
        controlPoints = {
            topLeft: processToPreview(tl.x, tl.y),
            topRight: processToPreview(tr.x, tr.y),
            bottomLeft: processToPreview(bl.x, bl.y),
            bottomRight: processToPreview(br.x, br.y),
            rotation: processToPreview(rot.x, rot.y)
        };
        drawControlPoints();
    }

    // 绘制控制点和变换框
    function drawControlPoints() {
        updatePreview();
        ctx.strokeStyle = '#00AAFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(controlPoints.topLeft.x, controlPoints.topLeft.y);
        ctx.lineTo(controlPoints.topRight.x, controlPoints.topRight.y);
        ctx.lineTo(controlPoints.bottomRight.x, controlPoints.bottomRight.y);
        ctx.lineTo(controlPoints.bottomLeft.x, controlPoints.bottomLeft.y);
        ctx.closePath();
        ctx.stroke();

        const tmx = (controlPoints.topLeft.x + controlPoints.topRight.x) / 2;
        const tmy = (controlPoints.topLeft.y + controlPoints.topRight.y) / 2;
        ctx.beginPath();
        ctx.moveTo(tmx, tmy);
        ctx.lineTo(controlPoints.rotation.x, controlPoints.rotation.y);
        ctx.stroke();

        const drawPt = (x, y, active, txt) => {
            ctx.fillStyle = active ? '#FF4400' : '#00AAFF';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, CONTROL_POINT_RADIUS, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(txt, x + 12, y + 4);
            ctx.fillText(txt, x + 12, y + 4);
        };
        for (const p of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'])
            drawPt(controlPoints[p].x, controlPoints[p].y, activeControlPoint === p, '变形');
        drawPt(controlPoints.rotation.x, controlPoints.rotation.y, activeControlPoint === 'rotation', '旋转');
    }

    // 控件联动（连接滑块/输入框和旗帜变量）
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

    // 鼠标交互：实现 PS 风格的拖动/变形
    imageCanvas.addEventListener('mousedown', e => {
        if (!originalImage) return;
        const rect = imageCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        activeControlPoint = null;
        // 检查是否点击了控制点
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
        // 检查是否点击了旗帜区域（用于移动）
        const p = previewToProcess(x, y);
        const cx = flagRect.x + flagRect.width / 2, cy = flagRect.y + flagRect.height / 2;
        const ang = -flagRotation * Math.PI / 180;
        const dx = p.x - cx, dy = p.y - cy;
        // 反向旋转坐标点以检查是否在旋转前的矩形内
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
                // 旋转逻辑
                const startA = Math.atan2(s.y - cy, s.x - cx);
                const nowA = Math.atan2(c.y - cy, c.x - cx);
                // 更新旋转角度，并同步滑块
                syncRotation(startRotation + (nowA - startA) * 180 / Math.PI);
            } else {
                // 缩放/非等比变形逻辑
                if (e.shiftKey) {
                    // 按住 Shift 键进行等比缩放
                    syncScale(startScale * Math.max(ratioX, ratioY));
                } else {
                    // 非等比拉伸
                    flagStretch.x = Math.min(2, Math.max(0.5, startStretch.x * ratioX));
                    flagStretch.y = Math.min(2, Math.max(0.5, startStretch.y * ratioY));
                    drawFlag();
                }
            }
        } else if (isDragging) {
            // 拖动逻辑
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

    downloadBtn.addEventListener('click', () => {
        if (!originalImage) return;
        const dataURL = processCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = (originalFileName || 'avatar') + '_with_flag.png';
        a.click();
    });
});