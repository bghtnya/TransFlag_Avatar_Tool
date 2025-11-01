document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const avatarUpload = document.getElementById('avatarUpload');
    const imageCanvas = document.getElementById('imageCanvas');
    const originalCanvas = document.getElementById('originalCanvas');
    const tipText = document.getElementById('tipText');
    const downloadBtn = document.getElementById('downloadBtn');
    const dropArea = document.getElementById('dropArea');
    const fileName = document.getElementById('fileName');
    const originalCtx = originalCanvas.getContext('2d');
    const ctx = imageCanvas.getContext('2d');
    
    // 设置鱼板跨旗图片路径和大小比例
    const FLAG_IMAGE_PATH = '鱼板跨旗模板.png';
    const FLAG_SIZE_RATIO = 0.9; // 旗子占头像的比例
    
    // 初始化显示用的画布大小为300x300的正方形
    const CANVAS_SIZE = 300;
    originalCanvas.width = CANVAS_SIZE;
    originalCanvas.height = CANVAS_SIZE;
    imageCanvas.width = CANVAS_SIZE;
    imageCanvas.height = CANVAS_SIZE;
    
    // 创建一个隐藏的高分辨率画布用于处理图片
    const processCanvas = document.createElement('canvas');
    const processCtx = processCanvas.getContext('2d');
    
    // 存储原始图像信息和文件名
    let originalImage = null;
    let originalFileName = '';
    
    // 下载按钮始终可见，但初始状态为禁用
    downloadBtn.style.display = 'block';
    downloadBtn.disabled = true;
    
    // 预加载旗子图片
    const flagImg = new Image();
    flagImg.crossOrigin = "Anonymous"; // 避免跨域问题
    flagImg.src = FLAG_IMAGE_PATH;
    
    // 处理图像文件的函数
    function processImageFile(file) {
        if (!file) {
            return;
        }
        
        if (fileName) {
            fileName.textContent = file.name;
        }
        
        // 保存原始文件名（不含扩展名）
        originalFileName = file.name.replace(/\.[^/.]+$/, "");

        const reader = new FileReader();
        reader.onload = (event) => {
            const avatarImg = new Image();
            avatarImg.onload = () => {
                // 保存原始图像引用
                originalImage = avatarImg;
                
                // 清除画布
                originalCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                
                // 计算缩放比例，保持图像比例
                const scale = Math.min(CANVAS_SIZE / avatarImg.width, CANVAS_SIZE / avatarImg.height);
                const scaledWidth = avatarImg.width * scale;
                const scaledHeight = avatarImg.height * scale;
                
                // 计算居中位置
                const x = (CANVAS_SIZE - scaledWidth) / 2;
                const y = (CANVAS_SIZE - scaledHeight) / 2;
                
                // 绘制原始头像（居中显示）
                originalCtx.drawImage(avatarImg, x, y, scaledWidth, scaledHeight);
                
                // 在高分辨率画布上处理图片
                processCanvas.width = avatarImg.width;
                processCanvas.height = avatarImg.height;
                
                // 绘制原始图像到处理画布
                processCtx.drawImage(avatarImg, 0, 0, avatarImg.width, avatarImg.height);
                
                // 在处理画布上绘制旗子
                if (flagImg.complete) {
                    drawFlagOnProcessCanvas();
                } else {
                    flagImg.onload = drawFlagOnProcessCanvas;
                }
                
                // 将处理后的图像绘制到预览画布
                ctx.drawImage(processCanvas, 0, 0, avatarImg.width, avatarImg.height, x, y, scaledWidth, scaledHeight);

                // 启用下载按钮
                downloadBtn.disabled = false;
            };
            avatarImg.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    // 在处理画布上绘制旗子的函数
    function drawFlagOnProcessCanvas() {
        if (!originalImage) return;
        
        // 计算旗子的大小 - 基于原始图像的最小边
        const baseSize = Math.min(originalImage.width, originalImage.height);
        const flagSize = baseSize * FLAG_SIZE_RATIO;
        
        // 保持旗子的原有比例
        const flagWidth = flagSize;
        const flagHeight = (flagSize / flagImg.width) * flagImg.height;
        
        // 旗子放在右下角
        const destX = originalImage.width - flagWidth;
        const destY = originalImage.height - flagHeight;
        
        // 在处理画布上绘制旗子
        processCtx.drawImage(flagImg, destX, destY, flagWidth, flagHeight);
    }

    // 当用户上传文件时触发
    avatarUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        processImageFile(file);
    });
    
    // 拖放功能
    if (dropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            dropArea.classList.add('drag-over');
        }
        
        function unhighlight() {
            dropArea.classList.remove('drag-over');
        }
        
        dropArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const file = dt.files[0];
            processImageFile(file);
        }
    }

    // 下载按钮事件
    downloadBtn.addEventListener('click', () => {
        if (downloadBtn.disabled) return;
        
        if (!originalImage) {
            // 如果没有原始图像，则使用当前画布
            const dataURL = imageCanvas.toDataURL('image/png');
            // 使用原始文件名或默认文件名
            const downloadName = originalFileName ? `${originalFileName}_with_flag.png` : 'avatar_with_flag.png';
            downloadImage(dataURL, downloadName);
            return;
        }

        // 从处理画布导出高分辨率图片
        const dataURL = processCanvas.toDataURL('image/png');
        // 使用原始文件名
        const downloadName = originalFileName ? `${originalFileName}_with_flag.png` : 'avatar_with_flag.png';
        downloadImage(dataURL, downloadName);
    });

    // 下载图片的通用函数
    function downloadImage(dataURL, fileName) {
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
});
