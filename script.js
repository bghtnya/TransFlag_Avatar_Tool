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
    originalCanvas.width = 300;
    originalCanvas.height = 300;
    imageCanvas.width = 300;
    imageCanvas.height = 300;
    
    // 创建一个隐藏的高分辨率画布用于下载
    const hiddenCanvas = document.createElement('canvas');
    const hiddenCtx = hiddenCanvas.getContext('2d');
    
    // 存储原始图像信息
    let originalImage = null;
    
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

        const reader = new FileReader();
        reader.onload = (event) => {
            const avatarImg = new Image();
            avatarImg.onload = () => {
                // 保存原始图像引用
                originalImage = avatarImg;
                
                // 显示用的画布大小为300x300
                const canvasSize = 300;
                
                // 计算缩放比例，保持图像比例
                const scale = Math.min(canvasSize / avatarImg.width, canvasSize / avatarImg.height);
                const scaledWidth = avatarImg.width * scale;
                const scaledHeight = avatarImg.height * scale;
                
                // 计算居中位置
                const x = (canvasSize - scaledWidth) / 2;
                const y = (canvasSize - scaledHeight) / 2;
                
                // 清除画布
                originalCtx.clearRect(0, 0, canvasSize, canvasSize);
                ctx.clearRect(0, 0, canvasSize, canvasSize);
                
                // 绘制原始头像（居中显示）
                originalCtx.drawImage(avatarImg, x, y, scaledWidth, scaledHeight);
                
                // 绘制带效果的头像（居中显示）
                ctx.drawImage(avatarImg, x, y, scaledWidth, scaledHeight);

                // 绘制鱼板旗（跨旗）
                drawFlag();

                // 启用下载按钮
                downloadBtn.disabled = false;
            };
            avatarImg.src = event.target.result;
        };
        reader.readAsDataURL(file);
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

    // 绘制鱼板旗的函数
    function drawFlag() {
        if (!flagImg.complete) {
            // 如果旗子还没加载完，等待加载完成再绘制
            flagImg.onload = () => drawFlag();
            return;
        }

        // 使用固定的画布尺寸
        const canvasSize = 300;
        
        // 计算旗子的大小和位置
        const flagWidth = canvasSize * FLAG_SIZE_RATIO;
        // 保持旗子的原有比例
        const flagHeight = (flagWidth / flagImg.width) * flagImg.height; 
        
        // 旗子放在右下角，完全贴合边缘
        const destX = canvasSize - flagWidth;
        const destY = canvasSize - flagHeight;

        // 绘制旗子
        ctx.drawImage(flagImg, destX, destY, flagWidth, flagHeight);
        
        // 只启用下载按钮，不改变显示状态（因为按钮始终可见）
        downloadBtn.disabled = false;
    }

    // 下载按钮事件
    downloadBtn.addEventListener('click', () => {
        if (downloadBtn.disabled) return;
        
        // 使用原始图像的尺寸设置隐藏画布
        if (originalImage) {
            // 设置隐藏画布为原始图像尺寸
            hiddenCanvas.width = originalImage.width;
            hiddenCanvas.height = originalImage.height;
            
            // 在隐藏画布上绘制原始图像
            hiddenCtx.drawImage(originalImage, 0, 0, originalImage.width, originalImage.height);
            
            // 计算旗子的大小和位置（保持与显示时相同的比例）
            const flagWidth = originalImage.width * FLAG_SIZE_RATIO;
            const flagHeight = (flagWidth / flagImg.width) * flagImg.height;
            
            // 旗子放在右下角
            const destX = originalImage.width - flagWidth;
            const destY = originalImage.height - flagHeight;
            
            // 在隐藏画布上绘制旗子
            hiddenCtx.drawImage(flagImg, destX, destY, flagWidth, flagHeight);
            
            // 从隐藏画布导出高分辨率图片
            const dataURL = hiddenCanvas.toDataURL('image/png');
            
            // 创建一个虚拟的下载链接
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = 'avatar_with_flag.png';
            
            // 触发点击下载
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            // 如果没有原始图像，则使用当前画布
            const dataURL = imageCanvas.toDataURL('image/png');
            
            // 创建一个虚拟的下载链接
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = 'avatar_with_flag.png';
            
            // 触发点击下载
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });
});