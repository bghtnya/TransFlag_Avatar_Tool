# 头像鱼板跨旗添加工具(Rust版本)

**本项目基于Rust和WebAssembly技术重构**  
**本项目基于**：https://github.com/bghtnya/TransFlag_Avatar_Tool  

## 构建说明

要构建此项目，您需要安装Rust和wasm-pack：

```bash
cargo install wasm-pack
```

然后构建项目：

```bash
wasm-pack build --target web
```

## 项目结构

- `src/lib.rs` - 核心Rust/WASM代码
- `src/utils.rs` - 工具函数
- `Cargo.toml` - Rust项目配置
- `index.html` - 前端界面（保持不变）
- `script.js` - 前端JavaScript代码（需要少量修改以使用WASM）
- `style.css` - 样式表（保持不变）
- `res/` - 资源文件夹

## 技术栈

- Rust
- WebAssembly (wasm-bindgen)
- image crate (图像处理)
- web-sys (Web API绑定)
