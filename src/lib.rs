use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement, ImageData};
use serde::{Deserialize, Serialize};

mod utils;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[wasm_bindgen]
pub struct AvatarProcessor {
    width: u32,
    height: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[wasm_bindgen]
pub struct FlagConfig {
    pub scale: f64,
    pub rotation: f64,
    pub offset_x: f64,
    pub offset_y: f64,
    pub stretch_x: f64,
    pub stretch_y: f64,
}

#[wasm_bindgen]
impl FlagConfig {
    #[wasm_bindgen(constructor)]
    pub fn new() -> FlagConfig {
        FlagConfig {
            scale: 1.0,
            rotation: 0.0,
            offset_x: 0.0,
            offset_y: 0.0,
            stretch_x: 1.0,
            stretch_y: 1.0,
        }
    }
}

#[wasm_bindgen]
impl AvatarProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32) -> AvatarProcessor {
        utils::set_panic_hook();
        AvatarProcessor { width, height }
    }

    #[wasm_bindgen]
    pub fn process_avatar(&self, avatar_data: &[u8], flag_data: &[u8], config: &FlagConfig) -> Result<Vec<u8>, JsValue> {
        let avatar_img = image::load_from_memory(avatar_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load avatar image: {:?}", e)))?;
        
        let flag_img = image::load_from_memory(flag_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load flag image: {:?}", e)))?;

        let mut avatar_rgba = avatar_img.to_rgba8();
        let flag_rgba = flag_img.to_rgba8();

        let base_size = (avatar_rgba.width().min(avatar_rgba.height()) as f64 * 0.9) as u32;
        let flag_width = (base_size as f64 * config.scale * config.stretch_x) as u32;
        let flag_height = ((flag_rgba.height() as f64 / flag_rgba.width() as f64) * base_size as f64 * config.scale * config.stretch_y) as u32;

        let resized_flag = image::imageops::resize(
            &flag_rgba,
            flag_width,
            flag_height,
            image::imageops::FilterType::Lanczos3,
        );

        let x = (avatar_rgba.width() as i32 - flag_width as i32) + config.offset_x as i32;
        let y = (avatar_rgba.height() as i32 - flag_height as i32) + config.offset_y as i32;

        self.overlay_image_with_rotation(&mut avatar_rgba, &resized_flag, x, y, config.rotation);

        let mut result_data: Vec<u8> = Vec::new();
        let mut result_img = image::DynamicImage::ImageRgba8(avatar_rgba);
        result_img.write_to(&mut result_data, image::ImageFormat::Png)
            .map_err(|e| JsValue::from_str(&format!("Failed to encode result image: {:?}", e)))?;

        Ok(result_data)
    }

    fn overlay_image_with_rotation(
        &self,
        background: &mut image::RgbaImage,
        foreground: &image::RgbaImage,
        x: i32,
        y: i32,
        rotation_degrees: f64,
    ) {
        if foreground.width() == 0 || foreground.height() == 0 {
            return;
        }

        let rotation_rad = rotation_degrees.to_radians();
        let cos_theta = rotation_rad.cos();
        let sin_theta = rotation_rad.sin();

        let fg_center_x = foreground.width() as f64 / 2.0;
        let fg_center_y = foreground.height() as f64 / 2.0;

        let corners = [
            (-fg_center_x, -fg_center_y),
            (foreground.width() as f64 - fg_center_x, -fg_center_y),
            (foreground.width() as f64 - fg_center_x, foreground.height() as f64 - fg_center_y),
            (-fg_center_x, foreground.height() as f64 - fg_center_y),
        ];

        let mut min_x = std::f64::MAX;
        let mut max_x = std::f64::MIN;
        let mut min_y = std::f64::MAX;
        let mut max_y = std::f64::MIN;

        for &(cx, cy) in &corners {
            let rx = cx * cos_theta - cy * sin_theta;
            let ry = cx * sin_theta + cy * cos_theta;
            min_x = min_x.min(rx);
            max_x = max_x.max(rx);
            min_y = min_y.min(ry);
            max_y = max_y.max(ry);
        }

        let rotated_width = (max_x - min_x).ceil() as u32;
        let rotated_height = (max_y - min_y).ceil() as u32;

        let inv_cos_theta = cos_theta;
        let inv_sin_theta = -sin_theta;

        for ry in 0..rotated_height {
            for rx in 0..rotated_width {
                let dx = rx as f64 + min_x;
                let dy = ry as f64 + min_y;

                let src_x = (dx * inv_cos_theta - dy * inv_sin_theta + fg_center_x).round() as i32;
                let src_y = (dx * inv_sin_theta + dy * inv_cos_theta + fg_center_y).round() as i32;

                if src_x >= 0 && src_x < foreground.width() as i32 && 
                   src_y >= 0 && src_y < foreground.height() as i32 {
                    
                    let dest_x = x + rx as i32;
                    let dest_y = y + ry as i32;

                    if dest_x >= 0 && dest_x < background.width() as i32 && 
                       dest_y >= 0 && dest_y < background.height() as i32 {
                        
                        let fg_pixel = foreground.get_pixel(src_x as u32, src_y as u32);
                        if fg_pixel[3] != 0 {
                            let alpha = fg_pixel[3] as f64 / 255.0;
                            let bg_pixel = background.get_pixel_mut(dest_x as u32, dest_y as u32);
                            
                            if alpha >= 0.99 {
                                *bg_pixel = *fg_pixel;
                            } else {
                                for i in 0..3 {
                                    bg_pixel[i] = (fg_pixel[i] as f64 * alpha + 
                                                  bg_pixel[i] as f64 * (1.0 - alpha)) as u8;
                                }
                                bg_pixel[3] = (fg_pixel[3] as f64 * alpha + 
                                              bg_pixel[3] as f64 * (1.0 - alpha)) as u8;
                            }
                        }
                    }
                }
            }
        }
    }

    #[wasm_bindgen]
    pub fn create_preview_data(&self, avatar_data: &[u8], flag_data: &[u8], 
                              canvas_width: u32, canvas_height: u32,
                              config: &FlagConfig) -> Result<Vec<u8>, JsValue> {
        let avatar_img = image::load_from_memory(avatar_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load avatar image: {:?}", e)))?;
        
        let flag_img = image::load_from_memory(flag_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load flag image: {:?}", e)))?;

        let mut avatar_rgba = avatar_img.to_rgba8();
        let flag_rgba = flag_img.to_rgba8();

        let base_size = (avatar_rgba.width().min(avatar_rgba.height()) as f64 * 0.9) as u32;
        let flag_width = (base_size as f64 * config.scale * config.stretch_x) as u32;
        let flag_height = ((flag_rgba.height() as f64 / flag_rgba.width() as f64) * base_size as f64 * config.scale * config.stretch_y) as u32;

        let resized_flag = image::imageops::resize(
            &flag_rgba,
            flag_width,
            flag_height,
            image::imageops::FilterType::Lanczos3,
        );

        let x = (avatar_rgba.width() as i32 - flag_width as i32) + config.offset_x as i32;
        let y = (avatar_rgba.height() as i32 - flag_height as i32) + config.offset_y as i32;

        self.overlay_image_with_rotation(&mut avatar_rgba, &resized_flag, x, y, config.rotation);

        let scale_x = canvas_width as f64 / avatar_rgba.width() as f64;
        let scale_y = canvas_height as f64 / avatar_rgba.height() as f64;
        let scale = scale_x.min(scale_y);

        let scaled_width = (avatar_rgba.width() as f64 * scale) as u32;
        let scaled_height = (avatar_rgba.height() as f64 * scale) as u32;

        let scaled_img = image::imageops::resize(
            &avatar_rgba,
            scaled_width,
            scaled_height,
            image::imageops::FilterType::Lanczos3,
        );

        let mut canvas_img = image::RgbaImage::from_pixel(canvas_width, canvas_height, image::Rgba([0, 0, 0, 0]));
        
        let offset_x = (canvas_width - scaled_width) / 2;
        let offset_y = (canvas_height - scaled_height) / 2;
        
        image::imageops::replace(&mut canvas_img, &scaled_img, offset_x, offset_y);

        Ok(canvas_img.into_raw())
    }
}

#[wasm_bindgen]
pub fn canvas_data_to_png(data: &[u8], width: u32, height: u32) -> Result<Vec<u8>, JsValue> {
    let img = image::RgbaImage::from_raw(width, height, data.to_vec())
        .ok_or_else(|| JsValue::from_str("Failed to create image from raw data"))?;

    let mut png_data = Vec::new();
    let dyn_img = image::DynamicImage::ImageRgba8(img);
    dyn_img.write_to(&mut png_data, image::ImageFormat::Png)
        .map_err(|e| JsValue::from_str(&format!("Failed to encode PNG: {:?}", e)))?;

    Ok(png_data)
}